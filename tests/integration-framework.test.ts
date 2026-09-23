import test from 'node:test';
import assert from 'node:assert/strict';
import { seed as seedData } from '../lib/data/seed.ts';
import { getConnectorRegistry, getWorkspaceConnectionStatus } from '../lib/integrations/registry.ts';
import { executeSyncRun, generatePayloadFingerprint } from '../lib/integrations/sync.ts';
import { normalizeIngestionPayload } from '../lib/integrations/normalization.ts';
import { getFreshnessStatus, checkStaleDataAlerts } from '../lib/integrations/health.ts';
import { normalizeReportDetailed } from '../lib/imports/normalize.ts';
import type { WorkspaceData, ImportJob } from '../types/domain.ts';

const seed = (): WorkspaceData => JSON.parse(JSON.stringify(seedData));

void test('1. Connector Registry & Provider Capabilities', () => {
  const registry = getConnectorRegistry();
  assert.ok(registry.has('shopee'), 'Shopee connector registered');
  assert.ok(registry.has('tiktok'), 'TikTok connector registered');
  assert.ok(registry.has('mock-test'), 'Mock Test connector registered');

  const shopee = registry.get('shopee')!;
  assert.equal(shopee.marketplace, 'Shopee');
  assert.ok(shopee.capabilities.includes('PERFORMANCE'));
  assert.ok(shopee.capabilities.includes('ORDERS'));

  const tiktok = registry.get('tiktok')!;
  assert.equal(tiktok.marketplace, 'TikTok');
  assert.ok(tiktok.capabilities.includes('PERFORMANCE'));
  assert.ok(tiktok.capabilities.includes('CREATORS'));
});

void test('2. Live Credentials Safety & Status Resolution', () => {
  const data = seed();

  // Live adapters without env keys MUST report NOT_CONFIGURED
  const shopeeStatus = getWorkspaceConnectionStatus(data, 'shopee');
  assert.equal(shopeeStatus, 'NOT_CONFIGURED', 'Uncredentialed Shopee returns NOT_CONFIGURED');

  const tiktokStatus = getWorkspaceConnectionStatus(data, 'tiktok');
  assert.equal(tiktokStatus, 'NOT_CONFIGURED', 'Uncredentialed TikTok returns NOT_CONFIGURED');

  // Mock provider returns HEALTHY
  const mockStatus = getWorkspaceConnectionStatus(data, 'mock-test');
  assert.equal(mockStatus, 'HEALTHY', 'Mock provider returns HEALTHY status');
});

void test('3. Sync Execution Engine & Lifecycle (Mock Provider)', async () => {
  let data = seed();

  const { nextData, result } = await executeSyncRun(data, {
    providerId: 'mock-test',
    capability: 'PERFORMANCE',
    period: { start: '2026-09-01', end: '2026-09-07' },
    triggerType: 'MANUAL',
    actorName: 'Test Suite',
  });

  assert.equal(result.success, true, 'Sync run succeeded');
  assert.equal(result.syncRun.status, 'SUCCEEDED');
  assert.equal(result.syncRun.provider, 'mock-test');
  assert.ok(result.syncRun.fetched_records > 0, 'Fetched records > 0');
  assert.ok(result.syncRun.normalized_records > 0, 'Normalized records > 0');

  // Verify sync run recorded in workspace data
  data = nextData;
  const runs = data.operations?.integration_sync_runs || [];
  assert.ok(runs.some((r) => r.id === result.syncRun.id), 'Sync run persisted in operations data');
});

void test('4. Idempotency & Cooldown Enforcement', async () => {
  const data = seed();

  // Run with STOCK capability to test cooldown independently
  await executeSyncRun(data, {
    providerId: 'mock-test',
    capability: 'STOCK',
    period: { start: '2026-09-01', end: '2026-09-07' },
    triggerType: 'MANUAL',
  });

  // Immediate rerun should trigger cooldown error
  await assert.rejects(
    async () => {
      await executeSyncRun(data, {
        providerId: 'mock-test',
        capability: 'STOCK',
        period: { start: '2026-09-01', end: '2026-09-07' },
        triggerType: 'MANUAL',
      });
    },
    /cooldown/i,
    'Immediate rerun throws cooldown error',
  );

  // Test fingerprint generation consistency
  const fp1 = generatePayloadFingerprint('mock-test', 'PERFORMANCE', [{ id: '1', date: '2026-09-01' }]);
  const fp2 = generatePayloadFingerprint('mock-test', 'PERFORMANCE', [{ id: '1', date: '2026-09-01' }]);
  assert.equal(fp1, fp2, 'Identical payloads generate identical fingerprint');
});

