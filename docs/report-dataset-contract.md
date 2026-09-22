# Report Dataset Contract Specification

## Overview

The `ReportDataset` is the immutable, frozen JSON payload backing all reporting views, PowerPoint decks, and Excel exports in AffiliateOS (Phase 1.9).

## Schema (`1.0.0`)

```typescript
export type ReportDataset = {
  schemaVersion: string; // e.g. "1.0.0"
  generatedAt: string; // ISO 8601 UTC timestamp
  generatedBy: string; // Actor name
  reportId: string;
  reportName: string;
  marketplace: string;
  period: { start: string; end: string; cutoff: string };
  businessConfirmationNote: string; // "Human Business Confirmations: DEFERRED BY USER"
  kpiSummary: {
    current: Record<string, number | null>;
    previous: Record<string, number | null>;
    growth: Record<string, number | null>;
  };
  timeSeries: Array<{
    date: string;
    marketplace: string;
    affiliateGmv: number | null;
    orders: number | null;
    quantity: number | null;
    affiliatesWithSales: number | null;
    totalAffiliates: number | null;
    commission: number | null;
    asp: number | null;
    abs: number | null;
    roi: number | null;
    costRatio: number | null;
    storeRevenue: number | null;
    contribution: number | null;
    target: number | null;
  }>;
  funnel: {
    classification: DataClassification;
    open: { gmv: number | null; affiliates: number | null; contribution: number | null };
    targeted: { gmv: number | null; affiliates: number | null; contribution: number | null };
    channels: {
      live: { gmv: number | null; affiliates: number | null; sessions: number | null };
      video: { gmv: number | null; affiliates: number | null; videos: number | null };
      shareLink: { gmv: number | null; affiliates: number | null };
    };
    reason: string;
  };
  brandPerformance: {
    classification: DataClassification;
    rows: Array<{
      brand_id: string | null;
      brand_name: string;
      gmv: number;
      orders: number;
      quantity: number;
      commission: number;
      affiliates: number;
      growth: number | null;
      contribution: number | null;
      mapping_status: 'mapped' | 'unmapped' | 'ambiguous';
    }>;
    reason: string;
  };
  peakDayComparison: {
    classification: DataClassification;
    currentPeakDay: PeakDayMetrics | null;
    comparisonPeakDay: PeakDayMetrics | null;
    growth: Record<string, number | null> | null;
    reason: string;
  };
  activationPlanning: {
    classification: DataClassification;
    initiatives: Array<{
      name: string;
      creatorsTarget: number | null;
      contentTarget: string | null;
      budget: number | null;
    }>;
    totalBudget: number | null;
    totalCreators: number | null;
    reason: string;
  };
  operationalNarratives: {
    what_went_well: string;
    issues: string;
    next_action: string;
  };
  sourceLineage: Array<{
    id: string;
    marketplace: string;
    filename: string;
    period_start: string;
    period_end: string;
    sales_metric: string;
    status: string;
  }>;
  completeness: Array<{
    section: string;
    percentage: number;
    status: 'READY' | 'PARTIAL' | 'SOURCE_UNAVAILABLE' | 'NEEDS_CONFIRMATION';
  }>;
  slideReadiness: Array<SlideContract>;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
};
```
