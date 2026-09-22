import type { WorkspaceData, Performance } from '../../types/domain.ts';
import { records } from '../operations/config.ts';

type AugmentedPerformance = Performance & {
  creator_id?: string;
  quantity?: number;
};

export type BrandMappingStatus = 'mapped' | 'unmapped' | 'ambiguous';

export type BrandMapping = {
  product_id: string;
  product_name: string;
  brand_id: string | null;
  brand_name: string | null;
  status: BrandMappingStatus;
};

export type BrandPerformanceRow = {
  brand_id: string | null;
  brand_name: string;
  gmv: number;
  orders: number;
  quantity: number;
  commission: number;
  affiliates: number;
  growth: number | null;
  contribution: number | null;
  mapping_status: BrandMappingStatus;
};

export function getBrandMappings(data: WorkspaceData): BrandMapping[] {
  const customMappings = records(data, 'brand_mappings');
  const customMap = new Map<string, { brand_id: string; status: BrandMappingStatus }>(
    customMappings.map((m) => [String(m.product_id), { brand_id: String(m.brand_id), status: (m.status as BrandMappingStatus) || 'mapped' }]),
  );

  return data.entities.products.map((p) => {
    const custom = customMap.get(p.id);
    if (custom) {
      const b = data.entities.brands.find((brand) => brand.id === custom.brand_id);
      return {
        product_id: p.id,
        product_name: p.name,
        brand_id: custom.brand_id,
        brand_name: b?.name || 'Unknown Brand',
        status: custom.status,
      };
    }

    if (p.brand_id) {
      const bId = String(p.brand_id);
      const b = data.entities.brands.find((brand) => brand.id === bId);
      if (b) {
        return {
          product_id: p.id,
          product_name: p.name,
          brand_id: bId,
          brand_name: b.name,
          status: 'mapped',
        };
      }
    }

    // Heuristic fallback matching for master data
    const matchedBrand = data.entities.brands.find((b) =>
      p.name.toLowerCase().includes(b.name.toLowerCase()),
    );

    if (matchedBrand) {
      return {
        product_id: p.id,
        product_name: p.name,
        brand_id: matchedBrand.id,
        brand_name: matchedBrand.name,
        status: 'mapped',
      };
    }

    return {
      product_id: p.id,
      product_name: p.name,
      brand_id: null,
      brand_name: 'Unmapped / Uncategorized',
      status: 'unmapped',
    };
  });
}

export function aggregateBrandPerformance(
  rows: Performance[],
  data: WorkspaceData,
  totalGmv: number,
): BrandPerformanceRow[] {
  const mappings = getBrandMappings(data);
  const mappingMap = new Map<string, BrandMapping>(
    mappings.map((m) => [m.product_id, m]),
  );

  const byBrand = new Map<
    string,
    {
      brand_id: string | null;
      brand_name: string;
      gmv: number;
      orders: number;
      quantity: number;
      commission: number;
      affiliates: Set<string>;
      status: BrandMappingStatus;
    }
  >();

  for (const r of rows as AugmentedPerformance[]) {
    const pId = String(r.product_id || '');
    const mapped = mappingMap.get(pId);

    const bKey = mapped?.brand_id || 'unmapped';
    const bName = mapped?.brand_name || 'Unmapped / Uncategorized';
    const status = mapped?.status || 'unmapped';

    const existing = byBrand.get(bKey) || {
      brand_id: mapped?.brand_id || null,
      brand_name: bName,
      gmv: 0,
      orders: 0,
      quantity: 0,
      commission: 0,
      affiliates: new Set<string>(),
      status,
    };

    existing.gmv += Number(r.gmv || 0);
    existing.orders += Number(r.orders || 0);
    existing.quantity += Number(r.units_sold || r.quantity || 0);
    existing.commission += Number(r.commission || 0);
    if (r.orders > 0 && (r.creator_id || r.account_id)) {
      existing.affiliates.add(String(r.creator_id || r.account_id));
    }

    byBrand.set(bKey, existing);
  }

  const result: BrandPerformanceRow[] = [];
  for (const item of byBrand.values()) {
    result.push({
      brand_id: item.brand_id,
      brand_name: item.brand_name,
      gmv: item.gmv,
      orders: item.orders,
      quantity: item.quantity,
      commission: item.commission,
      affiliates: item.affiliates.size,
      growth: null,
      contribution: totalGmv ? (item.gmv / totalGmv) * 100 : null,
      mapping_status: item.status,
    });
  }

  return result.sort((a, b) => b.gmv - a.gmv);
}
