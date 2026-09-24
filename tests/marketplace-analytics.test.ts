import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  resolveAnalyticsPeriod, 
  resolveCalendarPeriod,
} from '../lib/analytics/periods.ts';
import { resolveComparisonPeriod } from '../lib/analytics/comparison.ts';
import { safeDivide, computeMetricDelta, classifyChange } from '../lib/analytics/metrics.ts';
import { computeParetoAnalysis } from '../lib/analytics/pareto.ts';
import { computeContributionToChange } from '../lib/analytics/contribution.ts';
import { computeMarketplaceAnalytics } from '../lib/analytics/engine.ts';
import { computeDistributionStats } from '../lib/analytics/distribution.ts';
import { seed } from '../lib/data/seed.ts';
import { upgradeDemo } from '../lib/operations/demo.ts';

// Fixed reference date: 24 September 2026 in Asia/Jakarta (WIB)
const REF_DATE = new Date('2026-09-24T12:00:00+07:00');

// 1. TEST — PERIOD ENGINE (Section 80)
void test('Period Engine: correctly computes TODAY and YESTERDAY in Asia/Jakarta', () => {
  const today = resolveAnalyticsPeriod('TODAY', { now: REF_DATE });
  assert.equal(today.start, '2026-09-24');
  assert.equal(today.end, '2026-09-24');
  assert.equal(today.dayCount, 1);

  const yesterday = resolveAnalyticsPeriod('YESTERDAY', { now: REF_DATE });
  assert.equal(yesterday.start, '2026-09-23');
  assert.equal(yesterday.end, '2026-09-23');
  assert.equal(yesterday.dayCount, 1);
});

void test('Period Engine: computes LAST_7_DAYS and LAST_30_DAYS rolling periods', () => {
  const last7 = resolveAnalyticsPeriod('LAST_7_DAYS', { now: REF_DATE });
  assert.equal(last7.end, '2026-09-24');
  assert.equal(last7.start, '2026-09-18');
  assert.equal(last7.dayCount, 7);

  const last30 = resolveAnalyticsPeriod('LAST_30_DAYS', { now: REF_DATE });
  assert.equal(last30.end, '2026-09-24');
  assert.equal(last30.dayCount, 30);
});

void test('Period Engine: computes THIS_WEEK (ISO Mon-Sun) and LAST_WEEK', () => {
  // 24 Sep 2026 is a Thursday. Monday is 21 Sep 2026.
  const thisWeek = resolveAnalyticsPeriod('THIS_WEEK', { now: REF_DATE });
  assert.equal(thisWeek.start, '2026-09-21');
  assert.equal(thisWeek.end, '2026-09-24'); // Ongoing week through today

  const lastWeek = resolveAnalyticsPeriod('LAST_WEEK', { now: REF_DATE });
  assert.equal(lastWeek.start, '2026-09-14');
  assert.equal(lastWeek.end, '2026-09-20');
  assert.equal(lastWeek.dayCount, 7);
});

void test('Period Engine: computes THIS_MONTH and LAST_MONTH calendar boundaries', () => {
  const thisMonth = resolveAnalyticsPeriod('THIS_MONTH', { now: REF_DATE });
  assert.equal(thisMonth.start, '2026-09-01');
  assert.equal(thisMonth.end, '2026-09-24'); // MTD through today

  const lastMonth = resolveAnalyticsPeriod('LAST_MONTH', { now: REF_DATE });
  assert.equal(lastMonth.start, '2026-08-01');
  assert.equal(lastMonth.end, '2026-08-31');
  assert.equal(lastMonth.dayCount, 31);
});

void test('Period Engine: calendar mode (DAY, WEEK, MONTH) WIB boundaries', () => {
  const dayPeriod = resolveCalendarPeriod('DAY', '2026-09-24');
  assert.equal(dayPeriod.start, '2026-09-24');
  assert.equal(dayPeriod.end, '2026-09-24');
  assert.equal(dayPeriod.dayCount, 1);

  const weekPeriod = resolveCalendarPeriod('WEEK', '2026-09-24');
  assert.equal(weekPeriod.start, '2026-09-21');
  assert.equal(weekPeriod.end, '2026-09-27');
  assert.equal(weekPeriod.dayCount, 7);

  const monthPeriod = resolveCalendarPeriod('MONTH', '2026-09');
  assert.equal(monthPeriod.start, '2026-09-01');
  assert.equal(monthPeriod.end, '2026-09-30');
  assert.equal(monthPeriod.dayCount, 30);
});

