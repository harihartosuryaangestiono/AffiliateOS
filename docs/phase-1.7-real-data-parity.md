# Phase 1.7 — Real Data Parity and Reporting

Date: 2026-09-22

## Source Inventory

All sources were inspected read-only from outside the repository. No operational workbook was copied into Git, uploaded to Supabase, or written back.

- `[EXT-Haleon] SHP Affiliates Project.xlsx` — 32,983,813 bytes, SHA-256 `e6425fca20b7299553256ad479ddfccb362a16511b2f7ff5570151cf3f0feb11`, 48 worksheets.
- `[INT - Haleon] SHP Affiliate Activity 2026.xlsx` — 468,680 bytes, SHA-256 `580b5616711b61c2e9e12d48e4d369973bec111d6d3cb6a18ca11bf2c2634192`, 13 worksheets.
- `[INT-Haleon] SHP Affiliate Acquisition Tracker.xlsx` — 2,984,744 bytes, SHA-256 `776b7cb3c1968a79a7907555698fd77c0d25890631ce45211097933f28abb2ce`, 15 worksheets.
- `Catatan Dinda  (1).xlsx` — 1,371,170 bytes, SHA-256 `47849242024683cd7169d1370707991319b07dd3f0ff9d3c41f5780a2d4c6513`, 5 worksheets.
- `No 4 (Slide 16-21 & 31) .pptx` — available and visually inspected; 36 slides.

## Source Profiling

`scripts/parity/profile.mjs` is a reusable streaming profiler. It hashes each workbook and records sheet names, visibility, observed dimensions, detected headers, bounded type inference, and formula counts without logging cell values. It processed all four workbooks, including the 41,680 × 77 hidden formula sheet in the external Haleon workbook, without loading creator rows into application state.

Key structures:

- `Catatan Dinda`: Raw TikTok 4,174 × 30; Raw Shopee 2,968 × 38; weekly Haleon/Simba report sheets.
- External Haleon project: 48 worksheets, including visible target/project/SKU/sales/report sheets and hidden monthly summaries; `Sheet55` contains 871,157 formula cells.
- Activity workbook: 13 operational sheets for overview, activities, competition, support, paid affiliates, retention, and projections.
- Acquisition tracker: 15 sheets, including large formula summaries for creator pools. These contain confidential identity/contact fields and are not emitted by the profiler.

Streaming OOXML inspection cannot reliably report merge ranges, so the profiler explicitly reports that field as unavailable rather than inventing a count. Merge/style behavior was separately inspected in the small reporting workbook and rendered output.

## TikTok Business Rules

For the available 1–6 August Simba pair, exact parity requires:

- parse `Time Created` using DD/MM/YYYY;
- include `Order Status = Settled` and exclude fully returned/refunded rows;
- Affiliate Revenue = sum `Actual Commission Base`;
- Qty = sum `Quantity`;
- Affiliate With Sales = distinct normalized `Creator Username` on included rows;
- Total Numbers of Affiliate = distinct normalized creator across all rows in the period;
- Commission = `Actual Commission Payment`, excluding Shop Ads commission;
- ASP, ROI, and Cost Ratio use those same inputs.

The date and commission scope remain business-confirmation items outside this validated template/period.

## Shopee Business Rules

For the available 1–6 August Simba pair, exact parity requires:

- use `Order Time`;
- Affiliate Revenue = gross `Purchase Value(Rp)` where `Verified Status = Valid`;
- Qty = count of Valid, positive-purchase order-item rows;
- Affiliate With Sales = distinct normalized `Affiliate Username` for `Completed + Valid` rows;
- Total Numbers of Affiliate = distinct normalized username across all rows in the period;
- Commission = sum `Item Brand Commission(Rp)` across the period;
- ASP, ROI, and Cost Ratio use those same inputs.

This differs from the Phase 1.6 net-GMV synthetic import. The production rule was not changed because the historical evidence covers only one matching period.

## Canonical Metrics

Definitions and evidence statuses are versioned in `docs/metric-dictionary.md`. Missing external measures remain null/“Source unavailable”; they are never converted to zero.

## Historical Periods Tested

- 2026-08-01–06 Shopee Simba: raw and weekly output pair available; all supported metrics pass.
- 2026-08-01–06 TikTok Simba: raw and weekly output pair available; all supported metrics pass.
- 2026-09-01–06 Shopee/TikTok: output values exist, matching raw export unavailable; blocked.
- 2026-08-01–09 Shopee Haleon: output exists, supplied raw sheet is not attributable to Haleon; blocked.
- Monthly/MTD and month-boundary: matching raw/output pair unavailable; blocked.

Multiple periods were attempted, but historical multi-period validation is factually BLOCKED.

## Reconciliation Results

