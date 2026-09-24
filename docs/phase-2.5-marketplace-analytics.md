# AffiliateOS — Phase 2.5: Marketplace Analytics, Deep Performance Analysis & Period Comparison

**Product Baseline:** Phase 2.4 Verified  
**Status:** Implemented & Verified (94/94 Automated Tests Pass, TypeScript Clean, Oxlint Clean, Production Build Clean)  
**Timezone Baseline:** Asia/Jakarta (WIB) Strictly Enforced  

---

## 1. Executive Summary & Purpose

Phase 2.5 introduces a deterministic, operator-grade analytics workspace for each supported marketplace:
- **Shopee Analytics** (`/shopee` and `/analytics/shopee`)
- **TikTok Shop Analytics** (`/tiktok` and `/analytics/tiktok`)

The workspace is designed for an Affiliate Operations Manager (e.g. Dinda) to answer key operational questions deterministically:
1. **What happened?** Clear, executive KPI strip and time-series trends.
2. **How much did performance change?** Absolute and percentage deltas with semantic directionality.
3. **Which creators and products drove the change?** Ranked growth drivers by absolute GMV movement.
4. **Which areas declined?** Ranked decline drivers and unmapped SKU warnings.
5. **Is performance concentrated among few entities?** Full-population 80/20 Pareto analysis and Creator Concentration Risk gauges (Top 1, 5, 10 shares).
6. **What should the operator investigate?** Stock supply risk correlation (High GMV + Critical Stock) and H-2 readiness telemetry.
7. **How does the selected period compare with another period?** Normalized dual-trend comparison, same-duration enforcement, and Same-Day MTD comparison.

---

## 2. Core Architecture & Modules

The analytics architecture is strictly separated into a deterministic domain layer (`lib/analytics/`) and clean presentation components (`components/analytics/`):

```
AffiliateOS Data (WorkspaceData)
        │
        ▼
lib/analytics/periods.ts         ◄── Asia/Jakarta (WIB) calendar & rolling ranges
lib/analytics/comparison.ts      ◄── Period comparison engine (same-duration math)
lib/analytics/metrics.ts         ◄── Safe division, semantic directionality, delta classification
lib/analytics/timeseries.ts      ◄── Dual-period daily & cumulative normalization
lib/analytics/pareto.ts          ◄── Deterministic 80/20 against TOTAL population GMV
lib/analytics/creators.ts        ◄── Leaderboards & concentration risk classification
lib/analytics/products.ts        ◄── Product performance & contribution table
lib/analytics/contribution.ts    ◄── Decomposition of net change (drivers, new, lost)
lib/analytics/brands.ts          ◄── Data mart product-to-brand aggregation
lib/analytics/campaigns.ts       ◄── Target achievement & creator intensity
lib/analytics/stock.ts           ◄── SKU supply risk correlation (snapshots)
lib/analytics/coverage.ts        ◄── H-2 readiness & fair comparison evaluation
lib/analytics/distribution.ts    ◄── Statistical percentiles (mean, median, P25, P75, P90)
        │
        ▼
lib/analytics/engine.ts          ◄── Master deterministic orchestrator
        │
        ▼
components/analytics/
  ├── marketplace-analytics.tsx  ◄── Master workspace container & navigation
  ├── period-selector.tsx        ◄── Presets, custom range, comparison selector
  ├── kpi-comparison-strip.tsx   ◄── KPI cards with deltas & definition tooltips
  ├── trend-chart.tsx            ◄── Dual-period area chart with cumulative toggle
  ├── pareto-chart.tsx           ◄── 80/20 composed bar/line chart with 80% line
  ├── creator-leaderboards.tsx   ◄── Leaderboard tabs & concentration risk card
  ├── product-analytics-table.tsx◄── Searchable, sortable, paginated SKU table
  ├── contribution-breakdown.tsx ◄── Decomposition into positive/negative drivers
  ├── brand-campaign-section.tsx ◄── Brand & campaign performance cards
  ├── stock-correlation-section.tsx◄── Critical & Low stock warnings
  └── ai-insights-card.tsx       ◄── Grounded Gemini operational briefing
```

---

## 3. Period & Comparison Semantics

All dates and calendar calculations strictly execute within the **Asia/Jakarta (WIB / UTC+7)** timezone.

### Period Modes
- `TODAY`: Current calendar day in WIB.
- `YESTERDAY`: Immediately preceding calendar day in WIB.
- `LAST_7_DAYS`: Rolling 7 days ending today.
- `LAST_30_DAYS`: Rolling 30 days ending today.
- `THIS_WEEK`: ISO Monday of current week through today.
- `LAST_WEEK`: Full previous ISO Monday through Sunday (7 days).
- `THIS_MONTH`: First day of current month (01) through today (MTD).
- `LAST_MONTH`: Full previous calendar month (e.g. 01–31 Aug).
- `CUSTOM_DATE_RANGE`: Explicit start and end date chosen by operator.

### Comparison Modes
- `PREVIOUS_PERIOD`: Exactly the same duration in calendar days immediately preceding the current period start date.
  - Example: Current `15–21 Sep` (7 days) ➔ Comparison `08–14 Sep` (7 days).
  - Example: Current `01–10 Sep` (10 days) ➔ Comparison `22–31 Aug` (10 days).
