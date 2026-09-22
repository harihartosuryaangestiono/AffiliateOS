export type HistoricalMarketplace = 'Shopee' | 'TikTok';

export type HistoricalTransaction = {
  sourceRow: number;
  marketplace: HistoricalMarketplace;
  transactionId: string;
  itemId: string;
  creatorKey: string;
  reportingDate: string;
  status: string;
  verifiedStatus?: string;
  gmv: number;
  quantity: number;
  commission: number;
  contributesGmv: boolean;
  contributesSale: boolean;
};

export type CanonicalMetricValue = number | null;
export type CanonicalMetrics = {
  affiliateGmv: CanonicalMetricValue;
  orders: CanonicalMetricValue;
  quantity: CanonicalMetricValue;
  affiliatesWithSales: CanonicalMetricValue;
  totalAffiliates: CanonicalMetricValue;
  commission: CanonicalMetricValue;
  asp: CanonicalMetricValue;
  roi: CanonicalMetricValue;
  costRatio: CanonicalMetricValue;
  storeRevenue: CanonicalMetricValue;
  affiliateContribution: CanonicalMetricValue;
  target: CanonicalMetricValue;
  targetAchievement: CanonicalMetricValue;
};

export type ReconciliationResult = {
  marketplace: HistoricalMarketplace;
  period: { start: string; end: string };
  metric: keyof CanonicalMetrics;
  reference: number | null;
  actual: number | null;
  delta: number | null;
  status: 'PASS' | 'INVESTIGATE' | 'SOURCE_UNAVAILABLE';
  explanation?: string;
};
