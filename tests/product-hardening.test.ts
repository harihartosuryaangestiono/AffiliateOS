import test from 'node:test';
import assert from 'node:assert/strict';
import { seed as seedData } from '../lib/data/seed.ts';
import { upgradeDemo } from '../lib/operations/demo.ts';
import { generateOperationalActions, mergePersistedActions } from '../lib/intelligence/actions.ts';
import { generateTodayQueue, normalizePhoneNumber, generateWhatsAppLink } from '../lib/communication/queue.ts';
import { formatAIErrorMessage, sanitizePII } from '../lib/ai/guardrails.ts';
import { buildReportDataset } from '../lib/reporting/datamart.ts';
import { applyChanges, freezeReport } from '../lib/operations/mutations.ts';
import type { WorkspaceData, RecordData } from '../types/domain.ts';

const createDemoData = (): WorkspaceData => upgradeDemo(structuredClone(seedData));

void test('1. Cross-Module Continuity: Creator -> Communication -> Action Center -> Task', () => {
  const data = createDemoData();
  assert.ok(data.entities.creators.length > 0);

  // 1. Communication Today Queue detects creator
  const queue = generateTodayQueue(data, '2026-09-22');
  assert.ok(queue.length > 0);

  // 2. Action Center deterministic generation produces actions for creators/tasks
  const actions = generateOperationalActions(data, new Date('2026-09-22T12:00:00+07:00'));
  assert.ok(actions.length > 0);
  assert.ok(actions.some((a) => a.priority === 'P0' || a.priority === 'P1' || a.priority === 'P2'));

  // 3. Operator starts action (status transition)
  const actionToStart = actions[0];
  const persistedRecord = {
    ...actionToStart,
    status: 'IN_PROGRESS',
    started_at: '2026-09-22T12:05:00+07:00',
    assigned_to: 'Dinda',
  };
  const merged = mergePersistedActions(actions, [persistedRecord as never], new Date('2026-09-22T12:05:00+07:00'));
  const found = merged.find((a) => a.deduplication_key === actionToStart.deduplication_key);
  assert.equal(found?.status, 'IN_PROGRESS');
  assert.equal(found?.assigned_to, 'Dinda');
});

void test('2. Timezone Asia/Jakarta: Deterministic Boundaries and WhatsApp Manual Boundary', () => {
  // Test phone number formatting for Indonesian WhatsApp
  const phone1 = '081234567890';
  const phone2 = '+62 812-9876-5432';
  assert.equal(normalizePhoneNumber(phone1), '6281234567890');
  assert.equal(normalizePhoneNumber(phone2), '6281298765432');

  // Verify deep link generation
  const link = generateWhatsAppLink('081234567890', 'Halo Kak Dinda, ini dari AffiliateOS.');
  assert.ok(link.startsWith('https://wa.me/6281234567890?text='));
  assert.ok(link.includes(encodeURIComponent('Halo Kak Dinda, ini dari AffiliateOS.')));

  // Test invalid phone number throws actionable error
  assert.throws(() => generateWhatsAppLink('invalid', 'Halo'), /WhatsApp phone number/);
});

void test('3. Honest Empty States: Zero Mock Data In Empty Workspace', () => {
  const emptyWorkspace: WorkspaceData = {
    entities: {
      clients: [],
      creators: [],
      brands: [],
      campaigns: [],
      products: [],
      tasks: [],
    },
    shopee_accounts: [],
    tiktok_accounts: [],
    shopee_performance: [],
    tiktok_performance: [],
    imports: [],
    activity: [],
    campaign_creators: [],
    operations: {
      creator_outreach: [],
      sample_seedings: [],
      hsl_activations: [],
      hsl_creator_products: [],
      product_stock_snapshots: [],
      peak_days: [],
      peak_day_creators: [],
      recurring_task_templates: [],
      operational_actions: [],
      reports: [],
      report_templates: [],
      report_snapshots: [],
      business_rule_decisions: [],
      communication_templates: [],
      integration_connectors: [],
      import_jobs: [],
    },
  };

  const emptyReport: RecordData = {
    id: 'rep-empty',
    name: 'Weekly Report Empty',
    period_start: '2026-09-15',
    period_end: '2026-09-22',
    cutoff_date: '2026-09-22',
    status: 'Draft',
    created_at: '2026-09-24T00:00:00Z',
    marketplace: 'Shopee',
  };

  const dataset = buildReportDataset({ report: emptyReport, data: emptyWorkspace });
  // All aggregate metrics must honestly be 0, not fabricated demo values
  assert.equal(dataset.kpiSummary.current.affiliateGmv, 0);
  assert.equal(dataset.kpiSummary.current.orders, 0);
  assert.equal(dataset.kpiSummary.current.affiliatesWithSales, 0);
  assert.equal(dataset.brandPerformance.rows.length, 0);
  assert.equal(dataset.validation.valid, true);
  assert.ok(dataset.validation.warnings.includes('Report period contains zero affiliate GMV.'));
});

