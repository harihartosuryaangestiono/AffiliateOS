'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/components/layout/workspace-provider';
import { Heading } from './primitives';
import { getAllProviders, getConnectionStatus } from '@/lib/integrations/registry';
import { getFreshnessStatus } from '@/lib/integrations/health';
import { executeSyncRun } from '@/lib/integrations/sync';
import type { ProviderId, Marketplace } from '@/lib/integrations/types';
import { toast } from 'sonner';

export function IntegrationsSettings() {
  const { data, role, mutate } = useWorkspace();
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const providers = getAllProviders();

  const handleSyncNow = async (providerId: ProviderId, _marketplace: Marketplace) => {
    setBusyProvider(providerId);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const period = { start: today, end: today };

      const { nextData: _nextData, result } = await executeSyncRun(data, {
        providerId,
        capability: 'PERFORMANCE',
        period,
        triggerType: 'MANUAL',
        actorName: role || 'Operator',
      });

      // Update workspace state
      await mutate([
        {
          table: 'shopee_performance_daily',
          record: {
            id: crypto.randomUUID(),
            name: 'sync_trigger',
            status: 'Active',
            created_at: new Date().toISOString(),
          },
        },
      ]).catch(() => {});

      if (result.success) {
        toast.success(`${providerId.toUpperCase()} sync completed: ${result.syncRun.normalized_records} record(s) normalized.`);
      } else {
        toast.error(`${providerId.toUpperCase()} sync failed: ${result.syncRun.error_summary || 'Unknown error'}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync execution failed');
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <>
      <Heading
        title="Settings → Integrations"
        description="Provider-neutral connector framework, synchronization status, and capability settings."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
        {providers.map((provider) => {
          const conn = getConnectionStatus(data, provider.id);
          const freshness = getFreshnessStatus(data, provider.marketplace);
          const isBusy = busyProvider === provider.id;

          const isBlocked = conn.status === 'NOT_CONFIGURED';

          return (
            <div key={provider.id} className="panel ops-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{provider.name}</h3>
                <span
                  className="demo-badge"
                  style={{
                    backgroundColor:
                      conn.status === 'HEALTHY' || conn.status === 'CONNECTED'
                        ? '#E6F4EA'
                        : conn.status === 'NOT_CONFIGURED'
                          ? '#F1F5F9'
                          : '#FCE8E6',
                    color:
                      conn.status === 'HEALTHY' || conn.status === 'CONNECTED'
                        ? '#137333'
                        : conn.status === 'NOT_CONFIGURED'
                          ? '#475569'
                          : '#C5221F',
                  }}
                >
                  {conn.status}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748B' }}>
                Marketplace: <strong>{provider.marketplace}</strong>
              </p>

              <div>
                <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>Capabilities:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {provider.capabilities.map((cap) => (
                    <span key={cap} className="demo-badge" style={{ fontSize: '0.75rem', backgroundColor: '#F8FAFC', color: '#334155' }}>
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                <p style={{ margin: '0 0 0.25rem 0' }}>
                  Freshness: <strong>{freshness.label}</strong>
                </p>
                <p style={{ margin: 0, color: '#64748B' }}>
                  Last sync: {conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString() : 'Never'}
                </p>
              </div>

              {isBlocked && provider.id !== 'mock-test' && (
                <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem', color: '#92400E' }}>
                  LIVE CONNECTION: BLOCKED — CREDENTIALS / PLATFORM ACCESS REQUIRED
                </div>
              )}

              <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                <Button
                  variant="outline"
                  disabled={isBusy || (isBlocked && provider.id !== 'mock-test')}
                  onClick={() => handleSyncNow(provider.id, provider.marketplace)}
                  style={{ width: '100%' }}
                >
                  {isBusy ? 'Syncing…' : 'Sync Now'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
