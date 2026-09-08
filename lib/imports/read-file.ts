import { parseCSV, type RawRow } from './validation';
export async function readReport(file: File): Promise<RawRow[]> {
  if (!/^.+\.(csv|xlsx)$/i.test(file.name))
    throw Error('File format not supported. Choose a CSV or XLSX file.');
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw Error('Choose a non-empty file smaller than 5 MB.');
  if (file.name.toLowerCase().endsWith('.csv'))
    return parseCSV(await file.text());
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (
    !sheet ||
    sheet.rowCount < 2 ||
    sheet.rowCount > 10001 ||
    sheet.columnCount > 100
  )
    throw Error(
      'The first worksheet must contain headers, 1–10,000 data rows, and at most 100 columns.',
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
