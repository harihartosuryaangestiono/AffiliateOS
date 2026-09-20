import { parseCSV, type RawRow } from './validation.ts';
import { detectMapping } from './validation.ts';
export async function readReport(file: File, market?: 'TikTok' | 'Shopee'): Promise<RawRow[]> {
  if (!/^.+\.(csv|xlsx)$/i.test(file.name))
    throw Error('File format not supported. Choose a CSV or XLSX file.');
  if (!file.size || file.size > 50 * 1024 * 1024)
    throw Error('Choose a non-empty file smaller than 50 MB.');
  if (file.name.toLowerCase().endsWith('.csv'))
    return parseCSV(await file.text());
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const scored = workbook.worksheets.map((sheet) => {
    const headers = (sheet.getRow(1).values as unknown[]).slice(1).map((v) =>
      typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '',
    );
    const mapping = market && headers.length ? detectMapping(headers, market) : {};
    return { sheet, score: Object.values(mapping).filter(Boolean).length };
  });
  const sheet = market
    ? scored.sort((a, b) => b.score - a.score)[0]?.sheet
    : workbook.worksheets[0];
  if (
    !sheet ||
    sheet.rowCount < 2 ||
    sheet.rowCount > 50001 ||
    sheet.columnCount > 100
  )
    throw Error(
      'The detected worksheet must contain headers, 1–50,000 data rows, and at most 100 columns.',
    );
  const labels = (sheet.getRow(1).values as unknown[])
    .slice(1)
    .map((v) =>
      typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '',
    );
  if (labels.some((v) => !v) || new Set(labels).size !== labels.length)
    throw Error('Column headers must be unique and non-empty.');
  const rows: RawRow[] = [];
  sheet.eachRow((row, i) => {
    if (i > 1)
      rows.push(
        Object.fromEntries(labels.map((h, j) => [h, row.getCell(j + 1).text])),
      );
  });
  return rows;
}
