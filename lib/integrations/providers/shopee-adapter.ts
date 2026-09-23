import type { ConnectorAdapter, Capability, ConnectionStatus, IntegrationConnection } from '../types.ts';

export const shopeeAdapter: ConnectorAdapter = {
  id: 'shopee',
  name: 'Shopee Open Platform Connector',
  marketplace: 'Shopee',
  capabilities: ['ORDERS', 'PERFORMANCE', 'STOCK', 'CREATORS', 'COMMISSIONS'],

  getStatus(connection?: IntegrationConnection): ConnectionStatus {
    if (connection?.status) return connection.status;
    return 'NOT_CONFIGURED';
  },

  async fetchRecords(
    _capability: Capability,
    _period: { start: string; end: string },
  ) {
    // Live credentials check: if no live access is configured, throw a clear blocked error
    throw new Error('LIVE CONNECTION: BLOCKED — CREDENTIALS / PLATFORM ACCESS REQUIRED');
  },
};
