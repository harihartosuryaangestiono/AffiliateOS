export type ProviderId = 'shopee' | 'tiktok' | 'mock-test';

export type Marketplace = 'Shopee' | 'TikTok' | 'Multi-platform';

export type ConnectionStatus =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'CONNECTED'
  | 'SYNCING'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'ERROR'
  | 'REAUTH_REQUIRED'
  | 'DISABLED';

export type Capability =
  | 'ORDERS'
  | 'PERFORMANCE'
  | 'CREATORS'
  | 'AFFILIATES'
  | 'PRODUCTS'
  | 'STOCK'
  | 'COMMISSIONS'
  | 'CAMPAIGNS';

export type SyncRunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type TriggerType = 'MANUAL' | 'SCHEDULED' | 'RETRY' | 'BACKFILL';

export type SourceType = 'MANUAL_FILE' | 'API_SYNC' | 'BACKFILL';

export type ErrorCategory =
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'PROVIDER'
  | 'VALIDATION'
  | 'INTERNAL';

export type IntegrationConnection = {
  id: string;
  workspace_id?: string;
  provider: ProviderId;
  marketplace: Marketplace;
  status: ConnectionStatus;
  capabilities: Capability[];
  external_account_id?: string | null;
  external_account_label?: string | null;
  last_sync_at?: string | null;
  last_success_at?: string | null;
  last_error_at?: string | null;
  last_error_code?: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationSyncRun = {
  id: string;
  workspace_id?: string;
  connection_id: string;
  provider: ProviderId;
  capability: Capability;
  status: SyncRunStatus;
  trigger_type: TriggerType;
  period_start: string;
  period_end: string;
  started_at: string;
  finished_at?: string | null;
  fetched_records: number;
  accepted_records: number;
  rejected_records: number;
  duplicate_records: number;
  normalized_records: number;
  source_fingerprint?: string | null;
  error_code?: string | null;
  error_summary?: string | null;
  initiated_by: string;
  created_at: string;
};

export type SyncOptions = {
  providerId: ProviderId;
  capability: Capability;
  period: { start: string; end: string };
  triggerType?: TriggerType;
  actorName?: string;
};

export type SyncResult = {
  syncRun: IntegrationSyncRun;
  records: Array<Record<string, unknown>>;
  success: boolean;
};

export interface ConnectorAdapter {
  id: ProviderId;
  name: string;
  marketplace: Marketplace;
  capabilities: Capability[];
  getStatus(connection?: IntegrationConnection): ConnectionStatus;
  fetchRecords(
    capability: Capability,
    period: { start: string; end: string },
    options?: Record<string, unknown>,
  ): Promise<{
    records: Array<Record<string, unknown>>;
    hasMore: boolean;
    nextCursor?: string;
    rateLimitReset?: string;
  }>;
}
