export type MetricAvailability =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'SOURCE_UNAVAILABLE'
  | 'BUSINESS_CONFIRMATION_REQUIRED';

export type PeriodMode =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM_DATE_RANGE';

export type CalendarGranularity = 'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

export type ComparisonMode =
  | 'PREVIOUS_PERIOD'
  | 'PREVIOUS_WEEK'
  | 'PREVIOUS_MONTH'
  | 'SAME_DAY_PREVIOUS_MONTH'
  | 'PREVIOUS_YEAR'
  | 'CUSTOM_PERIOD'
  | 'NO_COMPARISON';

export type ChangeClassification =
  | 'STRONG_INCREASE'
  | 'INCREASE'
  | 'STABLE'
  | 'DECREASE'
  | 'STRONG_DECREASE';

export type MetricSemantics = 'POSITIVE_WHEN_HIGHER' | 'POSITIVE_WHEN_LOWER';

export type MetricDelta = {
  current: number;
  comparison: number | null;
  absoluteDelta: number | null;
  percentageDelta: number | null;
  classification: ChangeClassification;
  direction: 'UP' | 'DOWN' | 'FLAT' | 'NONE';
  isFavorable: boolean | null;
  availability: MetricAvailability;
};

export type AnalyticsPeriod = {
  start: string;
  end: string;
  label: string;
  mode: PeriodMode;
  dayCount: number;
  cutoffDate?: string;
  isPartial?: boolean;
};

export type AnalyticsComparison = {
  mode: ComparisonMode;
  start: string;
  end: string;
  label: string;
  dayCount: number;
  isCustomUnequalDuration?: boolean;
  durationDifferenceDays?: number;
} | null;

export type AnalyticsFilter = {
  campaignId?: string;
  brandId?: string;
  productId?: string;
  creatorId?: string;
  category?: string;
};

export type ParetoItem = {
  id: string;
  name: string;
  value: number;
  contributionPct: number;
  cumulativeValue: number;
  cumulativePct: number;
  isWithin80Percent: boolean;
};

export type ParetoAnalysis = {
  items: ParetoItem[];
  totalValue: number;
  totalEntitiesCount: number;
  entitiesIn80PctCount: number;
  entitiesIn80PctShare: number; // e.g., 0.12 (12%)
  summaryText: string;
};

export type ConcentrationRisk = {
  top1Share: number;
  top5Share: number;
  top10Share: number;
  remainingShare: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  explanation: string;
};

export type LeaderboardItem = {
  id: string;
  name: string;
  username?: string;
  currentGmv: number;
  comparisonGmv: number;
  absoluteDelta: number;
  growthPct: number | null;
  orders: number;
  units: number;
  commission: number;
  contributionPct: number;
  classification: ChangeClassification;
  status?: string;
  additionalInfo?: string;
};

export type ProductContributionRow = {
  rank: number;
  id: string;
  name: string;
  brandName: string;
  currentGmv: number;
  comparisonGmv: number;
  absoluteDelta: number;
  growthPct: number | null;
  orders: number;
  units: number;
  asp: number | null;
  contributionPct: number;
  cumulativePct: number;
  creatorsCount: number;
  stockStatus: string;
  stockQuantity: number | null;
  lastStockUpdated?: string;
};

export type DriverItem = {
  id: string;
  name: string;
  entityType: 'creator' | 'product';
  currentValue: number;
  comparisonValue: number;
  absoluteDelta: number;
  growthPct: number | null;
  contributionToGrowthPct: number | null;
  isNew: boolean;
  isLost: boolean;
};

export type ContributionToChange = {
  totalDeltaGmv: number;
  totalGrowthPct: number | null;
  topPositiveDrivers: DriverItem[];
  topNegativeDrivers: DriverItem[];
  newContributors: DriverItem[];
  lostContributors: DriverItem[];
  unexplainedDeltaGmv: number;
};

export type StockPerformanceItem = {
  productId: string;
  productName: string;
  gmv: number;
  units: number;
  growthPct: number | null;
  stockQuantity: number | null;
  stockStatus: 'Healthy' | 'Low' | 'Critical' | 'OOS' | 'Unknown';
  riskType:
    | 'HIGH_GMV_CRITICAL_STOCK'
    | 'HIGH_GMV_LOW_STOCK'
    | 'STRONG_GROWTH_LOW_STOCK'
    | 'HSL_HERO_CRITICAL_STOCK'
    | 'PEAK_DAY_SKU_LOW_STOCK'
    | 'HEALTHY';
  hslCreatorsCount: number;
  peakDaysCount: number;
  actionCenterHref?: string;
};

export type DistributionStats = {
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
  p90: number;
  total: number;
  count: number;
};

export type TimeSeriesDualPoint = {
  index: number;
  currentDate: string;
  currentValue: number;
  cumulativeCurrent: number;
  comparisonDate?: string;
  comparisonValue?: number;
  cumulativeComparison?: number;
  absoluteDelta?: number;
  percentageDelta?: number | null;
};

export type CoverageStatus = {
  marketplace: 'Shopee' | 'TikTok';
  earliestDate: string | null;
  latestDate: string | null;
  h2Cutoff: string;
  isH2Ready: boolean;
  lastImportedFile?: string;
  lastImportedAt?: string;
  currentPeriodCoverageDays: number;
  currentPeriodTotalDays: number;
  comparisonCoverageDays: number;
  comparisonTotalDays: number;
  hasFairComparisonWarning: boolean;
  warningMessage?: string;
};
