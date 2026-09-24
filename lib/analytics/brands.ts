import type { WorkspaceData, Performance } from '../../types/domain.ts';
import { getBrandMappings } from '../reporting/brand-mapping.ts';

export type BrandAnalyticsRow = {
  brandId: string;
  brandName: string;
  currentGmv: number;
  comparisonGmv: number;
  absoluteDelta: number;
  growthPct: number | null;
  orders: number;
  units: number;
  creatorsCount: number;
  contributionPct: number;
};

export function aggregateBrandAnalytics(
  currentRows: Performance[],
  comparisonRows: Performance[],
  data: WorkspaceData,
): BrandAnalyticsRow[] {
  const mappings = getBrandMappings(data);
  const prodToBrandMap = new Map<string, string>();
  for (const m of mappings) {
    if (m.product_id && m.brand_name) {
      prodToBrandMap.set(m.product_id, m.brand_name);
    }
  }

  const curByBrand = new Map<
    string,
    { gmv: number; orders: number; units: number; creators: Set<string> }
  >();
  for (const r of currentRows) {
    const brandName = (r.product_id && prodToBrandMap.get(r.product_id)) || 'UNMAPPED';
    const existing = curByBrand.get(brandName) || {
      gmv: 0,
      orders: 0,
      units: 0,
      creators: new Set(),
    };
    existing.gmv += Number(r.gmv || 0);
    existing.orders += Number(r.orders || 0);
    existing.units += Number(r.units_sold || 0);
    existing.creators.add(r.account_id);
    curByBrand.set(brandName, existing);
  }

  const compByBrand = new Map<string, { gmv: number }>();
  for (const r of comparisonRows) {
    const brandName = (r.product_id && prodToBrandMap.get(r.product_id)) || 'UNMAPPED';
    const existing = compByBrand.get(brandName) || { gmv: 0 };
    existing.gmv += Number(r.gmv || 0);
    compByBrand.set(brandName, existing);
  }

  const totalCurrentGmv = Array.from(curByBrand.values()).reduce(
    (acc, b) => acc + b.gmv,
    0,
  );

  const allBrands = new Set([...curByBrand.keys(), ...compByBrand.keys()]);
  const rows: BrandAnalyticsRow[] = [];

  for (const brandName of allBrands) {
    const cur = curByBrand.get(brandName) || {
      gmv: 0,
      orders: 0,
      units: 0,
      creators: new Set(),
    };
    const comp = compByBrand.get(brandName) || { gmv: 0 };

    const absoluteDelta = cur.gmv - comp.gmv;
    const growthPct =
      comp.gmv > 0
        ? Math.round(((cur.gmv - comp.gmv) / comp.gmv) * 1000) / 10
        : null;

    const contributionPct =
      totalCurrentGmv > 0
        ? Math.round((cur.gmv / totalCurrentGmv) * 1000) / 10
        : 0;

    const brandRecord = data.entities.brands.find((b) => b.name === brandName);

    rows.push({
      brandId: brandRecord?.id || brandName,
      brandName,
      currentGmv: Math.round(cur.gmv * 100) / 100,
      comparisonGmv: Math.round(comp.gmv * 100) / 100,
      absoluteDelta: Math.round(absoluteDelta * 100) / 100,
      growthPct,
      orders: cur.orders,
      units: cur.units,
      creatorsCount: cur.creators.size,
      contributionPct,
    });
  }

  return rows.sort((a, b) => b.currentGmv - a.currentGmv);
}
