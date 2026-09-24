import type { WorkspaceData } from '../../types/domain.ts';
import type { StockPerformanceItem, ProductContributionRow } from './types.ts';
import { records } from '../operations/config.ts';
import { latestStock, stockStatus, stockImpact } from '../operations/engine.ts';

export function computeStockPerformanceCorrelation(
  products: ProductContributionRow[],
  data: WorkspaceData,
  marketplace: 'Shopee' | 'TikTok',
): StockPerformanceItem[] {
  const items: StockPerformanceItem[] = [];

  for (const p of products) {
    if (p.id === 'UNMAPPED_PRODUCT') continue;

    const stock = latestStock(data, p.id, marketplace);
    const stockQty = stock ? Number(stock.stock_quantity) : null;
    const stat = stockStatus(data, stockQty);

    const impact = stockImpact(data, p.id);
    const hslSkus = records(data, 'hsl_creator_products');
    const isHslSku = hslSkus.some((h) => h.product_id === p.id);

    let riskType: StockPerformanceItem['riskType'] = 'HEALTHY';

    if (p.currentGmv > 20000000 && stat === 'Critical') {
      riskType = 'HIGH_GMV_CRITICAL_STOCK';
    } else if (p.currentGmv > 20000000 && stat === 'Low') {
      riskType = 'HIGH_GMV_LOW_STOCK';
    } else if ((p.growthPct || 0) > 20 && stat === 'Low') {
      riskType = 'STRONG_GROWTH_LOW_STOCK';
    } else if (isHslSku && (stat === 'Critical' || stat === 'OOS')) {
      riskType = 'HSL_HERO_CRITICAL_STOCK';
    } else if (impact.peaks.length > 0 && stat === 'Low') {
      riskType = 'PEAK_DAY_SKU_LOW_STOCK';
    }

    if (riskType !== 'HEALTHY' || ['Low', 'Critical', 'OOS'].includes(stat)) {
      items.push({
        productId: p.id,
        productName: p.name,
        gmv: p.currentGmv,
        units: p.units,
        growthPct: p.growthPct,
        stockQuantity: stockQty,
        stockStatus: stat,
        riskType,
        hslCreatorsCount: impact.creators.length,
        peakDaysCount: impact.peaks.length,
        actionCenterHref: `/hsl/stock?product_id=${p.id}`,
      });
    }
  }

  return items.sort((a, b) => b.gmv - a.gmv);
}
