# Dinda / AnyMind / Haleon PowerPoint Template

## Source and ownership

The user-supplied `No 4 (Slide 16-21 & 31) .pptx` is stored privately at `report-templates/private/anymind-haleon-weekly-v1.pptx`. It is never served as a static asset. AffiliateOS reads it only inside the authenticated finalized-report export path and writes a new PPTX. The original file remains byte-for-byte unchanged.

- Template ID: `anymind-haleon-weekly-v1`
- Version: `1.0.0`
- Slide mapping: `1.9.0`
- SHA-256: `e194192eff217d9695561f7ad79683ed22d9f1b0cbfdbce88c0fea1ac02a1a1d`
- Source dimensions: 16:9 widescreen
- Source deck: 36 slides

## Complete deck inspection

Slides 1–15 contain the cover, agenda, sell-in/B2C performance, marketplace and brand performance, marketing contribution, livestream, and 9.9 sections. Slides 16–21 contain monthly Shopee affiliate reporting. Slides 22–27 contain B2B and activation sections. Slides 28–31 contain agenda and future initiatives. Slides 32–36 contain closing, appendix, brand sell-in, September initiatives, and an alternate performance slide.

## Phase 1.9 Slide Map & Readiness

| Source slide | Purpose | Preserved elements | Phase 1.9 Integration Status |
| --- | --- | --- | --- |
| 16 | Affiliate KPI summary | AnyMind logo, color rail, typography, KPI tables, highlight band, page marker | `SUPPORTED` — Populated from frozen time-series data & KPI summary. Non-logo raster image removed and updated with period metrics. |
| 17 | Funnel split | Branding, funnel layout, highlight band | `PARTIALLY_SUPPORTED` — Channel split (Live / Video / Share Link) populated. Open/Targeted tier split marked `BUSINESS_CONFIRMATION_REQUIRED`. |
| 18 | Brand performance | Branding and brand comparison layout | `SUPPORTED` — Populated using product-to-brand master mappings (`brand_mappings`). |
| 19 | Rank-up program | Branding and tier table | `SOURCE_UNAVAILABLE` — Excluded from dynamic deck assembly because AffiliateOS does not store tier target baselines. Data contract exists without fabricated rank data. |
| 20 | Peak Day comparison | Branding and comparison layout | `SUPPORTED` — Populated from Peak Day campaign performance (e.g., 9.9 vs 8.8 double dates / paydays). |
| 21 | Snapshot and operational narrative | AnyMind logo, color rail, headline hierarchy, confidentiality footer | `SUPPORTED` — Populated with period KPIs and finalized manual narratives (`what_went_well`, `issues`, `next_action`). |
| 31 | Q4 activation plan | Branding, planning table and highlight structure | `PARTIALLY_SUPPORTED` — Included for monthly profiles when monthly planning records exist. |

## Snapshot & Data Mart Mapping

The export uses `report_snapshots.snapshot_json` and its embedded `reportDataset` exclusively. Every exported value comes from the frozen dataset.

Source raster charts on slides 16–20 are removed from included slides so that stale source template images are never displayed.

## Branding preservation

The export retains the selected original slides, required masters/layouts/theme, embedded AnyMind logo, font runs, colored header rail, table styling, slide dimensions, page markers, and confidentiality footer. Unused source slides, speaker notes, comments, charts, embedded workbooks, and unreferenced source media are pruned from the generated package so hidden template content is not shipped.