void test('5. Error Classification & Blocked Credentials', async () => {
  const data = seed();

  const { result } = await executeSyncRun(data, {
    providerId: 'shopee',
    capability: 'PERFORMANCE',
    period: { start: '2026-09-01', end: '2026-09-07' },
  });

  assert.equal(result.success, false, 'Uncredentialed Shopee sync fails safely');
  assert.equal(result.syncRun.status, 'FAILED');
  assert.equal(result.syncRun.error_code, 'AUTH');
  assert.ok(result.syncRun.error_summary?.includes('BLOCKED'), 'Error summary contains BLOCKED');
});

void test('6. Data Freshness & Stale Alerts', () => {
  const data = seed();

  const shopeeFresh = getFreshnessStatus(data, 'Shopee');
  assert.ok(shopeeFresh.status === 'FRESH' || shopeeFresh.status === 'WARNING' || shopeeFresh.status === 'STALE');

  const tiktokFresh = getFreshnessStatus(data, 'TikTok');
  assert.ok(tiktokFresh.status === 'FRESH' || tiktokFresh.status === 'WARNING' || tiktokFresh.status === 'STALE');

  // Test alert generator
  const alerts = checkStaleDataAlerts(data);
  assert.ok(Array.isArray(alerts), 'Returns array of alerts');
});

void test('7. Critical Equivalence Test: Manual File vs Connector Payload', () => {
  const data = seed();
  data.tiktok_performance = []; // Clear existing performance rows to test ingestion equivalence

  const ttAccount = data.tiktok_accounts[0];
  const ttCampaign = data.entities.campaigns.find(
    (c) => String(c.marketplace) === 'TikTok' || String(c.marketplace) === 'Multi-platform',
  );

  assert.ok(ttAccount, 'TikTok account exists in seed');
  assert.ok(ttCampaign, 'TikTok/Multi-platform campaign exists in seed');

  // 1. Manual File Ingestion (Raw CSV rows)
  const manualRows = [
    {
      Date: '2026-10-01',
      Username: ttAccount.username,
      'Affiliate GMV': '1000000',
      Orders: '10',
      'Units Sold': '12',
      Commission: '100000',
      Videos: '2',
      Lives: '1',
    },
  ];

  const mapping = {
    date: 'Date',
    username: 'Username',
    gmv: 'Affiliate GMV',
    orders: 'Orders',
    units_sold: 'Units Sold',
    commission: 'Commission',
    video_count: 'Videos',
    live_count: 'Lives',
    __campaign_id: ttCampaign.id,
  };

  const job: ImportJob = {
    id: 'import-test-1',
    marketplace: 'TikTok',
    filename: 'test-report.csv',
    created_at: '2026-10-01T00:00:00Z',
    rows: 1,
    successful_rows: 1,
    failed_rows: 0,
    status: 'Completed',
  };

  const manualResult = normalizeReportDetailed(data, 'TikTok', manualRows, mapping, job);
  assert.equal(manualResult.normalized.length, 1, 'Manual file yields 1 normalized record');
  const manualPerf = manualResult.normalized[0];

  // 2. Connector API Ingestion Payload (JSON payload from connector adapter)
  const apiPayload = [
    {
      date: '2026-10-01',
      username: ttAccount.username,
      campaign_id: ttCampaign.id,
      gmv: 1000000,
      orders: 10,
      units_sold: 12,
      commission: 100000,
      video_count: 2,
      live_count: 1,
    },
  ];

  const connectorResult = normalizeIngestionPayload({
    marketplace: 'TikTok',
    records: apiPayload,
    sourceId: 'sync-test-1',
    sourceType: 'API_SYNC',
    workspaceData: data,
  });

  assert.equal(connectorResult.performanceRows.length, 1, 'Connector payload yields 1 normalized record');
  const connectorPerf = connectorResult.performanceRows[0];

  // 3. Strict Equivalence Assertion
  assert.equal(manualPerf.date, connectorPerf.date, 'Dates match');
  assert.equal(manualPerf.account_id, connectorPerf.account_id, 'Account IDs match');
  assert.equal(manualPerf.campaign_id, connectorPerf.campaign_id, 'Campaign IDs match');
  assert.equal(manualPerf.gmv, connectorPerf.gmv, 'GMV values match');
  assert.equal(manualPerf.orders, connectorPerf.orders, 'Order counts match');
  assert.equal(manualPerf.units_sold, connectorPerf.units_sold, 'Units sold match');
  assert.equal(manualPerf.commission, connectorPerf.commission, 'Commissions match');
});
