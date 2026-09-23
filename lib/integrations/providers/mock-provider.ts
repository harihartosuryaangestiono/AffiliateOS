import type { ConnectorAdapter, Capability, ConnectionStatus, IntegrationConnection } from '../types.ts';

export const mockProviderAdapter: ConnectorAdapter = {
  id: 'mock-test',
  name: 'Deterministic Test Mock Connector',
  marketplace: 'Shopee',
  capabilities: ['ORDERS', 'PERFORMANCE', 'STOCK', 'CREATORS', 'COMMISSIONS'],

  getStatus(connection?: IntegrationConnection): ConnectionStatus {
    return connection?.status || 'HEALTHY';
  },

  async fetchRecords(
    capability: Capability,
    period: { start: string; end: string },
    options?: Record<string, unknown>,
  ) {
    if (options?.simulateAuthError) {
      throw new Error('AUTH_EXPIRED: Integration authorization needs renewal.');
    }
    if (options?.simulateRateLimit) {
      throw new Error('RATE_LIMIT_EXCEEDED: Quota exceeded. Retry after 60 seconds.');
    }

    const records: Array<Record<string, unknown>> = [];
    const date = period.start;

    if (capability === 'PERFORMANCE' || capability === 'ORDERS') {
      records.push(
        {
          order_id: `MOCK-ORD-${date}-001`,
          date,
          marketplace: 'Shopee',
          account_username: 'mock_creator_1',
          gmv: 500000,
          orders: 2,
          units_sold: 4,
          commission: 50000,
          status: 'Completed',
        },
        {
          order_id: `MOCK-ORD-${date}-002`,
          date,
          marketplace: 'Shopee',
          account_username: 'mock_creator_2',
          gmv: 350000,
          orders: 1,
          units_sold: 2,
          commission: 35000,
          status: 'Completed',
        },
      );
    } else if (capability === 'STOCK') {
      records.push(
        {
          product_id: 'prod-001',
          marketplace: 'Shopee',
          stock_quantity: 45,
          snapshot_at: date,
        },
        {
          product_id: 'prod-002',
          marketplace: 'Shopee',
          stock_quantity: 5,
          snapshot_at: date,
        },
      );
    }

    return {
      records,
      hasMore: false,
    };
  },
};
