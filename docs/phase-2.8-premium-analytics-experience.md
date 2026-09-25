# AffiliateOS — Phase 2.8: Premium Analytics Experience & Visual Choreography

## 1. Visual Audit & Critique (Pre-Implementation Baseline)

Following the visual critique and inspection of the real application rendered at `/shopee`, `/tiktok`, `/dashboard`, and related workspaces, the following critical issues were identified:

### A. The "Boxes Inside Boxes" Syndrome
1. **Container Proliferation**:
   - The platform header is an independent bordered card with nested bordered pills and action buttons.
   - The period selector is another bordered card with nested bordered pill buttons and custom date inputs.
   - "Executive Movement: What Changed?" is an isolated bordered card with a 6-column grid.
   - The KPI summary is a rigid 4-column grid of 8–10 identical bordered cards, regardless of metric importance.
   - The sub-navigation is another bordered bar.
   - Under every tab, each chart, table, and leaderboard is wrapped in yet another bordered card (`rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs`).
2. **Visual Clutter & Lack of Surface Hierarchy**:
   - Every element has the exact same border color (`#E2E8F0`) and background (`#FFFFFF`), leading to visual monotony.
   - No distinction between primary canvas, focal data, and contextual controls.

### B. Weak Information Hierarchy in Executive Analytics
1. **Equal Weight for Unequal Metrics**:
   - `Affiliate GMV` (the primary North Star metric) is visually identical to `ASP`, `AOV`, or `Clicks`.
   - The operator cannot answer "What happened?" in the first 2 seconds without scanning across 8–10 equal rectangles.
2. **Disjointed "What Changed?" Story**:
   - The current "What Changed?" strip displays raw numbers without connecting:
     `PERFORMANCE (GMV Movement) → WHY (Top Drivers) → RISK (Declines & Stock) → ACTION (Next Steps)`.
3. **Period & Comparison Control Bloat**:
   - Takes up excessive vertical space with stacked rows of preset buttons and comparison dropdowns.
4. **Horizontal Sub-navigation Congestion**:
   - 7 wide tabs with icons and text cause crowding and overflow on viewports under 1440px.

---

## 2. Design System & Surface Architecture

### Four Semantic Surface Levels:
- **Level 0 (App Canvas)**: Atmospheric ambient background (`#F8FAFC` with subtle radial blue/indigo illumination).
- **Level 1 (Analytical Workspace)**: Clean unified surfaces using tonal backgrounds (`#FFFFFF` with soft elevation `--elevation-1`), subtle dividers (`rgba(226, 232, 240, 0.7)`), and generous padding.
- **Level 2 (Elevated Focal Surfaces)**: Primary hero metrics, interactive chart canvases, and critical alerts with subtle elevation (`--elevation-2`) and brand-tailored borders.
- **Level 3 (Overlay & Interactive Surfaces)**: Tooltips, popovers, custom date pickers, and drawers with floating elevation (`--elevation-floating`).

### Container Reduction Strategy:
- Replace ~35% of standalone card borders with tonal grouping, subtle column separators, and typography hierarchy.
- Combine the Platform Header, Period Controls, and Executive Snapshot into a unified, high-density intelligence surface.

---

## 3. Executive Analytics Composition

### A. Platform Intelligence Header
- Prominent platform identity (Shopee: warm amber flame badge; TikTok: obsidian slate badge with cyan micro-accent).
- Compact period status, Jakarta (WIB) timezone confirmation, and live H-2 readiness indicator.
- Unified action suite (Export CSV and Import Data).

### B. Asymmetric Executive Snapshot
- **Dominant Hero Metric**: Affiliate GMV with 32px bold typography, contextual delta badge, absolute change, and mini sparkline.
- **Secondary Metric Strips**:
  - **Core Volume & Reach**: Orders, Units Sold, Selling Creators, Commission.
  - **Unit Economics & Marketplace**: ASP, AOV, Cost Ratio, and channel-specific metrics (Clicks/CR for Shopee; Videos/Live for TikTok).
- Seamless masked vertical number transitions (`y: 8 → 0`) on period switch without layout shift.

### C. Executive Story Layer
- Connects four critical analytical questions:
  1. **WHAT CHANGED**: Net GMV delta & percentage change.
  2. **WHY (DRIVERS)**: Top product driver & top creator driver.
  3. **RISK**: Largest declining entity, creator concentration risk, and stock exposure.
  4. **NEXT ACTION**: Recommended operational check.

---

## 4. Performance Trend & Chart Experience
- Continuous vertical tracking line on hover with dashed guide (`strokeDasharray: '4 4'`).
- Active glowing point marker.
- Rich dual-period comparison tooltip displaying Current vs Comparison, absolute difference, and percentage delta.
- Integrated metric switcher (GMV, Orders, Units, Commission, ASP) and Daily vs Cumulative view toggle.
- Clear explanatory messaging when comparison data is unavailable or has unequal duration.

---

## 5. Navigation Rearchitecture
- Responsive segmented navigation with grouped categories:
  - **Overview**: Overview & Trends
  - **Drivers**: Creators & Affiliates, Products & SKUs, Contribution to Change
  - **Operations**: Campaigns & Brands, Stock Supply Risks, AI Operational Briefing
- Spring-driven sliding pill indicator (`layoutId="analytics-active-tab"`).
