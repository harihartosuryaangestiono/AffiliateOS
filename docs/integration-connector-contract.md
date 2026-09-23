# Integration Connector Contract & Developer Specification

## Overview

This document specifies the standard contract for building and registering marketplace integration connectors in AffiliateOS. All connector adapters (Shopee, TikTok, Lazada, Tokopedia, Mock/Test Providers) MUST implement the `ConnectorAdapter` interface and follow the normalization and error handling rules detailed below.

---

## 1. Connector Interface Definition

Every connector adapter MUST implement the `ConnectorAdapter` interface defined in `lib/integrations/types.ts`:

```typescript
export interface ConnectorAdapter {
  /** Unique provider identifier ('shopee', 'tiktok', 'mock-test', etc.) */
  id: ProviderId;

  /** Human-readable display name */
  name: string;

  /** Target marketplace category */
  marketplace: Marketplace;

  /** List of supported capabilities declared by this provider */
  capabilities: Capability[];

  /**
   * Determine connection status based on stored credentials and connection state.
   * If required credentials or environment keys are missing, MUST return 'NOT_CONFIGURED'.
   */
  getStatus(connection?: IntegrationConnection): ConnectionStatus;

  /**
   * Fetch records for a specified capability and date range.
   * Supports cursor-based pagination and rate-limit metadata.
   */
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
```

---

## 2. Supported Capabilities

Connectors declare capabilities using the `Capability` enum:

| Capability | Description | Target Entity / Table |
| :--- | :--- | :--- |
| `PERFORMANCE` | Daily affiliate sales, GMV, order counts, units, commission | `tiktok_performance`, `shopee_performance` |
| `ORDERS` | Individual order line items and status details | `tiktok_performance`, `shopee_performance` |
| `CREATORS` | Creator profile details, handles, handles status | `tiktok_accounts`, `shopee_accounts` |
| `PRODUCTS` | Product catalog items, IDs, names, prices | `products` |
| `STOCK` | Inventory stock level snapshots | `product_stock_snapshots` |
| `COMMISSIONS` | Affiliate commission rates and payouts | `tiktok_performance`, `shopee_performance` |

---

## 3. Data Normalization & Canonical Schema Requirements

Raw records fetched from external marketplace APIs MUST pass through `normalizeIngestionPayload` (`lib/integrations/normalization.ts`). Connectors MUST map fields to the following canonical schema:

### Performance Records (`PERFORMANCE` & `ORDERS`)

| Field | Required | Format / Range | Description |
| :--- | :--- | :--- | :--- |
| `date` | **Yes** | `YYYY-MM-DD` | Reporting date in ISO 8601 string |
| `account_id` / `creator_handle` | **Yes** | String | Marketplace handle or account reference |
| `campaign_id` | **Yes** | UUID | Associated AffiliateOS campaign ID |
| `gmv` | **Yes** | Non-negative Number | Gross Merchandise Value in IDR (plain numeric) |
| `orders` | **Yes** | Non-negative Integer | Total completed affiliate orders |
| `units_sold` | **Yes** | Non-negative Integer | Total units sold |
| `commission` | **Yes** | Non-negative Number | Total affiliate commission earned in IDR |
| `clicks` | Shopee | Non-negative Integer | Product detail page clicks |
| `conversion_rate` | Shopee | Decimal (`0.0` - `1.0`) | Conversion rate (e.g., `0.05` for 5%) |
| `video_count` | TikTok | Non-negative Integer | Videos posted on target date |
| `live_count` | TikTok | Non-negative Integer | Live sessions conducted on target date |

---

## 4. Error Handling & Retry Classification

Connectors MUST throw or return standard error codes classified into `ErrorCategory`:

```typescript
export type ErrorCategory =
  | 'AUTH'        // 401/403 Invalid API Key, expired OAuth token, unauthorized
  | 'RATE_LIMIT'  // 429 Too Many Requests, API quota exhausted
  | 'NETWORK'     // DNS failure, connection timeout, HTTP 502/503/504
  | 'PROVIDER'    // Internal marketplace error, upstream maintenance
  | 'VALIDATION'  // Malformed request payload, invalid date range
  | 'INTERNAL';   // Internal AffiliateOS application error
```

### Retry Guidelines
- `AUTH`: Non-retryable without user intervention (requires credential update).
- `RATE_LIMIT`: Retryable after `rateLimitReset` timestamp or exponential backoff.
- `NETWORK` / `PROVIDER`: Retryable automatically with jittered exponential backoff (max 3 retries).
- `VALIDATION`: Non-retryable (requires code/schema fix).

---

## 5. Security & Isolation Guidelines

1. **Server-Side Credentials**:
   All API keys, secrets, client secrets, and OAuth refresh tokens MUST be read exclusively from server-side environment variables or encrypted Supabase vault entries. NEVER send secrets to client UI components.

2. **Workspace Isolation**:
   All database writes performed during connector syncs MUST tag records with `workspace_id = public.current_workspace()`.

3. **No Web Scraping or Cookie Hijacking**:
   Connectors MUST strictly utilize official partner APIs or sandbox mock data. Emulating user login forms, storing session cookies, or reverse-engineering private Web APIs is explicitly forbidden.
