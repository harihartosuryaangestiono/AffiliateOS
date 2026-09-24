import type { ConnectorAdapter, ProviderId, ConnectionStatus, IntegrationConnection } from './types.ts';
import { shopeeAdapter } from './providers/shopee-adapter.ts';
import { tiktokAdapter } from './providers/tiktok-adapter.ts';
import { mockProviderAdapter } from './providers/mock-provider.ts';
import type { WorkspaceData } from '../../types/domain.ts';
import { records } from '../operations/config.ts';

const registry = new Map<ProviderId, ConnectorAdapter>([
  [shopeeAdapter.id, shopeeAdapter],
  [tiktokAdapter.id, tiktokAdapter],
  [mockProviderAdapter.id, mockProviderAdapter],
]);

export function getConnectorRegistry(): Map<ProviderId, ConnectorAdapter> {
  return registry;
}

export function getWorkspaceConnectionStatus(
  data: WorkspaceData,
  providerId: ProviderId,
): ConnectionStatus {
  const conn = getConnectionStatus(data, providerId);
  return conn.status;
}

export function getProvider(id: ProviderId): ConnectorAdapter {
  const adapter = registry.get(id);
  if (!adapter) throw new Error(`Unknown connector provider: ${id}`);
  return adapter;
}

export function getAllProviders(): ConnectorAdapter[] {
  return Array.from(registry.values());
}

export function getConnectionStatus(
  data: WorkspaceData,
  providerId: ProviderId,
): IntegrationConnection {
  const connections = records(data, 'integration_connections');
  const existing = connections.find((c) => c.provider === providerId);

  if (existing) {
    return {
      id: String(existing.id),
      workspace_id: existing.workspace_id ? String(existing.workspace_id) : undefined,
      provider: providerId,
      marketplace: (existing.marketplace as IntegrationConnection['marketplace']) || 'Shopee',
      status: (existing.status as ConnectionStatus) || 'NOT_CONFIGURED',
      capabilities: (existing.capabilities as unknown as IntegrationConnection['capabilities']) || [],
      external_account_id: existing.external_account_id ? String(existing.external_account_id) : null,
      external_account_label: existing.external_account_label ? String(existing.external_account_label) : null,
      last_sync_at: existing.last_sync_at ? String(existing.last_sync_at) : null,
      last_success_at: existing.last_success_at ? String(existing.last_success_at) : null,
      last_error_at: existing.last_error_at ? String(existing.last_error_at) : null,
      last_error_code: existing.last_error_code ? String(existing.last_error_code) : null,
      created_at: String(existing.created_at || new Date().toISOString()),
      updated_at: String(existing.updated_at || new Date().toISOString()),
    };
  }

  const adapter = getProvider(providerId);
  return {
    id: `conn-${providerId}`,
    provider: providerId,
    marketplace: adapter.marketplace,
    status: providerId === 'mock-test' ? 'HEALTHY' : 'FILE_IMPORT',
    capabilities: adapter.capabilities,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