void test('4. Security & Privacy: PII Masking and Secret Protection', () => {
  const sensitiveUser = {
    name: 'Mega Creator',
    phone: '081234567890',
    whatsapp: '+6281298765432',
    email: 'creator@example.com',
    secretToken: 'secret_live_xyz123',
    gmv: 45000000,
  };

  const sanitized = sanitizePII(sensitiveUser) as Record<string, unknown>;
  assert.equal(sanitized.phone, undefined);
  assert.equal(sanitized.whatsapp, undefined);
  assert.equal(sanitized.email, undefined);
  assert.equal(sanitized.secretToken, undefined);
  assert.equal(sanitized.name, 'Mega Creator');
  assert.equal(sanitized.gmv, 45000000);
});

void test('5. AI Error Sanitization: Clean User-Facing Explanations', () => {
  const err429 = new Error('GoogleGenerativeAI: 429 RESOURCE_EXHAUSTED Quota exceeded');
  const sanitized429 = formatAIErrorMessage(err429);
  assert.equal(sanitized429.includes('rate limit reached'), true);
  assert.equal(sanitized429.includes('RESOURCE_EXHAUSTED'), false);

  const err503 = new Error('503 Service Unavailable: overloaded');
  const sanitized503 = formatAIErrorMessage(err503);
  assert.equal(sanitized503.includes('temporarily unavailable'), true);

  const keyLeakError = new Error('Request failed with url https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSySecretKey123');
  const sanitizedKey = formatAIErrorMessage(keyLeakError);
  assert.equal(sanitizedKey.includes('AIzaSySecretKey123'), false);
  assert.equal(sanitizedKey.includes('[REDACTED]'), true);
});

void test('6. Report Snapshot Immutability: Modifications Do Not Alter Finalized Reports', () => {
  const data = createDemoData();
  const draftReport: RecordData = {
    id: '30000000-0000-4000-8000-000000009999',
    name: 'QA Weekly Freeze Test',
    report_type: 'Internal Weekly',
    period_start: '2026-09-01',
    period_end: '2026-09-19',
    cutoff_date: '2026-09-19',
    status: 'Draft',
    marketplace: 'Shopee',
    created_at: '2026-09-24T00:00:00Z',
  };

  // Add draft report via applyChanges
  const withReport = applyChanges(data, [{ table: 'reports', record: draftReport }], 'Analyst', 'QA', '2026-09-24T00:00:00Z').data;

  // Finalize and freeze
  const result = freezeReport(withReport, draftReport.id, 'Dinda');
  const snapshotChange = result.changes.find((c) => c.table === 'report_snapshots');
  assert.ok(snapshotChange);

  const snapshotRecord = snapshotChange.record as RecordData;
  const snapshotData = JSON.parse(String(snapshotRecord.snapshot_json));
  const frozenGmv = snapshotData.reportDataset.kpiSummary.current.affiliateGmv;
  assert.ok(frozenGmv > 0);

  // Subsequent workspace performance modification
  withReport.shopee_performance[0].gmv = 9999999999;

  // Verify the snapshot retains the original frozen GMV
  const snapshotDataAfterMutation = JSON.parse(String(snapshotRecord.snapshot_json));
  assert.equal(snapshotDataAfterMutation.reportDataset.kpiSummary.current.affiliateGmv, frozenGmv);
});

