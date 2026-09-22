import ExcelJS from 'exceljs';
import type { ReportTemplate } from './templates.ts';
import {
  metricLabels,
  snapshotMetric,
  snapshotWithTemplate,
  type FrozenReportSnapshot,
} from './snapshot.ts';

const blue = 'FF1167B1',
  pale = 'FFEAF3FB',
  navy = 'FF12233F',
  green = 'FF15A66A';
export async function buildExcelReport(input: {
  reportName: string;
  snapshot: FrozenReportSnapshot;
  template: ReportTemplate;
  finalizedAt: string;
}) {
  const snapshot = snapshotWithTemplate(input.snapshot, input.template);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AffiliateOS';
  workbook.created = new Date(input.finalizedAt);
  const sheet = workbook.addWorksheet('Weekly Performance', {
    views: [{ state: 'frozen', ySplit: 5 }],
  });
  sheet.properties.defaultRowHeight = 20;
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    printArea: 'A1:D30',
  };
  sheet.columns = [{ width: 34 }, { width: 23 }, { width: 23 }, { width: 42 }];
  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = input.reportName;
  sheet.getCell('A1').font = {
    size: 20,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  sheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: navy },
  };
  sheet.getCell('A1').alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 34;
  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value =
    `${snapshot.marketplace} · ${snapshot.period.start} — ${snapshot.period.end}`;
  sheet.getCell('A2').font = { color: { argb: blue }, bold: true };
  sheet.getRow(4).values = [
    'Metric',
    'Finalized value',
    'Status',
    'Definition',
  ];
  sheet.getRow(4).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blue } };
  });
  const currency = new Set([
    'affiliateGmv',
    'commission',
    'asp',
    'storeRevenue',
    'target',
  ]);
  const percentage = new Set([
    'costRatio',
    'affiliateContribution',
    'targetAchievement',
    'growth',
  ]);
  input.template.metricOrder.forEach((key, index) => {
    const row = sheet.getRow(index + 5),
      value = snapshotMetric(snapshot, key);
    row.values = [
      metricLabels[key] || key,
      value,
      value === null ? 'Source unavailable' : 'Frozen',
      metricDefinition(key),
    ];
    row.getCell(2).numFmt = currency.has(key)
      ? '[$Rp-id-ID] #,##0'
      : percentage.has(key)
        ? '0.0%'
        : key === 'roi'
          ? '0.00x'
          : '#,##0';
    if (percentage.has(key) && value !== null && Math.abs(value) > 1)
      row.getCell(2).value = value / 100;
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: index % 2 ? 'FFFFFFFF' : pale },
    };
  });
  const narrativeStart = input.template.metricOrder.length + 7;
  sheet.mergeCells(`A${narrativeStart}:D${narrativeStart}`);
  sheet.getCell(`A${narrativeStart}`).value = 'Narratives';
  sheet.getCell(`A${narrativeStart}`).font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  sheet.getCell(`A${narrativeStart}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: green },
  };
  [
    ['what_went_well', 'What Went Well'],
    ['issues', 'Issues / Risks'],
    ['next_action', 'Next Action'],
  ].forEach(([key, label], index) => {
    const row = sheet.getRow(narrativeStart + 1 + index);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    sheet.mergeCells(row.number, 2, row.number, 4);
    row.getCell(2).value = String(snapshot.narrative?.[key] || '—');
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    row.height = 34;
  });
  const lineage = workbook.addWorksheet('Source Lineage');
  lineage.columns = [
    { width: 16 },
    { width: 42 },
    { width: 28 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
  ];
  lineage.addRow([
    'Marketplace',
    'Source',
    'Metric basis',
    'Period start',
    'Period end',
    'Status',
  ]);
  lineage.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
  });
  for (const source of snapshot.sources || [])
    lineage.addRow([
      source.marketplace,
      source.filename || source.source_type,
      source.sales_metric,
      source.period_start,
      source.period_end,
      source.status,
    ]);
  const metadata = workbook.addWorksheet('Report Metadata');
  metadata.state = 'hidden';
  [
    ['Report', input.reportName],
    ['Template', snapshot.template?.name],
    ['Template ID', snapshot.template?.id],
    ['Template version', snapshot.template?.version],
    ['Marketplace', snapshot.marketplace],
    ['Period start', snapshot.period.start],
    ['Period end', snapshot.period.end],
    ['Cutoff', snapshot.period.cutoff],
    ['Finalized at', input.finalizedAt],
    ['Finalized by', snapshot.finalized_by],
  ].forEach((values) => metadata.addRow(values));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function metricDefinition(key: string) {
  const definitions: Record<string, string> = {
    affiliateGmv: 'Frozen canonical affiliate GMV',
    orders: 'Distinct included order IDs',
    quantity: 'Included unit/order-item quantity',
    affiliatesWithSales: 'Distinct normalized creators with included sales',
    totalAffiliates: 'Distinct creators in source period',
    commission: 'Frozen canonical commission',
    asp: 'Affiliate GMV / quantity',
    roi: 'Affiliate GMV / commission',
    costRatio: 'Commission / affiliate GMV',
    storeRevenue: 'External store revenue source',
    affiliateContribution: 'Affiliate GMV / store revenue',
    target: 'Configured period target',
    targetAchievement: 'Affiliate GMV / target',
  };
  return definitions[key] || 'Frozen report snapshot value';
}
