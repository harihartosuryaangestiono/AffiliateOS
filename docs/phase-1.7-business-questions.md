# Phase 1.7 Business Questions

## BQ-01 — Shopee GMV and refund basis

- **Observed evidence:** `Weekly SHP Simba` for 1–6 August equals gross `Purchase Value(Rp)` for `Verified Status = Valid`. It does not equal `Purchase Value - Refund Amount`.
- **Current AffiliateOS behavior:** Phase 1.6 operational import uses net purchase value after refund.
- **Possible interpretations:** the historical workbook reports gross attributed GMV; refunds are recognized in another period; cancelled rows already carry zero purchase value; or Simba and production use different conventions.
- **Effect:** Affiliate GMV, ASP, ROI, cost ratio, contribution, and growth.
- **Status:** NEEDS DINDA CONFIRMATION before changing production semantics.

## BQ-02 — Shopee official reporting timestamp

- **Observed evidence:** the tested weekly output reconciles with `Order Time` for 1–6 August. `Order Completed Time`, `Conversion Completed Time`, and `Deduction Time` are also present.
- **Current AffiliateOS behavior:** imported performance date follows the mapped source date.
- **Possible interpretations:** attribution by order creation, completion, conversion completion, or deduction.
- **Effect:** period membership, H-2 cutoff, refunds, and growth.
- **Status:** NEEDS DINDA CONFIRMATION for periods beyond the tested week.

## BQ-03 — Shopee Qty definition

- **Observed evidence:** historical Qty 420 equals the count of Valid rows with positive Purchase Value. It does not equal exported `Qty` (614 on all Valid rows) or Completed+Valid row count (419).
- **Current AffiliateOS behavior:** synthetic import maps and sums the exported unit field.
- **Possible interpretations:** number of attributed order-item lines, number of valid conversions, or a report-specific quantity definition.
- **Effect:** Qty and ASP.
- **Status:** NEEDS DINDA CONFIRMATION before replacing operational units.

## BQ-04 — TikTok DD/MM parsing and official date

- **Observed evidence:** interpreting the supplied `Time Created` values as DD/MM reproduces the 1–6 August report exactly. Spreadsheet readers may expose these cells as ambiguous dates.
- **Current AffiliateOS behavior:** ISO dates are required by the controlled import path.
- **Possible interpretations:** `Time Created` in Jakarta time is authoritative; Payment Time or Commission Paid time controls later reporting.
- **Effect:** every time-bucketed TikTok metric and H-2.
- **Status:** NEEDS DINDA CONFIRMATION; historical parser preserves the evidenced DD/MM rule.

## BQ-05 — TikTok commission scope

- **Observed evidence:** historical Commission equals `Actual Commission Payment` and excludes `Actual Shop Ads commission payment`.
- **Current AffiliateOS behavior:** commission is a single mapped field.
- **Possible interpretations:** standard commission only; standard plus Shop Ads; advertiser expense; platform-specific total.
- **Effect:** Commission, ROI, and Cost Ratio.
- **Status:** NEEDS DINDA CONFIRMATION for non-Simba templates.

## BQ-06 — Store Revenue and target ownership

- **Observed evidence:** weekly report sheets contain Store Revenue and sometimes targets, but raw payment-order sheets do not. Some target formulas evaluate against blank cells.
- **Current AffiliateOS behavior:** targets come from configured metric targets/campaigns; no canonical store-revenue import exists.
- **Possible interpretations:** manually supplied commercial report, marketplace seller-center export, or separate brand workbook.
- **Effect:** contribution to Store GMV and target achievement.
- **Status:** NEEDS DINDA CONFIRMATION and matching source file.

## BQ-07 — Comparable period and monthly boundary

- **Observed evidence:** available raw/output parity is limited to 1–6 August. September output exists without matching raw data; no matching month-boundary pair was found.
- **Current AffiliateOS behavior:** comparison uses the same day count in the previous calendar month.
- **Possible interpretations:** same date span, same weekday span, campaign-aligned span, or H-2-aligned MTD.
- **Effect:** growth and narrative interpretation.
- **Status:** NEEDS DINDA CONFIRMATION and additional historical raw export.

## BQ-08 — Total affiliate identity

- **Observed evidence:** normalized marketplace usernames reproduce the tested output. Acquisition workbooks also contain names, contacts, IDs, and multiple account lists.
- **Current AffiliateOS behavior:** creator accounts map to a canonical creator ID.
- **Possible interpretations:** marketplace username, affiliate ID, creator ID, or cross-account person.
- **Effect:** total affiliates and affiliates with sales.
- **Status:** NEEDS DINDA CONFIRMATION for cross-marketplace deduplication; single-marketplace weekly rule is confirmed.