// 2. TEST — COMPARISON ENGINE (Section 81)
void test('Comparison Engine: PREVIOUS_PERIOD maintains exact same duration', () => {
  // Selected: 15–21 Sep (7 days) -> Comparison: 08–14 Sep (7 days)
  const period7d = resolveAnalyticsPeriod('CUSTOM_DATE_RANGE', {
    customStart: '2026-09-15',
    customEnd: '2026-09-21',
    now: REF_DATE,
  });
  const comp7d = resolveComparisonPeriod(period7d, 'PREVIOUS_PERIOD');
  assert.ok(comp7d);
  assert.equal(comp7d.start, '2026-09-08');
  assert.equal(comp7d.end, '2026-09-14');
  assert.equal(comp7d.dayCount, 7);
  assert.equal(comp7d.isCustomUnequalDuration, false);

  // Selected: 01–10 Sep (10 days) -> Comparison: 22–31 Aug (10 days)
  const period10d = resolveAnalyticsPeriod('CUSTOM_DATE_RANGE', {
    customStart: '2026-09-01',
    customEnd: '2026-09-10',
    now: REF_DATE,
  });
  const comp10d = resolveComparisonPeriod(period10d, 'PREVIOUS_PERIOD');
  assert.ok(comp10d);
  assert.equal(comp10d.start, '2026-08-22');
  assert.equal(comp10d.end, '2026-08-31');
  assert.equal(comp10d.dayCount, 10);
});

void test('Comparison Engine: PREVIOUS_WEEK and PREVIOUS_MONTH semantics', () => {
  const weekPeriod = resolveCalendarPeriod('WEEK', '2026-09-24');
  const compWeek = resolveComparisonPeriod(weekPeriod, 'PREVIOUS_WEEK');
  assert.ok(compWeek);
  assert.equal(compWeek.start, '2026-09-14');
  assert.equal(compWeek.end, '2026-09-20');

  const monthPeriod = resolveCalendarPeriod('MONTH', '2026-09');
  const compMonth = resolveComparisonPeriod(monthPeriod, 'PREVIOUS_MONTH');
  assert.ok(compMonth);
  assert.equal(compMonth.start, '2026-08-01');
  assert.equal(compMonth.end, '2026-08-31');
});

void test('Comparison Engine: SAME_DAY_PREVIOUS_MONTH (01–24 Sep vs 01–24 Aug)', () => {
  const mtdPeriod = resolveAnalyticsPeriod('CUSTOM_DATE_RANGE', {
    customStart: '2026-09-01',
    customEnd: '2026-09-24',
    now: REF_DATE,
  });
  const sameDayComp = resolveComparisonPeriod(mtdPeriod, 'SAME_DAY_PREVIOUS_MONTH');
  assert.ok(sameDayComp);
  assert.equal(sameDayComp.start, '2026-08-01');
  assert.equal(sameDayComp.end, '2026-08-24');
  assert.equal(sameDayComp.dayCount, 24);
  assert.equal(sameDayComp.isCustomUnequalDuration, false);
});

void test('Comparison Engine: CUSTOM_PERIOD detects unequal duration', () => {
  const period14d = resolveAnalyticsPeriod('CUSTOM_DATE_RANGE', {
    customStart: '2026-09-05',
    customEnd: '2026-09-18', // 14 days
    now: REF_DATE,
  });
  const comp20d = resolveComparisonPeriod(period14d, 'CUSTOM_PERIOD', {
    customStart: '2026-08-10',
    customEnd: '2026-08-29', // 20 days
  });
  assert.ok(comp20d);
  assert.equal(comp20d.isCustomUnequalDuration, true);
  assert.equal(comp20d.dayCount, 20);
  assert.equal(period14d.dayCount, 14);
});

// 3. TEST — METRICS & DELTA SAFETY (Section 81)
void test('Metrics Engine: safe division handles zero denominator without NaN or Infinity', () => {
  assert.equal(safeDivide(100, 0), null);
  assert.equal(safeDivide(0, 0), null);
  assert.equal(safeDivide(100, 10), 10);
  assert.equal(safeDivide(null as unknown as number, 10), null);
});

