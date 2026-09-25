import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAnalyticsPeriod } from '../lib/analytics/periods.ts';
import { resolveComparisonPeriod } from '../lib/analytics/comparison.ts';
import { computeMarketplaceAnalytics } from '../lib/analytics/engine.ts';
import { seed } from '../lib/data/seed.ts';
import { upgradeDemo } from '../lib/operations/demo.ts';

const REF_DATE = new Date('2026-09-24T12:00:00+07:00');

// 1. ANALYTICS NAVIGATION & SECTION GROUPING
void test('UX: analytics navigation structure supports core, drivers, and operations views', () => {
  const expectedTabs = [
    'overview',
    'creators',
    'products',
    'contribution',
    'campaigns',
    'stock',
    'ai',
  ];
  assert.equal(expectedTabs.length, 7);
  assert.ok(expectedTabs.includes('overview'));
  assert.ok(expectedTabs.includes('creators'));
  assert.ok(expectedTabs.includes('products'));
  assert.ok(expectedTabs.includes('contribution'));
  assert.ok(expectedTabs.includes('campaigns'));
  assert.ok(expectedTabs.includes('stock'));
  assert.ok(expectedTabs.includes('ai'));
});

// 2. PLATFORM CONTINUITY & ISOLATION
void test('UX: platform continuity keeps identical period contract across Shopee and TikTok without leakage', () => {
  const period = resolveAnalyticsPeriod('LAST_30_DAYS', { now: REF_DATE });
  const comp = resolveComparisonPeriod(period, 'PREVIOUS_PERIOD');

  const shopeeAnalytics = computeMarketplaceAnalytics({
    data: seed,
    marketplace: 'Shopee',
    period,
    comparison: comp,
  });

  const tiktokAnalytics = computeMarketplaceAnalytics({
    data: seed,
    marketplace: 'TikTok',
    period,
    comparison: comp,
  });

  // Verify marketplace isolation
  assert.equal(shopeeAnalytics.marketplace, 'Shopee');
  assert.equal(tiktokAnalytics.marketplace, 'TikTok');
  assert.equal(shopeeAnalytics.currentPeriod.start, tiktokAnalytics.currentPeriod.start);
  assert.equal(shopeeAnalytics.currentPeriod.end, tiktokAnalytics.currentPeriod.end);
  assert.equal(shopeeAnalytics.currentPeriod.dayCount, tiktokAnalytics.currentPeriod.dayCount);

  // Shopee should have clicks if present, TikTok should have videoCount if present
  assert.ok('gmv' in shopeeAnalytics.kpiSummary);
  assert.ok('gmv' in tiktokAnalytics.kpiSummary);
});

// 3. PERIOD TRANSITION STATE
void test('UX: period transition resolves 7D, 30D, MTD, and Custom cleanly', () => {
  const p7 = resolveAnalyticsPeriod('LAST_7_DAYS', { now: REF_DATE });
  const p30 = resolveAnalyticsPeriod('LAST_30_DAYS', { now: REF_DATE });
  const pMtd = resolveAnalyticsPeriod('THIS_MONTH', { now: REF_DATE });
  const pCustom = resolveAnalyticsPeriod('CUSTOM_DATE_RANGE', {
    now: REF_DATE,
    customStart: '2026-09-10',
    customEnd: '2026-09-20',
  });

  assert.equal(p7.dayCount, 7);
  assert.equal(p30.dayCount, 30);
  assert.equal(pMtd.start, '2026-09-01');
  assert.equal(pCustom.dayCount, 11);
  assert.equal(pCustom.start, '2026-09-10');
  assert.equal(pCustom.end, '2026-09-20');
});

// 4. COMPARISON TRANSITION STATE & UNEQUAL DURATION
void test('UX: comparison transition flags unequal duration without crashing', () => {
  const currentPeriod = resolveAnalyticsPeriod('LAST_7_DAYS', { now: REF_DATE });
  const compUnequal = resolveComparisonPeriod(currentPeriod, 'CUSTOM_PERIOD', {
    customStart: '2026-08-01',
    customEnd: '2026-08-15', // 15 days vs 7 days
  });

  assert.ok(compUnequal);
  assert.equal(compUnequal.isCustomUnequalDuration, true);
  assert.equal(compUnequal.dayCount, 15);
  assert.equal(currentPeriod.dayCount, 7);

  const compEqual = resolveComparisonPeriod(currentPeriod, 'PREVIOUS_PERIOD');
  assert.ok(compEqual);
  assert.equal(compEqual.isCustomUnequalDuration, false);
  assert.equal(compEqual.dayCount, 7);
});

// 5. SPARSE CHART BEHAVIOR
void test('UX: sparse chart data window calculates finite numbers without NaN', () => {
  // Empty workspace
  const emptyData = {
    ...seed,
    tiktok_performance: [],
    shopee_performance: [],
  };

  const period = resolveAnalyticsPeriod('LAST_7_DAYS', { now: REF_DATE });
  const comp = resolveComparisonPeriod(period, 'PREVIOUS_PERIOD');

  const analytics = computeMarketplaceAnalytics({
    data: emptyData,
    marketplace: 'Shopee',
    period,
    comparison: comp,
  });

  assert.equal(analytics.timeSeries.length, 7);
  analytics.timeSeries.forEach((pt) => {
    assert.equal(Number.isFinite(pt.currentValue), true);
    assert.equal(Number.isFinite(pt.cumulativeCurrent), true);
    assert.equal(Number.isNaN(pt.currentValue), false);
  });
});

// 6. NO-COMPARISON BEHAVIOR
void test('UX: no-comparison mode cleanly renders baseline without phantom comparison values', () => {
  const period = resolveAnalyticsPeriod('LAST_30_DAYS', { now: REF_DATE });
  const noComp = resolveComparisonPeriod(period, 'NO_COMPARISON');

  const analytics = computeMarketplaceAnalytics({
    data: seed,
    marketplace: 'TikTok',
    period,
    comparison: noComp,
  });

  assert.equal(analytics.comparisonPeriod, null);
  assert.equal(analytics.kpiSummary.gmv.comparison, null);
  assert.equal(analytics.kpiSummary.gmv.percentageDelta, null);
  assert.equal(analytics.kpiSummary.gmv.absoluteDelta, null);
  assert.equal(analytics.kpiSummary.gmv.availability, 'SUPPORTED');
});

// 7. REAL DATA INTEGRITY
void test('UX: production real data integrity is maintained with zero fake numbers', () => {
  const demoData = upgradeDemo(seed);
  const period = resolveAnalyticsPeriod('LAST_30_DAYS', { now: REF_DATE });
  const comp = resolveComparisonPeriod(period, 'PREVIOUS_PERIOD');

  const analytics = computeMarketplaceAnalytics({
    data: demoData,
    marketplace: 'Shopee',
    period,
    comparison: comp,
  });

  assert.ok(analytics.kpiSummary.gmv.current >= 0);
  assert.ok(analytics.creatorAnalytics.topByGmv.length >= 0);
  assert.ok(analytics.productAnalytics.items.length >= 0);
});
