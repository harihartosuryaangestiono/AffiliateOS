import crypto from 'node:crypto';
import type { WorkspaceData, RecordData } from '../../types/domain.ts';
import { getProvider, getConnectionStatus } from './registry.ts';
import { normalizeIngestionPayload } from './normalization.ts';
import type {
  SyncOptions,
  SyncResult,
  IntegrationSyncRun,
  ErrorCategory,
  SourceType,
} from './types.ts';
import { putRecord } from '../operations/mutations.ts';

const cooldownMap = new Map<string, number>();

export function classifyError(err: unknown): { category: ErrorCategory; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (/AUTH|TOKEN|UNAUTHORIZED|EXPIRED|ACCESS REQUIRED|CREDENTIALS|FILE_IMPORT|DIRECT API/i.test(msg)) {
    return { category: 'AUTH', message: msg };
  }
  if (/RATE|QUOTA|THROTTLE|BACKOFF|429/i.test(msg)) {
    return { category: 'RATE_LIMIT', message: msg };
  }
  if (/NETWORK|TIMEOUT|CONNECT|FETCH|ECONNRESET/i.test(msg)) {
    return { category: 'NETWORK', message: msg };
  }
  if (/VALIDAT|MALFORMED|INVALID|FORMAT/i.test(msg)) {
    return { category: 'VALIDATION', message: msg };
  }
  if (/PROVIDER|SERVER|500|502|503/i.test(msg)) {
    return { category: 'PROVIDER', message: msg };
  }
  return { category: 'INTERNAL', message: msg };
}

export function generatePayloadFingerprint(
  providerId: string,
  capability: string,
  records: Array<Record<string, unknown>>,
): string {
  const hash = crypto.createHash('md5');
  hash.update(`${providerId}:${capability}:${JSON.stringify(records)}`);
  return hash.digest('hex');
}

export async function executeSyncRun(
  data: WorkspaceData,
  options: SyncOptions,
  syncOverrideOptions?: Record<string, unknown>,
): Promise<{ nextData: WorkspaceData; result: SyncResult }> {
  const {
    providerId,
    capability,
    period,
    triggerType = 'MANUAL',
    actorName = 'System',
  } = options;

  // Manual sync cooldown guard (10 seconds cooldown per provider)
  const cooldownKey = `${providerId}_${capability}`;
  const nowMs = Date.now();
  const lastRunMs = cooldownMap.get(cooldownKey) || 0;
  if (triggerType === 'MANUAL' && nowMs - lastRunMs < 10000) {
    throw new Error('Sync is in cooldown. Please wait 10 seconds before requesting sync again.');
  }
  cooldownMap.set(cooldownKey, nowMs);

  const conn = getConnectionStatus(data, providerId);
  const adapter = getProvider(providerId);
  const nowIso = new Date().toISOString();

  const syncRunId = crypto.randomUUID();
  const initialRun: IntegrationSyncRun = {
    id: syncRunId,
    workspace_id: conn.workspace_id,
    connection_id: conn.id,
    provider: providerId,
    capability,
    status: 'RUNNING',
    trigger_type: triggerType,
    period_start: period.start,
    period_end: period.end,
    started_at: nowIso,
    fetched_records: 0,
    accepted_records: 0,
    rejected_records: 0,
    duplicate_records: 0,
    normalized_records: 0,
    initiated_by: actorName,
    created_at: nowIso,
  };

  let currentData = putRecord(data, 'integration_sync_runs', initialRun as unknown as RecordData);

  try {
    const fetchRes = await adapter.fetchRecords(capability, period, syncOverrideOptions);
    const rawRecords = fetchRes.records;

    const existingFingerprints = new Set<string>();
    // Pre-populate fingerprints from existing performance/stock rows
    for (const r of currentData.shopee_performance) {
      existingFingerprints.add(`Shopee_perf_${r.account_id}_${r.date}_${r.gmv}_${r.units_sold}`);
    }
    for (const r of currentData.tiktok_performance) {
      existingFingerprints.add(`TikTok_perf_${r.account_id}_${r.date}_${r.gmv}_${r.units_sold}`);
    }

    const sourceType: SourceType = triggerType === 'BACKFILL' ? 'BACKFILL' : 'API_SYNC';

    const normalized = normalizeIngestionPayload({
      marketplace: adapter.marketplace === 'TikTok' ? 'TikTok' : 'Shopee',
      records: rawRecords,
      sourceId: syncRunId,
      sourceType,
      existingFingerprints,
    });

    // Merge normalized performance and stock rows into workspace state
    if (adapter.marketplace === 'Shopee') {
      currentData = {
        ...currentData,
        shopee_performance: [
          ...(normalized.performanceRows as unknown as import('../../types/domain.ts').ShopeePerformance[]),
          ...currentData.shopee_performance,
        ],
      };
    } else if (adapter.marketplace === 'TikTok') {
      currentData = {
        ...currentData,
        tiktok_performance: [
          ...(normalized.performanceRows as unknown as import('../../types/domain.ts').TikTokPerformance[]),
          ...currentData.tiktok_performance,
        ],
      };
    }

    if (normalized.stockRows.length) {
      currentData = putRecord(currentData, 'product_stock_snapshots', normalized.stockRows[0] as unknown as RecordData);
    }

    const completedRun: IntegrationSyncRun = {
      ...initialRun,
      status: normalized.rejectedCount > 0 && normalized.acceptedCount > 0 ? 'PARTIAL' : 'SUCCEEDED',
      finished_at: new Date().toISOString(),
      fetched_records: rawRecords.length,
      accepted_records: normalized.acceptedCount,
      rejected_records: normalized.rejectedCount,
      duplicate_records: normalized.duplicateCount,
      normalized_records: normalized.performanceRows.length + normalized.stockRows.length,
      source_fingerprint: `sync_${providerId}_${period.start}_${period.end}`,
    };

    currentData = putRecord(currentData, 'integration_sync_runs', completedRun as unknown as RecordData);

    // Update connection status
    const updatedConn = {
      ...conn,
      name: `${providerId} connection`,
      status: 'HEALTHY',
      last_sync_at: new Date().toISOString(),
      last_success_at: new Date().toISOString(),
      last_error_at: null,
      last_error_code: null,
      updated_at: new Date().toISOString(),
    };
    currentData = putRecord(currentData, 'integration_connections', updatedConn as unknown as RecordData);

    return {
      nextData: currentData,
      result: {
        syncRun: completedRun,
        records: rawRecords,
        success: true,
      },
    };
  } catch (err) {
    const { category, message } = classifyError(err);
    const failedRun: IntegrationSyncRun = {
      ...initialRun,
      status: 'FAILED',
      finished_at: new Date().toISOString(),
      error_code: category,
      error_summary: message,
    };

    currentData = putRecord(currentData, 'integration_sync_runs', failedRun as unknown as RecordData);

    const updatedConn = {
      ...conn,
      name: `${providerId} connection`,
      status: category === 'AUTH' ? 'REAUTH_REQUIRED' : 'ERROR',
      last_sync_at: new Date().toISOString(),
      last_error_at: new Date().toISOString(),
      last_error_code: category,
      updated_at: new Date().toISOString(),
    };
    currentData = putRecord(currentData, 'integration_connections', updatedConn as unknown as RecordData);

    return {
      nextData: currentData,
      result: {
        syncRun: failedRun,
        records: [],
        success: false,
      },
    };
  }
}