void test('Metrics Engine: computeMetricDelta handles zero and null safely', () => {
  // From 0 to 100
  const d1 = computeMetricDelta(100, 0);
  assert.equal(d1.absoluteDelta, 100);
  assert.equal(d1.percentageDelta, null); // Cannot divide by zero

  // From 100 to 0
  const d2 = computeMetricDelta(0, 100);
  assert.equal(d2.absoluteDelta, -100);
  assert.equal(d2.percentageDelta, -100);

  // When comparison is null
  const d3 = computeMetricDelta(100, null);
  assert.equal(d3.absoluteDelta, null);
  assert.equal(d3.percentageDelta, null);
  assert.equal(d3.direction, 'NONE');
});

void test('Metrics Engine: semantic change classification (normal vs inverted metrics)', () => {
  // Normal metric (GMV): increase is positive
  const classNormal = classifyChange(15);
  assert.equal(classNormal, 'STRONG_INCREASE');

  // Negative change
  const classNegative = classifyChange(-15);
  assert.equal(classNegative, 'STRONG_DECREASE');

  const flatChange = classifyChange(0.5);
  assert.equal(flatChange, 'STABLE');
});

// 4. TEST — PARETO (Section 82)
void test('Pareto Engine: calculates 80/20 against total relevant population GMV', () => {
  const items = [
    { id: '1', name: 'Item 1', value: 5000000 }, // 50%
    { id: '2', name: 'Item 2', value: 3000000 }, // 30% -> cum 80%
    { id: '3', name: 'Item 3', value: 1000000 }, // 10% -> cum 90%
    { id: '4', name: 'Item 4', value: 1000000 }, // 10% -> cum 100%
  ];

  const pareto = computeParetoAnalysis(items, 'creators', 'Shopee');
  assert.equal(pareto.totalValue, 10000000);
  assert.equal(pareto.totalEntitiesCount, 4);
  assert.equal(pareto.entitiesIn80PctCount, 2);
  assert.equal(pareto.items[0].contributionPct, 50);
  assert.equal(pareto.items[1].cumulativePct, 80);
  assert.match(pareto.summaryText, /2 of 4 selling creators.*generate 80% of Shopee GMV/);
});

// 5. TEST — GROWTH & DECLINE DRIVERS (Section 83)
void test('Growth Drivers: ranks by absolute GMV delta and identifies new/lost contributors', () => {
  const productRows = [
    {
      id: 'p1',
      rank: 1,
      name: 'Product A',
      brandName: 'Brand 1',
      currentGmv: 10000000,
      comparisonGmv: 6000000,
      absoluteDelta: 4000000,
      growthPct: 66.7,
      contributionPct: 66.7,
      cumulativePct: 66.7,
      orders: 100,
      units: 100,
      asp: 100000,
      creatorsCount: 5,
      stockQuantity: 100,
      stockStatus: 'In Stock',
    },
    {
      id: 'p2',
      rank: 2,
      name: 'Product B',
      brandName: 'Brand 1',
      currentGmv: 2000000,
      comparisonGmv: 5000000,
      absoluteDelta: -3000000,
      growthPct: -60.0,
      contributionPct: 13.3,
      cumulativePct: 80.0,
      orders: 20,
      units: 20,
      asp: 100000,
      creatorsCount: 2,
      stockQuantity: 50,
      stockStatus: 'In Stock',
    },
    {
      id: 'p3',
      rank: 3,
      name: 'Product C (New)',
      brandName: 'Brand 2',
      currentGmv: 3000000,
      comparisonGmv: 0,
      absoluteDelta: 3000000,
      growthPct: null,
      contributionPct: 20.0,
      cumulativePct: 100.0,
      orders: 30,
      units: 30,
      asp: 100000,
      creatorsCount: 3,
      stockQuantity: 40,
      stockStatus: 'In Stock',
    },
  ];

  const result = computeContributionToChange([], productRows, 15000000, 11000000);
  assert.equal(result.totalDeltaGmv, 4000000);

  // Top positive product driver should be Product A (+4M)
  assert.equal(result.topPositiveDrivers[0].name, 'Product A');
  assert.equal(result.topPositiveDrivers[0].absoluteDelta, 4000000);

  // Top negative product driver should be Product B (-3M)
  assert.equal(result.topNegativeDrivers[0].name, 'Product B');
  assert.equal(result.topNegativeDrivers[0].absoluteDelta, -3000000);

  // New contributor
  assert.equal(result.newContributors.length, 1);
  assert.equal(result.newContributors[0].name, 'Product C (New)');
});

