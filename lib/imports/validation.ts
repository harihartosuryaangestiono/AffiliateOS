export const mappings = {
  TikTok: [
    { key: 'date', label: 'Date', required: true },
    { key: 'username', label: 'TikTok username', required: true },
    { key: 'campaign_id', label: 'Campaign ID', required: true },
    { key: 'gmv', label: 'GMV (IDR)', required: true },
    { key: 'orders', label: 'Orders', required: true },
    { key: 'units_sold', label: 'Items sold' },
    { key: 'commission', label: 'Estimated commission' },
    { key: 'video_count', label: 'Videos' },
    { key: 'live_count', label: 'Live sessions' },
  ],
  Shopee: [
    { key: 'date', label: 'Date', required: true },
    { key: 'username', label: 'Shopee affiliate username', required: true },
    { key: 'campaign_id', label: 'Campaign ID', required: true },
    { key: 'gmv', label: 'GMV (IDR)', required: true },
    { key: 'orders', label: 'Orders', required: true },
    { key: 'units_sold', label: 'Units sold' },
    { key: 'commission', label: 'Commission' },
    { key: 'clicks', label: 'Product clicks' },
    { key: 'conversion_rate', label: 'Conversion rate (0–1)' },
  ],
};
export type RawRow = Record<string, string>;
export function parseCSV(text: string): RawRow[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (quoted) throw Error('Unclosed quoted field in CSV.');
  if (cell || row.length) {
    row.push(cell);
    if (row.some((v) => v.trim())) rows.push(row);
  }
  if (rows.length < 2)
    throw Error('The file must have a header and at least one data row.');
  const headers = rows.shift()!.map((v) => v.replace(/^\uFEFF/, '').trim());
  if (headers.some((h) => !h) || new Set(headers).size !== headers.length)
    throw Error('Column headers must be non-empty and unique.');
  if (rows.length > 10000) throw Error('Maximum 10,000 rows per import.');
  return rows.map((r, i) => {
    if (r.length !== headers.length)
      throw Error(
        `Row ${i + 2} has ${r.length} fields; expected ${headers.length}.`,
      );
    return Object.fromEntries(headers.map((h, j) => [h, r[j].trim()]));
  });
}
export function validateRows(
  rows: RawRow[],
  mapping: Record<string, string>,
  market: 'TikTok' | 'Shopee',
) {
  const errors: string[] = [];
  const valid: Record<string, string | number>[] = [];
  const seen = new Set<string>();
  for (const f of mappings[market])
    if (f.required && !mapping[f.key])
      errors.push(`Map the required ${f.label} column.`);
  if (errors.length) return { errors, valid };
  rows.forEach((r, i) => {
    const out: Record<string, string | number> = {};
    const rowErrors: string[] = [];
    for (const f of mappings[market]) {
      const raw = r[mapping[f.key]] || '';
      if (['date', 'username', 'campaign_id'].includes(f.key)) {
        out[f.key] = raw;
        if (f.required && !raw) rowErrors.push(`${f.label} is required`);
      } else {
        const n = raw === '' && !f.required ? 0 : Number(raw);
        if (
          !Number.isFinite(n) ||
          n < 0 ||
          ([
            'orders',
            'units_sold',
            'video_count',
            'live_count',
            'clicks',
          ].includes(f.key) &&
            !Number.isInteger(n))
        )
          rowErrors.push(
            `${f.label} must be a non-negative ${f.key === 'gmv' || f.key === 'commission' ? 'number' : 'integer'}`,
          );
        if (f.key === 'conversion_rate' && n > 1)
          rowErrors.push('Conversion rate must be between 0 and 1');
        out[f.key] = n;
      }
    }
    const date = String(out.date);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      rowErrors.push('Date must be a valid YYYY-MM-DD date');
    const key = [out.date, out.username, out.campaign_id].join('|');
    if (seen.has(key))
      rowErrors.push('Duplicate account/date/campaign in this file');
    seen.add(key);
    if (rowErrors.length) errors.push(`Row ${i + 2}: ${rowErrors.join('; ')}`);
    else valid.push(out);
  });
  return { errors, valid };
}
