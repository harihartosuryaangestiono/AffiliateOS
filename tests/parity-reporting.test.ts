import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  aggregateHistorical,
  parseDmyDate,
  parseShopeeHistoricalRow,
  parseTikTokHistoricalRow,
} from '../lib/parity/historical.ts';
import { reconcileMetrics } from '../lib/parity/reconcile.ts';
import { buildExcelReport } from '../lib/reporting/excel.ts';
import { buildPowerPointReport } from '../lib/reporting/powerpoint.ts';
import { reportTemplates } from '../lib/reporting/templates.ts';
import type { FrozenReportSnapshot } from '../lib/reporting/snapshot.ts';
import { readFile } from 'node:fs/promises';

void test('historical parsers keep marketplace rules separate, normalize identity and honor cutoff', () => {
  const shopee = [
    parseShopeeHistoricalRow(
      {
        'Order id': 'S-1',
        'Order Status': 'Completed',
        'Verified Status': 'Valid',
        'Order Time': '2026-08-06',
        'Item id': 'I',
        'Model id': 'M',
        'Affiliate Username': ' Creator ',
        'Purchase Value(Rp)': 100000,
        'Refund Amount(Rp)': 25000,
        Qty: 3,
        'Item Brand Commission(Rp)': 5000,
      },
      2,
    )!,
    parseShopeeHistoricalRow(
      {
        'Order id': 'S-2',
        'Order Status': 'Completed',
        'Verified Status': 'Invalid',
        'Order Time': '2026-08-06',
        'Affiliate Username': 'other',
        'Purchase Value(Rp)': 90000,
        'Item Brand Commission(Rp)': 0,
      },
      3,
    )!,
    parseShopeeHistoricalRow(
      {
        'Order id': 'S-3',
        'Order Status': 'Pending',
        'Verified Status': 'Valid',
        'Order Time': '2026-08-07',
        'Affiliate Username': 'future',
        'Purchase Value(Rp)': 70000,
        'Item Brand Commission(Rp)': 1000,
      },
      4,
    )!,
  ];
  const metrics = aggregateHistorical(shopee, {
    start: '2026-08-01',
    end: '2026-08-06',
  });
  assert.equal(metrics.affiliateGmv, 100000); // historical gross Purchase Value, not synthetic net behavior
  assert.equal(metrics.quantity, 1); // historical report counts included order-item rows
  assert.equal(metrics.affiliatesWithSales, 1);
  assert.equal(metrics.totalAffiliates, 2);
  assert.equal(metrics.commission, 5000);
  const tiktok = parseTikTokHistoricalRow(
    {
      'Order ID': 'T-1',
      'Order Status': 'Settled',
      'Fully returned or refunded': 'No',
      'Time Created': '06/08/2026 11:00:00',
      'Creator Username': 'Creator',
      'Actual Commission Base': 80000,
      Quantity: 2,
      'Actual Commission Payment': 4000,
    },
    2,
  )!;
  assert.equal(tiktok.reportingDate, '2026-08-06');
  assert.equal(parseDmyDate('13/08/2026 00:00:00'), '2026-08-13');
  assert.equal(
    aggregateHistorical([tiktok], { start: '2026-08-01', end: '2026-08-06' })
      .affiliateGmv,
    80000,
  );
});

void test('historical aggregation deduplicates order-item keys and preserves multi-item order grain', () => {
  const base = {
    'Order id': 'S-1',
    'Order Status': 'Completed',
    'Verified Status': 'Valid',
    'Order Time': '2026-08-06',
    'Affiliate Username': 'creator',
    'Purchase Value(Rp)': 100,
    'Item Brand Commission(Rp)': 10,
  };
  const first = parseShopeeHistoricalRow(
    { ...base, 'Item id': 'I-1', 'Model id': 'M-1' },
    2,
  )!;
  const duplicate = parseShopeeHistoricalRow(
    { ...base, 'Item id': 'I-1', 'Model id': 'M-1' },
    3,
  )!;
  const secondItem = parseShopeeHistoricalRow(
    {
      ...base,
      'Item id': 'I-2',
      'Model id': 'M-2',
      'Purchase Value(Rp)': 50,
      'Item Brand Commission(Rp)': 5,
    },
    4,
  )!;
  const metrics = aggregateHistorical([first, duplicate, secondItem], {
    start: '2026-08-01',
    end: '2026-08-06',
  });
  assert.equal(metrics.affiliateGmv, 150);
  assert.equal(metrics.orders, 1);
  assert.equal(metrics.quantity, 2);
  assert.equal(metrics.commission, 15);
});

