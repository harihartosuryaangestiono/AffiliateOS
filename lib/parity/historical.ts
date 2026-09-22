import type { CanonicalMetrics, HistoricalTransaction } from './types.ts';

export type SourceRow = Record<string, unknown>;

const text = (value: unknown) => {
  const scalar = (candidate: unknown) =>
    typeof candidate === 'string' ||
    typeof candidate === 'number' ||
    typeof candidate === 'boolean'
      ? String(candidate)
      : '';
  if (value && typeof value === 'object') {
    if ('text' in value)
      return scalar((value as { text?: unknown }).text).trim();
    if (
      'richText' in value &&
      Array.isArray((value as { richText?: unknown[] }).richText)
    )
      return (value as { richText: Array<{ text?: unknown }> }).richText
        .map((part) => scalar(part.text))
        .join('')
        .trim();
    if ('result' in value)
      return scalar((value as { result?: unknown }).result).trim();
  }
  return scalar(value).trim();
};
const number = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = text(value).replace(/\s/g, '').replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
const creatorKey = (value: unknown) => text(value).toLocaleLowerCase('en-US');

// TikTok exports in the supplied historical workbook use day/month/year strings.
export function parseDmyDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    // Excel has already interpreted an ambiguous d/m value as m/d. Swapping restores
    // the source's observed Dinda reporting convention when day is 1..12.
    const year = value.getUTCFullYear();
    const month = value.getUTCDate();
    const day = value.getUTCMonth() + 1;
    if (month <= 12)
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const match = text(value).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function parseShopeeHistoricalRow(
  row: SourceRow,
  sourceRow: number,
): HistoricalTransaction | null {
  const reportingDate = parseIsoDate(row['Order Time']);
  const transactionId = text(row['Order id']);
  if (!reportingDate || !transactionId) return null;
  const verifiedStatus = text(row['Verified Status']);
  const status = text(row['Order Status']);
  return {
    sourceRow,
    marketplace: 'Shopee',
    transactionId,
    itemId: `${text(row['Item id'])}:${text(row['Model id'])}`,
    creatorKey: creatorKey(row['Affiliate Username']),
    reportingDate,
    status,
    verifiedStatus,
    // Historical Simba output matches gross Purchase Value for verified rows.
    gmv: number(row['Purchase Value(Rp)']),
    // Historical "Qty" is an order-item row count, not the exported Qty sum.
    quantity: 1,
    commission: number(row['Item Brand Commission(Rp)']),
    contributesGmv: verifiedStatus === 'Valid',
    contributesSale: verifiedStatus === 'Valid' && status === 'Completed',
  };
}

export function parseTikTokHistoricalRow(
  row: SourceRow,
  sourceRow: number,
): HistoricalTransaction | null {
  const reportingDate = parseDmyDate(row['Time Created']);
  const transactionId = text(row['Order ID']);
  if (!reportingDate || !transactionId) return null;
  const status = text(row['Order Status']);
  const settled =
    status === 'Settled' &&
    text(row['Fully returned or refunded']).toLowerCase() !== 'yes';
  return {
    sourceRow,
    marketplace: 'TikTok',
    transactionId,
    itemId: `${text(row['Product ID'])}:${text(row['SKU ID'])}`,
    creatorKey: creatorKey(row['Creator Username']),
    reportingDate,
    status,
    gmv: number(row['Actual Commission Base']),
    quantity: number(row.Quantity),
    commission: number(row['Actual Commission Payment']),
    contributesGmv: settled,
    contributesSale: settled,
  };
}

function parseIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf()))
    return value.toISOString().slice(0, 10);
  const raw = text(value);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  return dmy
    ? `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
    : null;
}

export function aggregateHistorical(
  rows: HistoricalTransaction[],
  period: { start: string; end: string },
): CanonicalMetrics {
  const seen = new Set<string>();
  const inPeriod = rows.filter((row) => {
    if (row.reportingDate < period.start || row.reportingDate > period.end)
      return false;
    const key = `${row.marketplace}:${row.transactionId}:${row.itemId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const gmvRows = inPeriod.filter((row) => row.contributesGmv);
  const saleRows = inPeriod.filter((row) => row.contributesSale);
  const affiliateGmv = gmvRows.reduce((sum, row) => sum + row.gmv, 0);
  const commission = inPeriod.reduce((sum, row) => sum + row.commission, 0);
  // Shopee's historical Qty counts verified positive-value order-item rows,
  // including the one pending row in the validated 1–6 Aug period. TikTok's
  // GMV and sale sets are identical, so the same aggregation remains correct.
  const quantity = gmvRows.reduce(
    (sum, row) => sum + (row.gmv > 0 ? row.quantity : 0),
    0,
  );
  const unique = (values: string[]) => new Set(values.filter(Boolean)).size;
  return {
    affiliateGmv,
    orders: unique(saleRows.map((row) => row.transactionId)),
    quantity,
    affiliatesWithSales: unique(saleRows.map((row) => row.creatorKey)),
    totalAffiliates: unique(inPeriod.map((row) => row.creatorKey)),
    commission,
    asp: quantity ? affiliateGmv / quantity : null,
    roi: commission ? affiliateGmv / commission : null,
    costRatio: affiliateGmv ? commission / affiliateGmv : null,
    storeRevenue: null,
    affiliateContribution: null,
    target: null,
    targetAchievement: null,
  };
}
