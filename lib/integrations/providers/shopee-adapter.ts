import type { ConnectorAdapter, Capability, ConnectionStatus, IntegrationConnection } from '../types.ts';

export const shopeeAdapter: ConnectorAdapter = {
  id: 'shopee',
  name: 'Shopee File Export Workflow',
  marketplace: 'Shopee',
  capabilities: ['ORDERS', 'PERFORMANCE', 'STOCK', 'CREATORS', 'COMMISSIONS'],

  getStatus(connection?: IntegrationConnection): ConnectionStatus {
    if (connection?.status) return connection.status;
    return 'FILE_IMPORT';
  },

  async fetchRecords(
    _capability: Capability,
    _period: { start: string; end: string },
  ) {
    throw new Error('DIRECT API NOT USED: Import Shopee export files through Import Center instead.');
  },
};