void test('parity harness distinguishes missing source from zero and documents rounding tolerance', () => {
  const actual = {
    affiliateGmv: 100,
    orders: 1,
    quantity: 1,
    affiliatesWithSales: 1,
    totalAffiliates: 1,
    commission: 10.49,
    asp: 100,
    roi: 10,
    costRatio: 0.1,
    storeRevenue: null,
    affiliateContribution: null,
    target: null,
    targetAchievement: null,
  };
  const results = reconcileMetrics({
    marketplace: 'Shopee',
    period: { start: '2026-08-01', end: '2026-08-06' },
    reference: { affiliateGmv: 100, commission: 10, storeRevenue: null },
    actual,
  });
  assert.equal(results[0].status, 'PASS');
  assert.equal(results[1].status, 'PASS');
  assert.equal(results[2].status, 'SOURCE_UNAVAILABLE');
});

const template = reportTemplates.find(
  (item) => item.id === 'shopee-simba-weekly',
)!;
const snapshot: FrozenReportSnapshot = {
  period: { start: '2026-08-01', end: '2026-08-06', cutoff: '2026-08-06' },
  marketplace: 'Shopee',
  metrics: {
    gmv: 23953515,
    orders: 407,
    units: 420,
    affiliates: 176,
    activeCreators: 195,
    commission: 1206226,
    asp: 57032.1785714286,
    roi: 19.858229,
    costRatio: 0.05035699,
    storeRevenue: null,
  },
  narrative: {
    what_went_well: 'GMV remained resilient.',
    issues: 'Stock risk on a hero SKU.',
    next_action: 'Confirm peak-day creator schedule.',
  },
  sources: [
    {
      marketplace: 'Shopee',
      filename: 'historical-validation.xlsx',
      sales_metric: 'Verified Purchase Value',
      period_start: '2026-08-01',
      period_end: '2026-08-06',
      status: 'Validated',
    },
  ],
  finalized_by: 'QA Operator',
  template: { id: template.id, version: template.version, name: template.name },
};

void test('finalized snapshot produces reopenable Excel with frozen KPI, narratives and lineage', async () => {
  const buffer = await buildExcelReport({
    reportName: 'Simba Weekly',
    snapshot,
    template,
    finalizedAt: '2026-09-22T00:00:00Z',
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ['Weekly Performance', 'Source Lineage', 'Report Metadata'],
  );
  assert.equal(
    workbook.getWorksheet('Weekly Performance')!.getCell('B6').value,
    23953515,
  );
  assert.equal(
    workbook.getWorksheet('Source Lineage')!.getCell('B2').value,
    'historical-validation.xlsx',
  );
  assert.equal(
    workbook.getWorksheet('Report Metadata')!.getCell('B4').value,
    '1.0.0',
  );
});

void test('PowerPoint is a valid package and uses the same frozen snapshot values', async () => {
  const buffer = await buildPowerPointReport({
    reportName: 'Simba Weekly',
    snapshot,
    template,
    finalizedAt: '2026-09-22T00:00:00Z',
  });
  const zip = await JSZip.loadAsync(buffer),
    slides = Object.keys(zip.files).filter((name) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(name),
    );
  assert.equal(slides.length, 4);
  const text = (
    await Promise.all(slides.map((name) => zip.file(name)!.async('string')))
  ).join('\n');
  assert.match(text, /23,953,515/);
  assert.match(text, /Stock risk on a hero SKU/);
  assert.match(text, /historical-validation.xlsx/);
});

void test('export endpoint and migration enforce membership-scoped reads, immutable audit and finalized-only export', async () => {
  const route = await readFile(
    new URL('../app/api/reports/[id]/export/route.ts', import.meta.url),
    'utf8',
  );
  const migration = await readFile(
    new URL(
      '../supabase/migrations/202609220001_reporting_v2.sql',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(route, /identity\(\)/);
  assert.match(route, /workspace_id[\s\S]*profile\.workspace_id/);
  assert.match(route, /Finalize the report before exporting/);
  assert.match(route, /report_exports/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /actor_id=auth\.uid\(\)/);
  assert.match(migration, /immutable/);
});