- `PREVIOUS_WEEK`: Shifted 7 calendar days back.
- `PREVIOUS_MONTH`: Full previous calendar month.
- `SAME_DAY_PREVIOUS_MONTH`: Same-Day MTD comparison.
  - Example: Current `01–24 Sep` (24 days) ➔ Comparison `01–24 Aug` (24 days).
  - Avoids comparing incomplete MTD against full previous month without context.
- `CUSTOM_PERIOD`: Arbitrary comparison range. Automatically validates duration equality and issues a **Fair Comparison Warning** if durations differ.
- `NO_COMPARISON`: Disables comparison calculations.

---

## 4. Metric Availability & Safe Math Principles

In accordance with the Data Availability Principle:
1. **Never fabricate missing metrics**: If a metric is not present in the canonical export, its status is marked `SOURCE_UNAVAILABLE` or `PARTIALLY_SUPPORTED`. Missing values are never converted to zero.
2. **Safe Division**: Zero denominators return `null` instead of `Infinity` or `NaN`.
3. **Semantic Directionality**:
   - For standard metrics (GMV, Orders, Units, Commission), an increase is favorable (`UP` / green).
   - For cost and return metrics (Refund Rate, Cancellation Rate, Cost Ratio), an increase is unfavorable (`UP` / red).
4. **Change Classification**:
   - `STRONG_INCREASE`: $\ge +15\%$
   - `INCREASE`: $+3\%$ to $+15\%$
   - `STABLE`: $-3\%$ to $+3\%$
   - `DECREASE`: $-15\%$ to $-3\%$
   - `STRONG_DECREASE`: $\le -15\%$

---

## 5. Pareto & Concentration Analysis

Unlike standard commercial tools that compute Pareto percentages against only the top 10 displayed items, AffiliateOS computes Pareto cumulative percentages against the **TOTAL RELEVANT POPULATION GMV**:
$$\text{Cumulative \%} = \frac{\sum_{i=1}^{k} \text{GMV}_i}{\text{Total Population GMV}} \times 100$$

- An explicit reference line is drawn at **80%**.
- Generates a deterministic insight: e.g. *"12 of 45 selling creators contribute 80% of Shopee Affiliate GMV."*
- **Creator Concentration Risk**:
  - `HIGH`: Top 1 creator generates $\ge 40\%$ OR Top 5 generate $\ge 70\%$ of GMV.
  - `MODERATE`: Top 1 creator generates $25-40\%$ OR Top 5 generate $50-70\%$ of GMV.
  - `LOW`: Diversified revenue across long-tail creators.

---

## 6. Growth & Decline Drivers

Growth and decline drivers are ranked by **ABSOLUTE GMV DELTA**:
$$\Delta \text{GMV} = \text{Current GMV} - \text{Comparison GMV}$$

Ranking by absolute delta prevents tiny entities with small baselines (e.g., Rp 10.000 growing to Rp 50.000 = +400%) from distorting operational focus away from high-impact volume movers.
- **New Contributors**: Zero GMV in comparison period, positive GMV in current period.
- **Lost Contributors**: Positive GMV in comparison period, zero GMV in current period.

---

## 7. Data Coverage & Stock Telemetry

- **H-2 Cutoff Telemetry**: Validates whether imported data is complete through the required H-2 cutoff date.
- **Fair Comparison Warning**: Displayed whenever the current period contains fewer imported days than the comparison period.
- **Stock Snapshot Telemetry**: Displays "Latest Imported Stock" and links high-velocity SKUs with Critical/Low stock to the Action Center.

---

## 8. Gemini AI Guardrails & Grounding

- **Role**: Assistive operational analysis only.
- **Strict Boundary**: Gemini **NEVER** calculates GMV, growth, contribution, ROI, or Pareto values.
- **Grounding**: Gemini receives only pre-calculated, deterministic summaries and produces:
  - Executive summary
  - Growth drivers context
  - Decline drivers analysis
  - Operational supply/creator risks
  - Recommended next checks
  - Stated analytical limitations

---

## 9. Test Verification Matrix

All 94 automated tests execute cleanly in **650ms**:

| Test Group | Tests | Result |
| :--- | :--- | :--- |
| Period Engine (WIB, boundaries, leap year) | 5 | **PASS** |
| Comparison Engine (same-duration, same-day MTD) | 4 | **PASS** |
| Metrics Engine & Safe Math (no NaN, semantic dir) | 3 | **PASS** |
| Pareto Engine (80/20 against full population) | 1 | **PASS** |
| Growth & Decline Drivers (absolute delta ranking) | 1 | **PASS** |
| Marketplace Isolation (Shopee/TikTok separation) | 1 | **PASS** |
| Report Metric Parity (identical to canonical sum) | 1 | **PASS** |
| No Fabricated Data (honest zero-state) | 1 | **PASS** |
| Distribution Analysis (median, P25, P75, P90) | 1 | **PASS** |
| Baseline Operational Intelligence & Reporting | 76 | **PASS** |
| **Total Automated Tests** | **94** | **100% PASS** |
