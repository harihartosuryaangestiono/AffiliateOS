import type { WorkspaceData } from '../../types/domain.ts';
import { records } from '../operations/config.ts';
import type { Marketplace } from './types.ts';

export type DataFreshnessInfo = {
  marketplace: Marketplace;
  lastUpdated: string | null;
  ageHours: number | null;
  status: 'FRESH' | 'WARNING' | 'STALE' | 'UNKNOWN';
  label: string;
};

export function getFreshnessStatus(
  data: WorkspaceData,
  marketplace: Marketplace,
): DataFreshnessInfo {
  const syncRuns = records(data, 'integration_sync_runs');
  const provider = marketplace.toLowerCase() as 'shopee' | 'tiktok';

  const successfulRuns = syncRuns
    .filter((r) => r.provider === provider && r.status === 'SUCCEEDED' && r.finished_at)
    .sort((a, b) => String(b.finished_at).localeCompare(String(a.finished_at)));

  const latestRun = successfulRuns[0];

  let lastUpdated: string | null = null;
  if (latestRun?.finished_at) {
    lastUpdated = String(latestRun.finished_at);
  } else {
    // Fall back to latest performance row date
    const perfRows =
      marketplace === 'Shopee' ? data.shopee_performance : data.tiktok_performance;
    const sorted = [...perfRows].sort((a, b) => b.date.localeCompare(a.date));
    if (sorted[0]?.date) {
      lastUpdated = `${sorted[0].date}T23:59:59Z`;
    }
  }

  if (!lastUpdated) {
    return {
      marketplace,
      lastUpdated: null,
      ageHours: null,
      status: 'UNKNOWN',
      label: `${marketplace}: No data imported yet`,
    };
  }

  const ageMs = Date.now() - new Date(lastUpdated).getTime();
  const ageHours = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60)));

  let status: DataFreshnessInfo['status'] = 'FRESH';
  if (ageHours > 48) {
    status = 'STALE';
  } else if (ageHours > 24) {
    status = 'WARNING';
  }

  const label =
    ageHours === 0
      ? `${marketplace} updated recently`
      : ageHours < 24
        ? `${marketplace} updated ${ageHours} hour${ageHours === 1 ? '' : 's'} ago`
        : `${marketplace} updated ${Math.floor(ageHours / 24)} day${Math.floor(ageHours / 24) === 1 ? '' : 's'} ago`;

  return {
    marketplace,
    lastUpdated,
    ageHours,
    status,
    label,
  };
}

export function checkStaleDataAlerts(data: WorkspaceData): Array<{
  id: string;
  type: string;
  severity: 'Warning' | 'Critical';
  message: string;
}> {
  const alerts: Array<{
    id: string;
    type: string;
    severity: 'Warning' | 'Critical';
    message: string;
  }> = [];

  for (const m of ['Shopee', 'TikTok'] as Marketplace[]) {
    const freshness = getFreshnessStatus(data, m);
    if (freshness.status === 'STALE') {
      alerts.push({
        id: `stale_${m}`,
        type: 'DATA_SOURCE_STALE',
        severity: 'Warning',
        message: `${m} data is stale (${freshness.label}). Refresh or upload latest data.`,
      });
    }
  }

  return alerts;
}
