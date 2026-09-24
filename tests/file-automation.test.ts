import test from 'node:test';
import assert from 'node:assert/strict';
import { seed as seedData } from '../lib/data/seed.ts';
import {
  detectFileSchema,
  extractPeriodCoverage,
  analyzeBatch,
  reconcileOverlappingRows,
  computeWhatChangedSummary,
  getWorkspaceDataCoverage,
} from '../lib/imports/automation.ts';
import { generateOperationalActions } from '../lib/intelligence/actions.ts';
import { shopeeAdapter } from '../lib/integrations/providers/shopee-adapter.ts';
import { tiktokAdapter } from '../lib/integrations/providers/tiktok-adapter.ts';
import { getWorkspaceConnectionStatus } from '../lib/integrations/registry.ts';
import type { WorkspaceData } from '../types/domain.ts';
import type { RawRow } from '../lib/imports/shared.ts';

const seed = (): WorkspaceData => JSON.parse(JSON.stringify(seedData));

void test('1. Schema Signature Matching & Auto-Detection', () => {
  // Shopee Payment Order Headers
  const shopeeHeaders = ['Payment Order ID', 'Purchase Value(Rp)', 'Refund Amount(Rp)', 'Order Time'];
  const shopeeDetection = detectFileSchema(shopeeHeaders);
  assert.equal(shopeeDetection.marketplace, 'Shopee');
  assert.equal(shopeeDetection.fileType, 'SHOPEE_PAYMENT_ORDER');
  assert.equal(shopeeDetection.confidence, 'HIGH');
  assert.equal(shopeeDetection.drift.hasDrift, false);

  // TikTok Payment Order Headers
  const tiktokHeaders = ['Payment Order ID', 'Payment Amount', 'Payment time', 'Creator Username'];
  const tiktokDetection = detectFileSchema(tiktokHeaders);
  assert.equal(tiktokDetection.marketplace, 'TikTok');
  assert.equal(tiktokDetection.fileType, 'TIKTOK_PAYMENT_ORDER');
  assert.equal(tiktokDetection.confidence, 'HIGH');
  assert.equal(tiktokDetection.drift.hasDrift, false);

  // Stock Export Headers
  const stockHeaders = ['product_id', 'stock_quantity', 'marketplace', 'snapshot_at'];
  const stockDetection = detectFileSchema(stockHeaders);
  assert.equal(stockDetection.fileType, 'STOCK_EXPORT');
  assert.equal(stockDetection.confidence, 'HIGH');

  // Unknown Headers
  const unknownDetection = detectFileSchema(['Column A', 'Column B', 'Column C']);
  assert.equal(unknownDetection.marketplace, 'Unknown');
  assert.equal(unknownDetection.fileType, 'UNKNOWN');
  assert.equal(unknownDetection.confidence, 'LOW');
});

void test('2. Schema Drift Detection', () => {
  // Shopee headers missing required 'Order Time' and adding 'New Marketplace Promo Field'
  const driftedHeaders = [
    'Payment Order ID',
    'Purchase Value(Rp)',
    'Refund Amount(Rp)',
    // Missing: 'Order Time'
    'New Marketplace Promo Field', // Extra column
  ];

  const detection = detectFileSchema(driftedHeaders);
  assert.equal(detection.drift.hasDrift, true, 'Schema drift detected');
  assert.ok(detection.drift.addedColumns.includes('New Marketplace Promo Field'), 'Identifies added column');
  assert.ok(detection.drift.missingColumns.includes('Order Time'), 'Identifies missing column');
});

void test('3. Period Extraction from Raw CSV Rows', () => {
  const mockRows: RawRow[] = [
    { date: '2026-09-01', order_id: '101', gmv: '150000' },
    { date: '2026-09-05', order_id: '102', gmv: '200000' },
    { date: '2026-09-14', order_id: '103', gmv: '350000' },
  ];

  const mapping = { date: 'date' };
  const period = extractPeriodCoverage(mockRows, mapping);

  assert.equal(period.periodStart, '2026-09-01');
  assert.equal(period.periodEnd, '2026-09-14');
  assert.equal(period.validDatesCount, 3);
});

