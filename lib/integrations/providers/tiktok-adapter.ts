import type { ConnectorAdapter, Capability, ConnectionStatus, IntegrationConnection } from '../types.ts';

export const tiktokAdapter: ConnectorAdapter = {
  id: 'tiktok',
  name: 'TikTok Shop File Export Workflow',
  marketplace: 'TikTok',
  capabilities: ['ORDERS', 'PERFORMANCE', 'CREATORS', 'COMMISSIONS'],

  getStatus(connection?: IntegrationConnection): ConnectionStatus {
    if (connection?.status) return connection.status;
    return 'FILE_IMPORT';
  },

  async fetchRecords(
    _capability: Capability,
    _period: { start: string; end: string },
  ) {
    throw new Error('DIRECT API NOT USED: Import TikTok export files through Import Center instead.');
  },
};
