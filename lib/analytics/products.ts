import type { WorkspaceData, Performance } from '../../types/domain.ts';
import type { ProductContributionRow } from './types.ts';
import { latestStock, stockStatus } from '../operations/engine.ts';

export function aggregateProductPerformance(
  currentRows: Performance[],
  comparisonRows: Performance[],
  data: WorkspaceData,
  marketplace: 'Shopee' | 'TikTok',
): {
  items: ProductContributionRow[];
  topByGmv: ProductContributionRow[];
  topByUnits: ProductContributionRow[];
  topGrowth: ProductContributionRow[];
  largestDeclining: ProductContributionRow[];
  newlySelling: ProductContributionRow[];
  highCreatorActivity: ProductContributionRow[];
  lowStockHighPerformance: ProductContributionRow[];
} {
  const accounts =
    marketplace === 'TikTok' ? data.tiktok_accounts : data.shopee_accounts;
  const accountToCreator = new Map<string, string>();
  for (const acc of accounts) {
    accountToCreator.set(acc.id, acc.creator_id);
  }

  // Aggregate current period by product_id
  const curByProd = new Map<
    string,
    {
      gmv: number;
      orders: number;
      units: number;
      creators: Set<string>;
    }
  >();
  for (const r of currentRows) {
    const prodId = r.product_id || 'UNMAPPED_PRODUCT';
    const creatorId = accountToCreator.get(r.account_id) || r.account_id;
    const existing = curByProd.get(prodId) || {
      gmv: 0,
      orders: 0,
      units: 0,
      creators: new Set<string>(),
    };
    existing.gmv += Number(r.gmv || 0);
    existing.orders += Number(r.orders || 0);
    existing.units += Number(r.units_sold || 0);
    if (r.orders > 0 || r.gmv > 0) {
      existing.creators.add(creatorId);
    }
    curByProd.set(prodId, existing);
  }

  // Aggregate comparison period by product_id
  const compByProd = new Map<
    string,
    {
      gmv: number;
      orders: number;
      units: number;
      creators: Set<string>;
    }
  >();
  for (const r of comparisonRows) {
    const prodId = r.product_id || 'UNMAPPED_PRODUCT';
    const creatorId = accountToCreator.get(r.account_id) || r.account_id;
    const existing = compByProd.get(prodId) || {
      gmv: 0,
      orders: 0,
      units: 0,
      creators: new Set<string>(),
    };
    existing.gmv += Number(r.gmv || 0);
    existing.orders += Number(r.orders || 0);
    existing.units += Number(r.units_sold || 0);
    if (r.orders > 0 || r.gmv > 0) {
      existing.creators.add(creatorId);
    }
    compByProd.set(prodId, existing);
  }

  const allProductIds = new Set<string>([
    ...curByProd.keys(),
    ...compByProd.keys(),
  ]);

  const totalCurrentGmv = Array.from(curByProd.values()).reduce(
    (acc, v) => acc + v.gmv,
    0,
  );

  // First sort by current GMV to assign ranks and cumulative contribution
  const unsortedRows: Omit<ProductContributionRow, 'rank' | 'cumulativePct'>[] = [];

  for (const prodId of allProductIds) {
    const cur = curByProd.get(prodId) || {
      gmv: 0,
      orders: 0,
      units: 0,
      creators: new Set<string>(),
    };
    const comp = compByProd.get(prodId) || {
      gmv: 0,
      orders: 0,
      units: 0,
      creators: new Set<string>(),
    };

    const prodRecord = data.entities.products.find((p) => p.id === prodId);
    const brandRecord = data.entities.brands.find(
      (b) => b.id === prodRecord?.brand_id,
    );

    const name = prodRecord?.name || (prodId === 'UNMAPPED_PRODUCT' ? 'Unmapped Products' : `Product ${prodId.slice(0, 8)}`);
    const brandName = brandRecord?.name || (prodRecord?.brand_name as string) || 'Unassigned Brand';

    const absoluteDelta = cur.gmv - comp.gmv;
    const growthPct =
      comp.gmv > 0
        ? Math.round(((cur.gmv - comp.gmv) / comp.gmv) * 1000) / 10
        : null;

    const asp = cur.units > 0 ? cur.gmv / cur.units : null;
    const contributionPct =
      totalCurrentGmv > 0
        ? Math.round((cur.gmv / totalCurrentGmv) * 1000) / 10
        : 0;

    // Stock Snapshot
    const stock = prodId !== 'UNMAPPED_PRODUCT' ? latestStock(data, prodId, marketplace) : null;
    const stockQty = stock ? Number(stock.stock_quantity) : null;
    const stockStat = stockStatus(data, stockQty);

    unsortedRows.push({
      id: prodId,
      name,
      brandName,
      currentGmv: Math.round(cur.gmv * 100) / 100,
      comparisonGmv: Math.round(comp.gmv * 100) / 100,
      absoluteDelta: Math.round(absoluteDelta * 100) / 100,
      growthPct,
      orders: cur.orders,
      units: cur.units,
      asp: asp !== null ? Math.round(asp) : null,
      contributionPct,
      creatorsCount: cur.creators.size,
      stockStatus: stockStat,
      stockQuantity: stockQty,
      lastStockUpdated: stock?.snapshot_at ? String(stock.snapshot_at) : undefined,
    });
  }

  // Sort descending by current GMV to assign ranks and cumulative percentages
  unsortedRows.sort((a, b) => b.currentGmv - a.currentGmv);

  let runningGmv = 0;
  const items: ProductContributionRow[] = unsortedRows.map((row, idx) => {
    runningGmv += row.currentGmv;
    const cumulativePct =
      totalCurrentGmv > 0
        ? Math.min(100, Math.round((runningGmv / totalCurrentGmv) * 1000) / 10)
        : 0;

    return {
      ...row,
      rank: idx + 1,
      cumulativePct,
    };
  });

  const topByGmv = [...items].filter((i) => i.currentGmv > 0);
  const topByUnits = [...items]
    .filter((i) => i.units > 0)
    .sort((a, b) => b.units - a.units);

  const topGrowth = [...items]
    .filter((i) => i.absoluteDelta > 0)
    .sort((a, b) => b.absoluteDelta - a.absoluteDelta);

  const largestDeclining = [...items]
    .filter((i) => i.absoluteDelta < 0)
    .sort((a, b) => a.absoluteDelta - b.absoluteDelta);

  const newlySelling = [...items]
    .filter((i) => i.comparisonGmv === 0 && i.currentGmv > 0)
    .sort((a, b) => b.currentGmv - a.currentGmv);

  const highCreatorActivity = [...items]
    .filter((i) => i.creatorsCount > 0)
    .sort((a, b) => b.creatorsCount - a.creatorsCount);

  const lowStockHighPerformance = [...items]
    .filter(
      (i) =>
        i.currentGmv > 0 &&
        ['Critical', 'Low', 'OOS'].includes(i.stockStatus),
    )
    .sort((a, b) => b.currentGmv - a.currentGmv);

  return {
    items,
    topByGmv,
    topByUnits,
    topGrowth,
    largestDeclining,
    newlySelling,
    highCreatorActivity,
    lowStockHighPerformance,
  };
}