void test('4. Multi-File Batch Analyzer', async () => {
  const data = seed();
  const shopeeContent = 'Payment Order ID,Purchase Value(Rp),Refund Amount(Rp),Order Time\nORD123,100000,0,2026-09-10';
  const tiktokContent = 'Payment Order ID,Payment Amount,Payment time,Creator Username\nTT456,200000,2026-09-11,@affiliate2';

  const file1 = new File([shopeeContent], 'shopee_export_sep.csv', { type: 'text/csv' });
  const file2 = new File([tiktokContent], 'tiktok_orders.csv', { type: 'text/csv' });

  const batchSummary = await analyzeBatch([file1, file2], data);
  assert.equal(batchSummary.totalFiles, 2);

  const shopeeFile = batchSummary.files.find((f) => f.file.name === 'shopee_export_sep.csv');
  assert.ok(shopeeFile);
  assert.equal(shopeeFile?.marketplace, 'Shopee');
  assert.equal(shopeeFile?.fileType, 'SHOPEE_PAYMENT_ORDER');
  assert.equal(shopeeFile?.confidence, 'HIGH');

  const tiktokFile = batchSummary.files.find((f) => f.file.name === 'tiktok_orders.csv');
  assert.ok(tiktokFile);
  assert.equal(tiktokFile?.marketplace, 'TikTok');
  assert.equal(tiktokFile?.fileType, 'TIKTOK_PAYMENT_ORDER');
});

void test('5. Overlapping Period Reconciliation Engine', () => {
  const data = seed();
  const acc = data.shopee_accounts[0];

  // Mock existing row in data
  data.shopee_performance = [
    {
      id: 'existing-1',
      date: '2026-09-01',
      account_id: acc.id,
      campaign_id: 'c1',
      source_import_id: 'imp1',
      gmv: 500000,
      orders: 5,
      units_sold: 5,
      commission: 25000,
      clicks: 100,
      conversion_rate: 0.05,
    },
  ];

  const incomingRows: RawRow[] = [
    // 1. Existing unchanged
    { date: '2026-09-01', username: acc.username, gmv: '500000' },
    // 2. Existing updated
    { date: '2026-09-01', username: acc.username, gmv: '650000' },
    // 3. New record
    { date: '2026-09-02', username: acc.username, gmv: '400000' },
  ];

  const mapping = { date: 'date', username: 'username', gmv: 'gmv' };
  const reconciliation = reconcileOverlappingRows(incomingRows, mapping, 'Shopee', data);

  assert.equal(reconciliation.newCount, 1, '1 new row detected');
  assert.equal(reconciliation.existingUnchangedCount, 1, '1 unchanged row detected');
  assert.equal(reconciliation.updatedCount, 1, '1 updated row detected');
});

void test('6. Post-Import "What Changed?" Summary Calculation', () => {
  const beforeData = seed();
  const afterData = seed();

  const acc1 = afterData.shopee_accounts[0];
  const acc2 = afterData.shopee_accounts[1];

  beforeData.shopee_performance = [
    { id: 'p1', date: '2026-09-01', account_id: acc1.id, campaign_id: 'c1', source_import_id: 'imp1', gmv: 1000000, orders: 10, units_sold: 10, commission: 50000, clicks: 100, conversion_rate: 0.1 },
  ];

  afterData.shopee_performance = [
    { id: 'p1', date: '2026-09-01', account_id: acc1.id, campaign_id: 'c1', source_import_id: 'imp1', gmv: 1000000, orders: 10, units_sold: 10, commission: 50000, clicks: 100, conversion_rate: 0.1 },
    { id: 'p2', date: '2026-09-02', account_id: acc2.id, campaign_id: 'c1', source_import_id: 'imp2', gmv: 2500000, orders: 20, units_sold: 20, commission: 125000, clicks: 200, conversion_rate: 0.1 },
  ];

  const summary = computeWhatChangedSummary(beforeData, afterData, 'Shopee');
  assert.equal(summary.gmvDelta, 2500000, 'GMV delta matches new row');
  assert.equal(summary.newCreatorsWithSales, 1, '1 new active creator detected');
  assert.equal(summary.coverageEndDate, '2026-09-02');
  assert.ok(summary.summaryBulletPoints.length >= 2);
});

