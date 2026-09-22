import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { seed } from '../lib/data/seed.ts';
import { upgradeDemo } from '../lib/operations/demo.ts';
import { freezeReport } from '../lib/operations/mutations.ts';
import { buildReportDataset } from '../lib/reporting/datamart.ts';
import { aggregateBrandPerformance, getBrandMappings } from '../lib/reporting/brand-mapping.ts';
import { buildAnyMindPowerPoint } from '../lib/reporting/template-powerpoint.ts';
import { buildExcelReport } from '../lib/reporting/excel.ts';
import { reportTemplates } from '../lib/reporting/templates.ts';
import type { RecordData, WorkspaceData } from '../types/domain.ts';

const demoData = upgradeDemo(structuredClone(seed));

const mockReport: RecordData = {
  id: '70000000-0000-4000-8000-000000000001',
  name: 'Haleon Weekly Review',
  status: 'Draft',
  created_at: new Date().toISOString(),
  report_type: 'Haleon Weekly',
  marketplace: 'Shopee',
  period_start: '2026-09-01',
  period_end: '2026-09-20',
  cutoff_date: '2026-09-20',
  what_went_well: 'Solid performance across Scott\'s and Sensodyne.',
  issues: 'Stock risk on Polident.',
  next_action: 'Confirm Peak Day creator locks.',
};

void test('buildReportDataset generates immutable schema 1.0.0 dataset with deferred business confirmations', () => {
  const dataset = buildReportDataset({ report: mockReport, data: demoData });

  assert.equal(dataset.schemaVersion, '1.0.0');
  assert.equal(dataset.businessConfirmationNote, 'Human Business Confirmations: DEFERRED BY USER');
  assert.ok(dataset.kpiSummary.current.affiliateGmv! > 0);
  assert.ok(Array.isArray(dataset.timeSeries));
  assert.equal(dataset.funnel.classification, 'PARTIALLY_SUPPORTED');
  assert.ok(dataset.brandPerformance.rows.length > 0);
  assert.equal(dataset.slideReadiness.length, 7);
});

void test('brand mapping aggregates product performance without altering raw names', () => {
  const mappings = getBrandMappings(demoData);
  assert.ok(mappings.length > 0);
  assert.ok(mappings.every((m) => ['mapped', 'unmapped', 'ambiguous'].includes(m.status)));

  const brandRows = aggregateBrandPerformance(demoData.shopee_performance, demoData, 2500000000);
  assert.ok(brandRows.length > 0);
  assert.ok(brandRows[0].gmv > 0);
  assert.ok(brandRows[0].brand_name.length > 0);
});

void test('freezeReport embeds reportDataset into snapshot_json', () => {
  const testWorkspaceData: WorkspaceData = {
    ...demoData,
    operations: {
      ...demoData.operations,
      reports: [mockReport],
    },
  };

  const result = freezeReport(testWorkspaceData, mockReport.id, 'Test Operator');
  const snapshotRecord = result.changes.find((c) => c.table === 'report_snapshots')!.record as RecordData;
  const frozen = JSON.parse(String(snapshotRecord.snapshot_json));

  assert.ok(frozen.reportDataset);
  assert.equal(frozen.reportDataset.schemaVersion, '1.0.0');
  assert.equal(frozen.reportDataset.businessConfirmationNote, 'Human Business Confirmations: DEFERRED BY USER');
});

void test('PowerPoint export generates valid deck, verifies template hash, updates slides, and prunes unsupported Slide 19', async () => {
  const sourcePath = path.join(process.cwd(), 'report-templates/private/anymind-haleon-weekly-v1.pptx');
  const original = await fs.readFile(sourcePath);
  const hashBefore = crypto.createHash('sha256').update(original).digest('hex');

  const template = reportTemplates.find((t) => t.id === 'anymind-haleon-weekly-v1')!;
  const dataset = buildReportDataset({ report: mockReport, data: demoData });

  const snapshot = {
    period: { start: String(mockReport.period_start), end: String(mockReport.period_end), cutoff: String(mockReport.cutoff_date) },
    marketplace: String(mockReport.marketplace),
    metrics: { affiliateGmv: 2500000000, commission: 250000000, roi: 10, costRatio: 0.1, affiliatesWithSales: 150, orders: 3000, quantity: 4500 },
    narrative: { what_went_well: String(mockReport.what_went_well), issues: String(mockReport.issues), next_action: String(mockReport.next_action) },
    reportDataset: dataset as unknown as Record<string, unknown>,
  };

  const pptBuffer = await buildAnyMindPowerPoint({
    reportName: String(mockReport.name),
    snapshot,
    template,
    finalizedAt: '2026-09-23T00:00:00Z',
  });

  // Verify template hash unchanged after generation
  const afterOriginal = await fs.readFile(sourcePath);
  const hashAfter = crypto.createHash('sha256').update(afterOriginal).digest('hex');
  assert.equal(hashBefore, hashAfter);
  assert.equal(hashBefore, template.sourceHash);

  // Inspect generated PowerPoint zip
  const zip = await JSZip.loadAsync(pptBuffer);

  // Slide 19 should be pruned
  assert.equal(zip.file('ppt/slides/slide19.xml'), null);

  // Slide 21 should be included
  assert.ok(zip.file('ppt/slides/slide21.xml') !== null);

  // Check presentation.xml slide list count
  const presXml = await zip.file('ppt/presentation.xml')!.async('string');
  assert.ok(presXml.includes('<p:sldIdLst>'));
  assert.ok(!presXml.includes('slide19.xml'));

  // Ensure logo image is retained
  assert.ok(zip.file('ppt/media/image4.png') !== null || zip.file('ppt/media/image5.png') !== null);
});

void test('Excel export shares identical frozen reportDataset content', async () => {
  const template = reportTemplates.find((t) => t.id === 'anymind-haleon-weekly-v1')!;
  const dataset = buildReportDataset({ report: mockReport, data: demoData });

  const snapshot = {
    period: { start: String(mockReport.period_start), end: String(mockReport.period_end), cutoff: String(mockReport.cutoff_date) },
    marketplace: String(mockReport.marketplace),
    metrics: { affiliateGmv: 2500000000, commission: 250000000, roi: 10, costRatio: 0.1, affiliatesWithSales: 150, orders: 3000, quantity: 4500 },
    narrative: { what_went_well: String(mockReport.what_went_well), issues: String(mockReport.issues), next_action: String(mockReport.next_action) },
    reportDataset: dataset as unknown as Record<string, unknown>,
  };

  const excelBuffer = await buildExcelReport({
    reportName: String(mockReport.name),
    snapshot,
    template,
    finalizedAt: '2026-09-23T00:00:00Z',
  });

  assert.ok(excelBuffer.length > 0);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelBuffer);

  assert.ok(workbook.getWorksheet('Time Series') !== null);
  assert.ok(workbook.getWorksheet('Brand Performance') !== null);
});