`scripts/parity/run.ts` produces `parity-results.json` and `parity-results.md`. On the supplied Catatan workbook, 16/16 supported comparisons pass for 1–6 August. The full matrix is in `docs/phase-1.7-parity-matrix.md`.

## Discrepancies

- Shopee historical gross purchase value conflicts with the current operational net-of-refund candidate.
- Shopee historical Qty is an order-item line count, not the sum of the exported `Qty` column.
- TikTok date cells are ambiguous to generic spreadsheet readers; DD/MM is required for parity.
- Store Revenue and target sources are absent from the matching raw sheets.
- September and month-boundary outputs lack matching raw inputs.

No compensating constants or source edits were used.

## Business Questions

Open decisions, evidence, alternatives, and metric impact are recorded in `docs/phase-1.7-business-questions.md`.

## Excel Template Mapping

The server-side Excel generator uses the immutable snapshot and a versioned template definition. The implemented weekly structure contains:

- `Weekly Performance` with period, canonical KPI order, formats, definitions, frozen status, manual narratives, frozen values, landscape print setup, and frozen header rows;
- `Source Lineage` with source, metric basis, covered period, and validation state;
- hidden `Report Metadata` with template/version, marketplace, period, cutoff, finalizer, and timestamp.

The generated `.xlsx` was reopened with ExcelJS and converted by LibreOffice without corruption. Key KPI, metadata, narrative, and lineage cells were verified. Raw source/PII sheets are excluded.

## PowerPoint Template Mapping

The supplied 36-slide reference was rendered and inspected, with particular attention to slides 16–21 and 31. Observable conventions include a 16:9 canvas, thin colored top rule, blue section headers, white data canvas, compact KPI tables, right-side Key Highlights, comparison charts/tables, confidential footer, and separate recap/action slides.

The implemented snapshot-driven PowerPoint contains cover, performance/KPI with Key Highlights, manual narrative review, and source lineage. It follows the evidenced hierarchy and spacing without copying AnyMind/Haleon branding into AffiliateOS. The generated deck was reopened as OOXML, all four slides were rendered, and `slides_test.py` reported no overflow. It is structurally supported by the reference; exact corporate-brand parity is outside the available AffiliateOS asset scope.

## Cross-format Consistency

The in-app report, Excel, and PowerPoint all read the same frozen `report_snapshots.snapshot_json`. Export functions do not query live performance or recalculate business metrics. Automated checks assert the same Affiliate Revenue and supporting values appear in the generated files, along with the same narratives and lineage.

## Security

- Export requires an authenticated profile/workspace membership.
- Report and snapshot queries are constrained to the authenticated profile's workspace and remain subject to RLS.
- Draft reports return HTTP 409; only finalized snapshots export.
- Downloads use private, no-store responses and sanitized filenames.
- Export events contain report ID, type, template ID/version, actor, and timestamp only.
- `report_exports` is workspace-scoped, RLS-protected, and immutable.
- No source filesystem path or row content is exposed.

The additive migration `202609220001_reporting_v2.sql` was applied without resetting or reseeding the database. An authenticated Affiliate Manager downloaded both formats from the existing finalized QA report. Two immutable `report_exports` rows and matching `Excel exported` / `PowerPoint exported` activity entries were verified. The current `chatgpt.site` bundle was intentionally not redeployed because the phase brief names Vercel as the later deployment target.

## Tests

Automated coverage includes marketplace-specific historical parsing, status/verification inclusion, refund-policy distinction, date cutoff, normalized creator identity, missing-vs-zero behavior, rounding tolerance, parity results, finalized snapshot template version, Excel generation/reopen, PowerPoint generation/reopen, cross-format frozen metrics/narratives/lineage, endpoint workspace constraints, finalized-only behavior, RLS policy, and immutable audit.

The existing Phase 1.6 tests for Auth-adjacent roles, import validation, duplicate evidence, TikTok/Shopee isolation, H-2, dashboard metrics, snapshot immutability, lineage, HSL/stock/sample, acquisition/outreach, and Peak Day remain in the regression suite.

## Known Limitations

- Only one raw/output period pair is available for exact metric parity.
- Store Revenue and target sources are unavailable for the matching raw period.
- Historical report charts do not expose a complete machine-readable mapping back to raw rows.
- The generated deck follows the reference structure but does not reproduce third-party corporate branding.
- Real workbooks remain offline and are not accepted by the production import path in this phase.
- Migration and deployed authenticated export acceptance are not performed here.

## Remaining Business Confirmations

- production Shopee GMV/refund semantics;
- Shopee Qty meaning;
- official reporting timestamps and timezone per marketplace;
- TikTok commission scope;
- store revenue/target ownership;
- comparable-period rule;
- cross-marketplace creator identity;
- a second matching raw/output period, preferably including month boundary or MTD.