void test('7. Data Coverage Calendar & H-2 Readiness Evaluator', () => {
  const data = seed();
  data.shopee_performance = [
    { id: 'p1', date: '2026-09-01', account_id: 'acc-1', campaign_id: 'c1', source_import_id: 'imp1', gmv: 100000, orders: 1, units_sold: 1, commission: 5000, clicks: 10, conversion_rate: 0.1 },
    { id: 'p2', date: '2026-09-20', account_id: 'acc-1', campaign_id: 'c1', source_import_id: 'imp1', gmv: 200000, orders: 2, units_sold: 2, commission: 10000, clicks: 20, conversion_rate: 0.1 },
  ];

  // Evaluate as of 2026-09-22 -> H-2 target is 2026-09-20 -> Should be H-2 Ready!
  const readyCov = getWorkspaceDataCoverage(data, 'Shopee', '2026-09-22');
  assert.equal(readyCov.isH2Ready, true, 'Data ending 2026-09-20 is H-2 ready as of 2026-09-22');
  assert.equal(readyCov.missingDaysCount, 0);

  // Evaluate as of 2026-09-25 -> H-2 target is 2026-09-23 -> Behind by 3 days!
  const behindCov = getWorkspaceDataCoverage(data, 'Shopee', '2026-09-25');
  assert.equal(behindCov.isH2Ready, false, 'Data ending 2026-09-20 is NOT H-2 ready as of 2026-09-25');
  assert.equal(behindCov.missingDaysCount, 3);
});

void test('8. Operational Intelligence H-2 Readiness Rule', () => {
  const data = seed();
  // Clear performance data so coverage is missing
  data.shopee_performance = [];
  data.tiktok_performance = [];

  const actions = generateOperationalActions(data, new Date('2026-09-23'));

  const shopeeAction = actions.find((a) => a.rule_id === 'DATA_COVERAGE_SHOPEE_MISSING');
  assert.ok(shopeeAction, 'Generated DATA_COVERAGE_SHOPEE_MISSING action');
  assert.equal(shopeeAction?.priority, 'P1');
  assert.equal(shopeeAction?.category, 'Data Coverage');

  const tiktokAction = actions.find((a) => a.rule_id === 'DATA_COVERAGE_TIKTOK_MISSING');
  assert.ok(tiktokAction, 'Generated DATA_COVERAGE_TIKTOK_MISSING action');
  assert.equal(tiktokAction?.priority, 'P1');
});

void test('9. Provider Adapters Status Enforcement & File-Import Message', async () => {
  const data = seed();

  const shopeeStatus = getWorkspaceConnectionStatus(data, 'shopee');
  assert.equal(shopeeStatus, 'FILE_IMPORT', 'Shopee integration status returns FILE_IMPORT');

  const tiktokStatus = getWorkspaceConnectionStatus(data, 'tiktok');
  assert.equal(tiktokStatus, 'FILE_IMPORT', 'TikTok integration status returns FILE_IMPORT');

  await assert.rejects(
    async () => {
      await shopeeAdapter.fetchRecords('PERFORMANCE', { start: '2026-09-01', end: '2026-09-07' });
    },
    /DIRECT API NOT USED/i,
    'Shopee fetchRecords throws direct API not used error',
  );

  await assert.rejects(
    async () => {
      await tiktokAdapter.fetchRecords('PERFORMANCE', { start: '2026-09-01', end: '2026-09-07' });
    },
    /DIRECT API NOT USED/i,
    'TikTok fetchRecords throws direct API not used error',
  );
});
