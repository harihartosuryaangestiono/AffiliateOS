# Dinda / AnyMind / Haleon PowerPoint Template

## Source and ownership

The user-supplied `No 4 (Slide 16-21 & 31) .pptx` is stored privately at `report-templates/private/anymind-haleon-weekly-v1.pptx`. It is never served as a static asset. AffiliateOS reads it only inside the authenticated finalized-report export path and writes a new PPTX. The original file remains byte-for-byte unchanged.

- Template ID: `anymind-haleon-weekly-v1`
- Version: `1.0.0`
- Slide mapping: `1.0.0`
- SHA-256: `e194192eff217d9695561f7ad79683ed22d9f1b0cbfdbce88c0fea1ac02a1a1d`
- Source dimensions: 16:9 widescreen
- Source deck: 36 slides

## Complete deck inspection

Slides 1–15 contain the cover, agenda, sell-in/B2C performance, marketplace and brand performance, marketing contribution, livestream, and 9.9 sections. Slides 16–21 contain monthly Shopee affiliate reporting. Slides 22–27 contain B2B and activation sections. Slides 28–31 contain agenda and future initiatives. Slides 32–36 contain closing, appendix, brand sell-in, September initiatives, and an alternate performance slide.

## Relevant slide map

| Source slide | Purpose | Preserved elements | Dynamic use / overflow |
| --- | --- | --- | --- |
| 16 | Affiliate KPI summary | AnyMind logo, color rail, typography, KPI tables, highlight band, page marker | Registered for a future time-series snapshot. Excluded because its primary chart is a raster image and the current snapshot cannot repopulate it safely. |
| 17 | Funnel split | Branding, funnel layout, highlight band | Registered for future funnel data. Excluded because the current snapshot has no authoritative Open/Targeted/Live/Video split. |
| 18 | Brand performance | Branding and brand comparison layout | Registered for future brand-attributed snapshot metrics. Excluded rather than displaying stale source data. |
| 19 | Rank-up program | Branding and tier table | Registered for future rank-program data. Excluded because the snapshot does not store tier membership. |
| 20 | Peak Day comparison | Branding and comparison layout | Registered for a future campaign snapshot. Excluded because the QA snapshot has no comparable Peak Day pair. |
| 21 | Snapshot and operational narrative | AnyMind logo, color rail, headline hierarchy, confidentiality footer | Used. Old report images are removed; period KPIs and finalized manual narratives populate existing text structures. |
| 31 | Q4 activation plan | Branding, planning table and highlight structure | Registered for monthly planning exports. Excluded from weekly export because snapshot data does not contain the plan/budget fields. |

## Snapshot mapping

The export uses `report_snapshots.snapshot_json` exclusively. Slide 21 maps `affiliateGmv`, `commission`, `roi`, `costRatio`, `affiliatesWithSales`, `orders`, `quantity`, period, marketplace, and the manual `what_went_well`, `issues`, and `next_action` fields. Source lineage stays in the immutable report snapshot and Excel export.

The source charts on slides 16–20 are raster images rather than editable PowerPoint charts. AffiliateOS removes the stale image on an included slide instead of presenting historical source data as current. It does not replace that image with a generic chart. Future chart support requires a snapshot time series and a reviewed template version.

## Branding preservation

The export retains the selected original slide, required masters/layouts/theme, embedded AnyMind logo, font runs, colored header rail, table styling, slide dimensions, page markers, and confidentiality footer. It changes text in the copied slide and removes report-specific raster images. Unused source slides, speaker notes, comments, charts, embedded workbooks, and unreferenced source media are pruned from the generated package so hidden template content is not shipped. It does not redraw or download logos.

## Visual QA

The controlled QA export contains one slide. It was rendered at full size and inspected. The AnyMind logo, header hierarchy, table structure, line spacing, margins, and confidentiality footer remain present. Package validation reports zero missing relationships, zero geometry findings, no notes, and one slide; snapshot values, narratives, and removal of unused source parts are also asserted through OOXML tests.
