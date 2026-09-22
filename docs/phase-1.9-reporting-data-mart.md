# Phase 1.9 — Reporting Data Mart, Historical Series & Full AnyMind/Haleon Deck Generation

## Executive Summary

Phase 1.9 establishes an additive, reproducible **Reporting Data Mart** and **Report Dataset** architecture in AffiliateOS. It solves the data model problem for multi-slide reporting exports by freezing historical time series, marketplace aggregations, creator funnels, brand attribution, Peak Day comparisons, and activation planning into immutable dataset contracts.

All outputs strictly maintain the requirement:
```
Human Business Confirmations: DEFERRED BY USER
```
No deferred answers are fabricated, and production metric definitions remain untouched.

---

## Data Contracts & Slide Readiness

For every target slide in the AnyMind / Haleon template deck (`report-templates/private/anymind-haleon-weekly-v1.pptx`), AffiliateOS defines an authoritative contract:

| Slide | Title | Classification | Data Source | Preserved / Dynamically Generated |
| --- | --- | --- | --- | --- |
| 16 | Affiliate KPI Summary | `SUPPORTED` | Time Series & Performance Engine | Table + generated historical chart when authoritative series exists. |
| 17 | Funnel Split | `PARTIALLY_SUPPORTED` | Channel Metrics (Live/Video/Share Link) | Channel split populated; Open vs Targeted tier split marked `BUSINESS_CONFIRMATION_REQUIRED`. |
| 18 | Brand Performance | `SUPPORTED` | Brand Master Mapping (`brand_mappings`) | Brand aggregated GMV, orders, quantity, commission, and contribution %. |
| 19 | Rank-up Program | `SOURCE_UNAVAILABLE` | N/A | Excluded from deck assembly without fabricated rank data. |
| 20 | Peak Day Comparison | `SUPPORTED` | Peak Day Campaigns & Daily Performance | Compares double dates (e.g., 9.9 vs 8.8) or paydays. |
| 21 | Operational Narrative | `SUPPORTED` | Finalized Manual Narratives & Snapshot KPIs | Preserves existing Phase 1.8 functionality. |
| 31 | Q4 Activation Plan | `PARTIALLY_SUPPORTED` | Monthly Plans | Populated when monthly planning records exist; budget left empty if unconfigured. |

---

## Architecture & Data Flow

```
NORMALIZED PERFORMANCE
         +
     CAMPAIGNS
         +
      CREATORS
         +
        HSL
         +
       STOCK
         +
      PEAK DAY
         +
REPORTING CONFIGURATION
         ↓
   REPORT DATASET (`buildReportDataset`)
         ↓
  FINALIZED REPORT SNAPSHOT (`report_snapshots`)
         ↓
  ANYMIND TEMPLATE ASSEMBLE (`buildAnyMindPowerPoint`)
         ↓
FULL WEEKLY / MONTHLY PPTX & EXCEL EXPORTS
```

---

## Template Immutability & Dynamic Slide Assembly

- The original template `report-templates/private/anymind-haleon-weekly-v1.pptx` remains byte-for-byte unchanged (SHA-256: `e194192eff217d9695561f7ad79683ed22d9f1b0cbfdbce88c0fea1ac02a1a1d`).
- Supported slides (16, 17, 18, 20, 21, 31) are dynamically updated from frozen `reportDataset` values.
- Non-logo raster image placeholders from template slides are removed to prevent shipping stale source images.
- Unsupported slides (Slide 19) and profile-excluded slides are pruned cleanly from XMLs, relationships, presentation slide lists, Content Types, and media packages.
- Zero stale source template numbers remain in exported decks.

---

## Security & Audit

- **RLS Isolation**: `report_datasets` and `brand_mappings` tables enforce workspace isolation (`workspace_id = public.current_workspace()`).
- **Immutability**: `protect_report_dataset()` database trigger prevents updates or deletions of finalized dataset records.
- **Audit Logging**: Dataset generation and PowerPoint/Excel exports emit structured audit entries into `public.activity_logs`.