// 6. TEST — MARKETPLACE ISOLATION (Section 84)
void test('Marketplace Isolation: Shopee data never appears in TikTok analytics and vice versa', () => {
  const data = upgradeDemo(structuredClone(seed));
  const period = resolveAnalyticsPeriod('LAST_30_DAYS', { now: REF_DATE });
  const comparison = resolveComparisonPeriod(period, 'PREVIOUS_PERIOD');

  const shopeeAnalytics = computeMarketplaceAnalytics({
    data,
    marketplace: 'Shopee',
    period,
    comparison,
  });

  const tiktokAnalytics = computeMarketplaceAnalytics({
    data,
    marketplace: 'TikTok',
    period,
    comparison,
  });

  // Verify shopee total GMV equals exactly sum of shopee rows
  const shopeeExpected = data.shopee_performance
    .filter(r => r.date >= period.start && r.date <= period.end)
    .reduce((acc, r) => acc + (Number(r.gmv) || 0), 0);
  assert.equal(shopeeAnalytics.kpiSummary.gmv.current, shopeeExpected);

  // Verify tiktok total GMV equals exactly sum of tiktok rows
  const tiktokExpected = data.tiktok_performance
    .filter(r => r.date >= period.start && r.date <= period.end)
    .reduce((acc, r) => acc + (Number(r.gmv) || 0), 0);
  assert.equal(tiktokAnalytics.kpiSummary.gmv.current, tiktokExpected);

  // Shopee analytics creator items GMV sum should equal shopeeExpected
  const shopeeLeaderboardSum = shopeeAnalytics.creatorAnalytics.items.reduce((acc, c) => acc + c.currentGmv, 0);
  assert.equal(shopeeLeaderboardSum, shopeeExpected);

  // TikTok analytics creator items GMV sum should equal tiktokExpected
  const tiktokLeaderboardSum = tiktokAnalytics.creatorAnalytics.items.reduce((acc, c) => acc + c.currentGmv, 0);
  assert.equal(tiktokLeaderboardSum, tiktokExpected);
});

// 7. TEST — REPORT METRIC PARITY (Section 85)
void test('Report Parity: Analytics GMV equals canonical sum of performance rows for identical period', () => {
  const data = upgradeDemo(structuredClone(seed));
  const period = resolveAnalyticsPeriod('LAST_30_DAYS', { now: REF_DATE });
  const comparison = resolveComparisonPeriod(period, 'NO_COMPARISON');

  const shopeeAnalytics = computeMarketplaceAnalytics({
    data,
    marketplace: 'Shopee',
    period,
    comparison,
  });

  const expectedGmv = data.shopee_performance
    .filter(r => r.date >= period.start && r.date <= period.end)
    .reduce((acc, r) => acc + (Number(r.gmv) || 0), 0);

  assert.equal(shopeeAnalytics.kpiSummary.gmv.current, expectedGmv);
});

// 8. TEST — NO FABRICATED DATA IN EMPTY WORKSPACE (Section 86)
void test('No Fake Data: empty workspace produces zero-state without mock numbers or division errors', () => {
  const emptyData = {
    ...upgradeDemo(structuredClone(seed)),
    shopee_performance: [],
    shopee_accounts: [],
    tiktok_performance: [],
    tiktok_accounts: [],
  };

  const period = resolveAnalyticsPeriod('LAST_30_DAYS', { now: REF_DATE });
  const comparison = resolveComparisonPeriod(period, 'PREVIOUS_PERIOD');

  const analytics = computeMarketplaceAnalytics({
    data: emptyData,
    marketplace: 'Shopee',
    period,
    comparison,
  });

  assert.equal(analytics.kpiSummary.gmv.current, 0);
  assert.equal(analytics.kpiSummary.gmv.comparison, 0);
  assert.equal(analytics.creatorAnalytics.topByGmv.length, 0);
  assert.equal(analytics.productAnalytics.topByGmv.length, 0);
  assert.equal(analytics.creatorAnalytics.pareto.totalEntitiesCount, 0);
});

// 9. TEST — DISTRIBUTION ANALYSIS (Section 44)
void test('Distribution Analysis: accurately computes mean, median, P25, P75, P90', () => {
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const dist = computeDistributionStats(values);
  assert.equal(dist.count, 10);
  assert.equal(dist.mean, 55);
  assert.equal(dist.median, 55);
  assert.equal(dist.p25, 32.5);
  assert.equal(dist.p75, 77.5);
  assert.equal(dist.p90, 91);
});
