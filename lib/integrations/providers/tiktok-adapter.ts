import type { ConnectorAdapter, Capability, ConnectionStatus, IntegrationConnection } from '../types.ts';

export const tiktokAdapter: ConnectorAdapter = {
  id: 'tiktok',
  name: 'TikTok Shop Partner Connector',
  marketplace: 'TikTok',
  capabilities: ['ORDERS', 'PERFORMANCE', 'CREATORS', 'COMMISSIONS'],

  getStatus(connection?: IntegrationConnection): ConnectionStatus {
    if (connection?.status) return connection.status;
    return 'NOT_CONFIGURED';
  },

  async fetchRecords(
    _capability: Capability,
    _period: { start: string; end: string },
  ) {
    throw new Error('LIVE CONNECTION: BLOCKED — CREDENTIALS / PLATFORM ACCESS REQUIRED');
  },
};
