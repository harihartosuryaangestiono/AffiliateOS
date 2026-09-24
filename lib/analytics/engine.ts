import type { WorkspaceData, Performance, ShopeePerformance, TikTokPerformance } from '../../types/domain.ts';
import type {
  AnalyticsPeriod,
  AnalyticsComparison,
  AnalyticsFilter,
  MetricDelta,
  CoverageStatus,
  ParetoAnalysis,
  LeaderboardItem,
  ConcentrationRisk,
  ProductContributionRow,
  ContributionToChange,
  StockPerformanceItem,
  DistributionStats,
  TimeSeriesDualPoint,
} from './types.ts';
import { computeMetricDelta, safeDivide } from './metrics.ts';
import { buildDualTimeSeries } from './timeseries.ts';
import { computeParetoAnalysis } from './pareto.ts';
import { aggregateCreatorPerformance } from './creators.ts';
import { aggregateProductPerformance } from './products.ts';
import { computeContributionToChange } from './contribution.ts';
import { aggregateBrandAnalytics, type BrandAnalyticsRow } from './brands.ts';
import { aggregateCampaignAnalytics, type CampaignAnalyticsRow } from './campaigns.ts';
import { computeStockPerformanceCorrelation } from './stock.ts';
import { evaluateDataCoverage } from './coverage.ts';
import { computeDistributionStats } from './distribution.ts';

export type MarketplaceAnalyticsResult = {
  marketplace: 'Shopee' | 'TikTok';
  currentPeriod: AnalyticsPeriod;
  comparisonPeriod: AnalyticsComparison;
  coverage: CoverageStatus;
  kpiSummary: {
    gmv: MetricDelta;
    orders: MetricDelta;
    units: MetricDelta;
    affiliatesWithSales: MetricDelta;
    activeAffiliates: MetricDelta;
    commission: MetricDelta;
    asp: MetricDelta;
    aov: MetricDelta;
    roi: MetricDelta;
    costRatio: MetricDelta;
    clicks?: MetricDelta;
    conversionRate?: MetricDelta;
    videoCount?: MetricDelta;
    liveCount?: MetricDelta;
  };
  whatChanged: {
    gmvDelta: number | null;
    gmvGrowthPct: number | null;
    ordersDelta: number | null;
    ordersGrowthPct: number | null;
    sellingCreatorsDelta: number | null;
    commissionDelta: number | null;
    commissionGrowthPct: number | null;
    largestProductDriver: { name: string; delta: number } | null;
    largestCreatorDriver: { name: string; delta: number } | null;
    largestDecline: { name: string; delta: number } | null;
  };
  timeSeries: TimeSeriesDualPoint[];
  creatorAnalytics: {
    items: LeaderboardItem[];
    topByGmv: LeaderboardItem[];
    topByOrders: LeaderboardItem[];
    topGrowth: LeaderboardItem[];
    largestDeclining: LeaderboardItem[];
    newlyActive: LeaderboardItem[];
    losingMomentum: LeaderboardItem[];
    concentrationRisk: ConcentrationRisk;
    pareto: ParetoAnalysis;
  };
  productAnalytics: {
    items: ProductContributionRow[];
    topByGmv: ProductContributionRow[];
    topByUnits: ProductContributionRow[];
    topGrowth: ProductContributionRow[];
    largestDeclining: ProductContributionRow[];
    newlySelling: ProductContributionRow[];
    highCreatorActivity: ProductContributionRow[];
    lowStockHighPerformance: ProductContributionRow[];
    pareto: ParetoAnalysis;
  };
  contributionToChange: ContributionToChange;
  brandAnalytics: BrandAnalyticsRow[];
  campaignAnalytics: CampaignAnalyticsRow[];
  stockCorrelation: StockPerformanceItem[];
  distribution: {
    creatorGmv: DistributionStats;
    productGmv: DistributionStats;
  };
};

