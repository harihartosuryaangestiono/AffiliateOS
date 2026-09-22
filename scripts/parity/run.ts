import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  aggregateHistorical,
  parseShopeeHistoricalRow,
  parseTikTokHistoricalRow,
  type SourceRow,
} from '../../lib/parity/historical.ts';
import { reconcileMetrics } from '../../lib/parity/reconcile.ts';

const args = process.argv.slice(2),
  workbookArg = args.find((arg) => !arg.startsWith('--'));
if (!workbookArg)
  throw new Error(
    'Usage: npm run parity -- <Catatan Dinda workbook.xlsx> [--out directory]',
  );
const outFlag = args.indexOf('--out'),
  outDir = path.resolve(outFlag >= 0 ? args[outFlag + 1] : 'artifacts/parity');
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(path.resolve(workbookArg), {
  ignoreNodes: [
    'dataValidations',
    'extLst',
    'drawing',
    'picture',
    'tableParts',
  ],
});
const toRows = (sheetName: string) => {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error(`Missing worksheet: ${sheetName}`);
  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map(String);
  const rows: SourceRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = (row.values as unknown[]).slice(1),
      item: SourceRow = {};
    headers.forEach((header, index) => (item[header] = values[index]));
    rows.push(item);
  });
  return rows;
};
const shopee = toRows('Raw - Shopee')
  .map((row, index) => parseShopeeHistoricalRow(row, index + 2))
  .filter((row) => row !== null);
const tiktok = toRows('Raw - TikTok')
  .map((row, index) => parseTikTokHistoricalRow(row, index + 2))
  .filter((row) => row !== null);
const period = { start: '2026-08-01', end: '2026-08-06' };
const suites = [
  {
    marketplace: 'Shopee' as const,
    actual: aggregateHistorical(shopee, period),
    reference: {
      affiliateGmv: 23953515,
      quantity: 420,
      totalAffiliates: 195,
      affiliatesWithSales: 176,
      commission: 1206226,
      asp: 57032.1785714286,
      roi: 19.858229,
      costRatio: 0.05035699,
    },
  },
  {
    marketplace: 'TikTok' as const,
    actual: aggregateHistorical(tiktok, period),
    reference: {
      affiliateGmv: 21530544,
      quantity: 455,
      totalAffiliates: 131,
      affiliatesWithSales: 119,
      commission: 1399944,
      asp: 47319.8769230769,
      roi: 15.379575,
      costRatio: 0.0650213,
    },
  },
];
const results = suites.flatMap((suite) =>
  reconcileMetrics({
    marketplace: suite.marketplace,
    period,
    reference: suite.reference,
    actual: suite.actual,
    percentageTolerance: 0.000001,
  }),
);
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(
  path.join(outDir, 'parity-results.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      workbook: path.basename(workbookArg),
      period,
      results,
    },
    null,
    2,
  ),
);
const lines = [
  '# AffiliateOS historical parity',
  '',
  `Period: ${period.start} → ${period.end}`,
  '',
  '| Marketplace | Metric | Reference | AffiliateOS | Delta | Status |',
  '| --- | --- | ---: | ---: | ---: | --- |',
  ...results.map(
    (r) =>
      `| ${r.marketplace} | ${r.metric} | ${r.reference ?? 'Source unavailable'} | ${r.actual ?? 'Source unavailable'} | ${r.delta ?? '—'} | ${r.status} |`,
  ),
];
await fs.writeFile(
  path.join(outDir, 'parity-results.md'),
  `${lines.join('\n')}\n`,
);
console.log(lines.join('\n'));
if (results.some((result) => result.status === 'INVESTIGATE'))
  process.exitCode = 2;
