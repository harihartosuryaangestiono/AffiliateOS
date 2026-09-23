import crypto from 'node:crypto';
import type { Performance, ShopeePerformance, TikTokPerformance } from '../../types/domain.ts';
import type { SourceType } from './types.ts';

export type RawRecord = Record<string, unknown>;

export type NormalizedResult = {
  performanceRows: Array<ShopeePerformance | TikTokPerformance>;
  stockRows: Array<{
    id: string;
    product_id: string;
    marketplace: 'Shopee' | 'TikTok';
    stock_quantity: number;
    snapshot_at: string;
    source: string;
    created_at: string;
  }>;
  acceptedCount: number;
  rejectedCount: number;
  duplicateCount: number;
};

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

export function normalizeIngestionPayload(input: {
  marketplace: 'Shopee' | 'TikTok';
  records: RawRecord[];
  sourceId: string;
  sourceType: SourceType;
  existingFingerprints?: Set<string>;
  workspaceData?: import('../../types/domain.ts').WorkspaceData;
}): NormalizedResult {
  const { marketplace, records, sourceId, sourceType, existingFingerprints = new Set(), workspaceData } = input;

  const performanceRows: Array<ShopeePerformance | TikTokPerformance> = [];
  const stockRows: Array<{
    id: string;
    product_id: string;
    marketplace: 'Shopee' | 'TikTok';
    stock_quantity: number;
    snapshot_at: string;
    source: string;
    created_at: string;
  }> = [];

  let acceptedCount = 0;
  let rejectedCount = 0;
  let duplicateCount = 0;

  for (const r of records) {
    // Check if record is a Stock update
    if (r.stock_quantity !== undefined && r.product_id !== undefined) {
      const stockVal = Number(r.stock_quantity);
      if (Number.isNaN(stockVal) || stockVal < 0) {
        rejectedCount++;
        continue;
      }

      const snapshotAt = toStr(r.snapshot_at) || new Date().toISOString().slice(0, 10);
      const prodId = toStr(r.product_id);
      const fingerprint = `stock_${marketplace}_${prodId}_${snapshotAt}`;

      if (existingFingerprints.has(fingerprint)) {
        duplicateCount++;
        continue;
      }
      existingFingerprints.add(fingerprint);

      stockRows.push({
        id: crypto.randomUUID(),
        product_id: prodId,
        marketplace,
        stock_quantity: Math.round(stockVal),
        snapshot_at: snapshotAt,
        source: sourceType === 'MANUAL_FILE' ? 'Import' : 'API Sync',
        created_at: new Date().toISOString(),
      });
      acceptedCount++;
      continue;
    }

    // Process Performance / Order records
    const date = toStr(r.date || r.Order_Time || r.Time_Created).slice(0, 10);
    const orderId = toStr(r.order_id || r['Order id'] || r['Order ID'] || r.id);
    const rawUser = toStr(r.account_id || r.username || r.account_username || r['Affiliate Username'] || r['Creator Username']);
    let accountId = rawUser || 'unknown_account';

    if (workspaceData) {
      const accounts = marketplace === 'TikTok' ? workspaceData.tiktok_accounts : workspaceData.shopee_accounts;
      const matched = accounts.find((a) => a.id === rawUser || a.username.toLowerCase() === rawUser.toLowerCase());
      if (matched) accountId = matched.id;
    }

    const campaignId = toStr(r.campaign_id) || 'default-campaign';
    const productId = r.product_id ? toStr(r.product_id) : undefined;

    const gmv = Number(r.gmv || r['Purchase Value(Rp)'] || r['Actual Commission Base'] || 0);
    const orders = Number(r.orders || (orderId ? 1 : 0));
    const units = Number(r.units_sold || r.units || r.quantity || r.Qty || r.Quantity || 0);
    const commission = Number(r.commission || r['Item Brand Commission(Rp)'] || r['Actual Commission Payment'] || 0);

    if (!date || Number.isNaN(gmv) || gmv < 0 || Number.isNaN(orders) || orders < 0) {
      rejectedCount++;
      continue;
    }

    // Fingerprint for idempotency
    const fingerprint = orderId
      ? `${marketplace}_ord_${orderId}_${date}`
      : `${marketplace}_perf_${accountId}_${date}_${gmv}_${units}`;

    if (existingFingerprints.has(fingerprint)) {
      duplicateCount++;
      continue;
    }
    existingFingerprints.add(fingerprint);

    const baseRow: Performance = {
      id: crypto.randomUUID(),
      date,
      account_id: accountId,
      campaign_id: campaignId,
      product_id: productId,
      gmv,
      orders,
      units_sold: units,
      commission,
      source_import_id: sourceId,
    };

    if (marketplace === 'Shopee') {
      performanceRows.push({
        ...baseRow,
        clicks: Number(r.clicks || 0),
        conversion_rate: Number(r.conversion_rate || 0),
      });
    } else {
      performanceRows.push({
        ...baseRow,
        video_count: Number(r.video_count || 0),
        live_count: Number(r.live_count || 0),
      });
    }

    acceptedCount++;
  }

  return {
    performanceRows,
    stockRows,
    acceptedCount,
    rejectedCount,
    duplicateCount,
  };
}