export function computeMarketplaceAnalytics(input: {
  data: WorkspaceData;
  marketplace: 'Shopee' | 'TikTok';
  period: AnalyticsPeriod;
  comparison: AnalyticsComparison;
  filter?: AnalyticsFilter;
}): MarketplaceAnalyticsResult {
  const { data, marketplace, period, comparison, filter = {} } = input;

  // 1. Filter rows by marketplace
  const rawRows: Performance[] =
    marketplace === 'TikTok'
      ? data.tiktok_performance
      : data.shopee_performance;

  const accounts =
    marketplace === 'TikTok' ? data.tiktok_accounts : data.shopee_accounts;

  // Apply optional entity filters
  const accountIdsForCreator = filter.creatorId
    ? new Set(accounts.filter((a) => a.creator_id === filter.creatorId).map((a) => a.id))
    : null;

  const filteredRows = rawRows.filter((r) => {
    if (filter.campaignId && r.campaign_id !== filter.campaignId) return false;
    if (filter.productId && r.product_id !== filter.productId) return false;
    if (accountIdsForCreator && !accountIdsForCreator.has(r.account_id)) return false;
    return true;
  });

  // Split into current period rows and comparison period rows
  const currentRows = filteredRows.filter(
    (r) => r.date >= period.start && r.date <= period.end,
  );

  const comparisonRows = comparison
    ? filteredRows.filter(
        (r) => r.date >= comparison.start && r.date <= comparison.end,
      )
    : [];

  // Helper sums
  const sumField = (rows: Performance[], field: keyof Performance): number =>
    rows.reduce((acc, r) => acc + Number(r[field] || 0), 0);

  const curGmv = sumField(currentRows, 'gmv');
  const compGmv = comparison ? sumField(comparisonRows, 'gmv') : null;

  const curOrders = sumField(currentRows, 'orders');
  const compOrders = comparison ? sumField(comparisonRows, 'orders') : null;

  const curUnits = sumField(currentRows, 'units_sold');
  const compUnits = comparison ? sumField(comparisonRows, 'units_sold') : null;

  const curCommission = sumField(currentRows, 'commission');
  const compCommission = comparison ? sumField(comparisonRows, 'commission') : null;

  // Distinct selling affiliates
  const getSellingCreatorsCount = (rows: Performance[]): number => {
    const accToCreator = new Map(accounts.map((a) => [a.id, a.creator_id]));
    const selling = new Set<string>();
    for (const r of rows) {
      if (r.orders > 0 || r.gmv > 0) {
        selling.add(accToCreator.get(r.account_id) || r.account_id);
      }
    }
    return selling.size;
  };

  const curSellingCreators = getSellingCreatorsCount(currentRows);
  const compSellingCreators = comparison ? getSellingCreatorsCount(comparisonRows) : null;

  // Active affiliates registered
  const activeAffiliatesCount = accounts.length;

  // Derived metrics
  const curAsp = safeDivide(curGmv, curUnits, 0);
  const compAsp = compGmv !== null && compUnits !== null ? safeDivide(compGmv, compUnits, 0) : null;

  const curAov = safeDivide(curGmv, curOrders, 0);
  const compAov = compGmv !== null && compOrders !== null ? safeDivide(compGmv, compOrders, 0) : null;

  const curRoi = safeDivide(curGmv, curCommission, 0);
  const compRoi = compGmv !== null && compCommission !== null ? safeDivide(compGmv, compCommission, 0) : null;

  const curCostRatio = curGmv > 0 && curCommission > 0 ? (curCommission / curGmv) * 100 : 0;
  const compCostRatio =
    compGmv !== null && compCommission !== null && compGmv > 0
      ? (compCommission / compGmv) * 100
      : null;

  // Build KPI summary deltas
  const kpiSummary: MarketplaceAnalyticsResult['kpiSummary'] = {
    gmv: computeMetricDelta(curGmv, compGmv, 'POSITIVE_WHEN_HIGHER'),
    orders: computeMetricDelta(curOrders, compOrders, 'POSITIVE_WHEN_HIGHER'),
    units: computeMetricDelta(curUnits, compUnits, 'POSITIVE_WHEN_HIGHER'),
    affiliatesWithSales: computeMetricDelta(
      curSellingCreators,
      compSellingCreators,
      'POSITIVE_WHEN_HIGHER',
    ),
    activeAffiliates: computeMetricDelta(
      activeAffiliatesCount,
      comparison ? activeAffiliatesCount : null,
      'POSITIVE_WHEN_HIGHER',
    ),
    commission: computeMetricDelta(curCommission, compCommission, 'POSITIVE_WHEN_LOWER'),
    asp: computeMetricDelta(curAsp || 0, compAsp, 'POSITIVE_WHEN_HIGHER'),
    aov: computeMetricDelta(curAov || 0, compAov, 'POSITIVE_WHEN_HIGHER'),
    roi: computeMetricDelta(curRoi || 0, compRoi, 'POSITIVE_WHEN_HIGHER'),
    costRatio: computeMetricDelta(curCostRatio, compCostRatio, 'POSITIVE_WHEN_LOWER'),
  };

  // Marketplace-specific KPIs
  if (marketplace === 'Shopee') {
    const shopeeCur = currentRows as ShopeePerformance[];
    const shopeeComp = comparisonRows as ShopeePerformance[];
    const curClicks = shopeeCur.reduce((acc, r) => acc + Number(r.clicks || 0), 0);
    const compClicks = comparison ? shopeeComp.reduce((acc, r) => acc + Number(r.clicks || 0), 0) : null;
    kpiSummary.clicks = computeMetricDelta(curClicks, compClicks, 'POSITIVE_WHEN_HIGHER');

    const curCr = curClicks > 0 ? (curOrders / curClicks) * 100 : 0;
    const compCr = compClicks && compClicks > 0 && compOrders !== null ? (compOrders / compClicks) * 100 : null;
    kpiSummary.conversionRate = computeMetricDelta(
      Math.round(curCr * 100) / 100,
      compCr !== null ? Math.round(compCr * 100) / 100 : null,
      'POSITIVE_WHEN_HIGHER',
      'PARTIALLY_SUPPORTED',
    );
  } else {
    const tiktokCur = currentRows as TikTokPerformance[];
    const tiktokComp = comparisonRows as TikTokPerformance[];
    const curVideos = tiktokCur.reduce((acc, r) => acc + Number(r.video_count || 0), 0);
    const compVideos = comparison ? tiktokComp.reduce((acc, r) => acc + Number(r.video_count || 0), 0) : null;
    kpiSummary.videoCount = computeMetricDelta(curVideos, compVideos, 'POSITIVE_WHEN_HIGHER');

    const curLives = tiktokCur.reduce((acc, r) => acc + Number(r.live_count || 0), 0);
    const compLives = comparison ? tiktokComp.reduce((acc, r) => acc + Number(r.live_count || 0), 0) : null;
    kpiSummary.liveCount = computeMetricDelta(curLives, compLives, 'POSITIVE_WHEN_HIGHER');
  }

  // 2. Data coverage evaluation
  const coverage = evaluateDataCoverage(data, marketplace, period, comparison);

  // 3. Time Series
  const timeSeries = buildDualTimeSeries(
    currentRows,
    comparisonRows,
    period,
    comparison,
    'gmv',
  );

  // 4. Creator Analytics
  const creatorPerf = aggregateCreatorPerformance(
    currentRows,
    comparisonRows,
    data,
    marketplace,
  );

  const creatorPareto = computeParetoAnalysis(
    creatorPerf.items.map((c) => ({
      id: c.id,
      name: c.name,
      value: c.currentGmv,
    })),
    'creators',
    marketplace,
  );

  // 5. Product Analytics
  const prodPerf = aggregateProductPerformance(
    currentRows,
    comparisonRows,
    data,
    marketplace,
  );

  const productPareto = computeParetoAnalysis(
    prodPerf.items.map((p) => ({
      id: p.id,
      name: p.name,
      value: p.currentGmv,
    })),
    'products',
    marketplace,
  );

  // 6. Contribution to Change
  const contributionToChange = computeContributionToChange(
    creatorPerf.items,
    prodPerf.items,
    curGmv,
    compGmv || 0,
  );

  // 7. Brand and Campaign Analytics
  const brandAnalytics = aggregateBrandAnalytics(
    currentRows,
    comparisonRows,
    data,
  );

  const campaignAnalytics = aggregateCampaignAnalytics(
    currentRows,
    comparisonRows,
    data,
    marketplace,
  );

  // 8. Stock Correlation
  const stockCorrelation = computeStockPerformanceCorrelation(
    prodPerf.items,
    data,
    marketplace,
  );

  // 9. Distribution
  const creatorGmvDistribution = computeDistributionStats(
    creatorPerf.items.map((c) => c.currentGmv).filter((v) => v > 0),
  );
  const productGmvDistribution = computeDistributionStats(
    prodPerf.items.map((p) => p.currentGmv).filter((v) => v > 0),
  );

  // 10. "What Changed?" summary
  const topProdDriver = contributionToChange.topPositiveDrivers[0];
  const topCreatDriver = creatorPerf.topGrowth[0];
  const topDecline = contributionToChange.topNegativeDrivers[0];

  const whatChanged: MarketplaceAnalyticsResult['whatChanged'] = {
    gmvDelta: kpiSummary.gmv.absoluteDelta,
    gmvGrowthPct: kpiSummary.gmv.percentageDelta,
    ordersDelta: kpiSummary.orders.absoluteDelta,
    ordersGrowthPct: kpiSummary.orders.percentageDelta,
    sellingCreatorsDelta: kpiSummary.affiliatesWithSales.absoluteDelta,
    commissionDelta: kpiSummary.commission.absoluteDelta,
    commissionGrowthPct: kpiSummary.commission.percentageDelta,
    largestProductDriver: topProdDriver
      ? { name: topProdDriver.name, delta: topProdDriver.absoluteDelta }
      : null,
    largestCreatorDriver: topCreatDriver
      ? { name: topCreatDriver.name, delta: topCreatDriver.absoluteDelta }
      : null,
    largestDecline: topDecline
      ? { name: topDecline.name, delta: topDecline.absoluteDelta }
      : null,
  };

  return {
    marketplace,
    currentPeriod: period,
    comparisonPeriod: comparison,
    coverage,
    kpiSummary,
    whatChanged,
    timeSeries,
    creatorAnalytics: {
      ...creatorPerf,
      pareto: creatorPareto,
    },
    productAnalytics: {
      ...prodPerf,
      pareto: productPareto,
    },
    contributionToChange,
    brandAnalytics,
    campaignAnalytics,
    stockCorrelation,
    distribution: {
      creatorGmv: creatorGmvDistribution,
      productGmv: productGmvDistribution,
    },
  };
}
