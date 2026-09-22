import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { seed } from '../lib/data/seed.ts';
import { upgradeDemo } from '../lib/operations/demo.ts';
import { freezeReport } from '../lib/operations/mutations.ts';
import {
  applicableBusinessRules,
  metricConfirmationStatus,
  resolveBusinessRule,
  snapshotMetricStatus,
} from '../lib/reporting/business-rules.ts';
import type { RecordData, WorkspaceData } from '../types/domain.ts';

const id = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const rule = (n: number, values: Partial<RecordData> = {}): RecordData => ({
  id: id(n), name: 'GMV rule', status: 'CONFIRMED', created_at: '2026-01-01T00:00:00Z',
  rule_key: 'BQ-X', canonical_metric_id: 'shopee.affiliate_gmv', marketplace: 'Shopee',
  scope_type: 'GLOBAL', version: 1, effective_from: '2026-01-01', selected_definition: 'NET_REFUND',
  ...values,
});
const context = { canonicalMetricId: 'shopee.affiliate_gmv', marketplace: 'Shopee', asOf: '2026-09-01', clientId: id(90), templateId: 'weekly' };

void test('business rules resolve by scope, effective date and version', () => {
  const rules = [
    rule(1),
    rule(2, { scope_type: 'MARKETPLACE', version: 2, selected_definition: 'GROSS_VERIFIED' }),
    rule(3, { scope_type: 'CLIENT', client_id: id(90), version: 3, selected_definition: 'CLIENT_RULE' }),
    rule(4, { scope_type: 'REPORT_TEMPLATE', report_template_id: 'weekly', version: 4, selected_definition: 'TEMPLATE_RULE' }),
    rule(5, { scope_type: 'REPORT_TEMPLATE', report_template_id: 'weekly', version: 5, effective_from: '2026-10-01', selected_definition: 'FUTURE' }),
  ];
  assert.equal(resolveBusinessRule(rules, context)?.selected_definition, 'TEMPLATE_RULE');
  assert.equal(applicableBusinessRules(rules, context)[0].id, id(4));
});

void test('superseded decisions remain effective for their historical date range', () => {
  const historical = rule(1, { status: 'SUPERSEDED', effective_until: '2026-09-30' });
  const next = rule(2, { status: 'OPEN', selected_definition: null, version: 2, effective_from: '2026-10-01', supersedes_id: id(1) });
  assert.equal(resolveBusinessRule([historical, next], context)?.id, id(1));
  assert.equal(metricConfirmationStatus([historical, next], { ...context, asOf: '2026-10-01' }), 'BUSINESS CONFIRMATION REQUIRED');
});

void test('open and deferred rules require confirmation while missing rules remain provisional', () => {
  assert.equal(metricConfirmationStatus([rule(1, { status: 'OPEN', selected_definition: null, effective_from: null })], context), 'BUSINESS CONFIRMATION REQUIRED');
  assert.equal(metricConfirmationStatus([rule(1, { status: 'DEFERRED', selected_definition: null })], context), 'BUSINESS CONFIRMATION REQUIRED');
  assert.equal(metricConfirmationStatus([], context), 'PROVISIONAL');
  assert.equal(metricConfirmationStatus([rule(1)], context), 'CONFIRMED');
});

void test('report finalization freezes rule metadata and old snapshots remain readable', () => {
  const data: WorkspaceData = upgradeDemo(structuredClone(seed));
  const report = rule(99, { name:'Test report', report_type:'Internal Weekly', marketplace:'Shopee', period_start:'2026-09-01', period_end:'2026-09-07', cutoff_date:'2026-09-07', status:'Draft' });
  data.operations!.reports = [report];
  data.operations!.business_rules = [rule(1, { effective_from: '2025-01-01' })];
  const result = freezeReport(data, report.id, 'Admin', '2026-09-22T00:00:00Z');
  const frozenChange = result.changes.find((change) => change.table === 'report_snapshots');
  assert.ok(frozenChange);
  const snapshot = JSON.parse(String((frozenChange.record as RecordData).snapshot_json));
  assert.equal(snapshot.business_rules[0].selectedDefinition, 'NET_REFUND');
  assert.equal(snapshot.business_rules[0].version, 1);
  assert.equal(snapshotMetricStatus(snapshot, 'shopee.affiliate_gmv'), 'CONFIRMED');
  assert.equal(snapshotMetricStatus({ metrics: {} } as never, 'shopee.affiliate_gmv'), 'PROVISIONAL');
});

void test('database and API enforce workspace RLS, Admin decisions, server actor and immutable versions', async () => {
  const migration = await readFile(new URL('../supabase/migrations/202609220002_business_rule_confirmations.sql', import.meta.url), 'utf8');
  const route = await readFile(new URL('../app/api/business-rules/route.ts', import.meta.url), 'utf8');
  assert.match(migration, /enable row level security/);
  assert.match(migration, /public\.current_role\(\)='Admin'/);
  assert.match(migration, /new\.confirmed_by=auth\.uid\(\)/);
  assert.match(migration, /definition='UNRESOLVED'/);
  assert.match(migration, /Decided business rules are immutable/);
  assert.match(migration, /Business rule confirmed/);
  assert.match(route, /profile\.role !== 'Admin'/);
  assert.doesNotMatch(route, /confirmed_by/);
});

void test('production Shopee import remains net of refunds pending BQ-01', async () => {
  const source = await readFile(new URL('../lib/imports/shopee.ts', import.meta.url), 'utf8');
  assert.match(source, /gmv=purchase-refund/);
});
