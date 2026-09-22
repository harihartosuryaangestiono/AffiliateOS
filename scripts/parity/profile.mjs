import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';

const files = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const json = process.argv.includes('--json');
if (!files.length)
  throw new Error(
    'Usage: npm run profile:sources -- <workbook.xlsx> [...] [--json]',
  );

const valueType = (value) =>
  value instanceof Date
    ? 'date'
    : value && typeof value === 'object' && 'formula' in value
      ? 'formula'
      : value === null || value === undefined || value === ''
        ? 'blank'
        : typeof value;
const hash = async (filename) =>
  new Promise((resolve, reject) => {
    const digest = crypto.createHash('sha256'),
      stream = fs.createReadStream(filename);
    stream.on('data', (chunk) => digest.update(chunk));
    stream.on('end', () => resolve(digest.digest('hex')));
    stream.on('error', reject);
  });

async function profile(filename) {
  const sheets = [];
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(filename, {
    entries: 'emit',
    sharedStrings: 'cache',
    styles: 'cache',
    hyperlinks: 'ignore',
    worksheets: 'emit',
  });
  for await (const worksheet of reader) {
    let rowCount = 0,
      columnCount = 0,
      formulaCells = 0,
      headerRow = null,
      headers = [],
      sampleCount = 0;
    const inferred = new Map();
    for await (const row of worksheet) {
      rowCount = Math.max(rowCount, row.number);
      columnCount = Math.max(columnCount, row.cellCount);
      const cells = row.values.slice(1);
      for (let index = 0; index < cells.length; index++) {
        const value = cells[index];
        if (value && typeof value === 'object' && 'formula' in value)
          formulaCells++;
        if (sampleCount < 200) {
          const type = valueType(value);
          if (type !== 'blank') {
            const current = inferred.get(index + 1) || new Set();
            current.add(type);
            inferred.set(index + 1, current);
          }
        }
      }
      if (headerRow === null && row.number <= 50) {
        const labels = cells.map((value) =>
          typeof value === 'string' ? value.trim() : '',
        );
        const nonblank = labels.filter(Boolean);
        if (
          nonblank.length >= 3 &&
          nonblank.length >=
            cells.filter(
              (value) => value !== null && value !== undefined && value !== '',
            ).length *
              0.6
        ) {
          headerRow = row.number;
          headers = labels.filter(Boolean).slice(0, 100);
        }
      }
      sampleCount++;
    }
    sheets.push({
      name: worksheet.name,
      state: worksheet.state || 'visible',
      dimensions: { rows: rowCount, columns: columnCount },
      headerRow,
      columns: headers,
      inferredTypes: Object.fromEntries(
        [...inferred].map(([column, types]) => [
          column,
          [...types].sort((a, b) => a.localeCompare(b)),
        ]),
      ),
      formulaCells,
      mergedCells: 'not_available_in_streaming_profile',
    });
  }
  const stat = await fs.promises.stat(filename);
  return {
    filename: path.basename(filename),
    sha256: await hash(filename),
    bytes: stat.size,
    worksheets: sheets,
  };
}

const result = [];
for (const filename of files)
  result.push(await profile(path.resolve(filename)));
if (json) console.log(JSON.stringify(result, null, 2));
else
  for (const workbook of result) {
    console.log(
      `${workbook.filename} · sha256 ${workbook.sha256} · ${workbook.worksheets.length} worksheets`,
    );
    for (const sheet of workbook.worksheets)
      console.log(
        `  ${sheet.name} [${sheet.state}] ${sheet.dimensions.rows}x${sheet.dimensions.columns} · header ${sheet.headerRow ?? 'undetected'} · formulas ${sheet.formulaCells}`,
      );
  }
