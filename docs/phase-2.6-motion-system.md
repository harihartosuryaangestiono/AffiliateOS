# AffiliateOS — Phase 2.6: Premium Motion System, Fluid Navigation & Micro-Interactions

## 1. Executive Summary & Motion Philosophy

AffiliateOS Phase 2.6 is a product-wide motion and interaction-quality overhaul. It introduces a centralized, GPU-accelerated motion architecture that makes the entire platform feel **fast, fluid, premium, cohesive, subtle, and native-app-like**.

### Core Philosophy
1. **Purpose-Driven**: Motion is never decorative or gimmicky. Every transition communicates spatial hierarchy, state mutation, or visual continuity.
2. **Subtle & Restrained**: No large bouncing, no flashy loops, no full-screen sliding.
3. **GPU-Friendly**: Only `transform` and `opacity` are animated to ensure 60fps performance on normal office laptops without triggering layout thrashing or cumulative layout shifts (CLS).
4. **Persistent App Shell**: The Sidebar and Top Command Bar form a persistent shell that never remounts or re-enters during navigation.
5. **Immediate Feedback**: Navigation, button clicks, and mutations respond immediately with tactile micro-interactions (`active:scale-[0.98]`).
6. **Full Reduced-Motion Support**: Complete compliance with `prefers-reduced-motion: reduce` across both CSS and Framer/Motion.

---

## 2. Centralized Motion Tokens

All semantic motion properties are centralized in [`lib/motion/tokens.ts`](file:///Users/harihartosurya/Developer/AffiliateOS/web/lib/motion/tokens.ts) and mirrored in CSS variables in [`app/visual-system.css`](file:///Users/harihartosurya/Developer/AffiliateOS/web/app/visual-system.css).

### Duration Tiers
| Tier | Duration (s) | Duration (ms) | Target Use Case |
|---|---|---|---|
| **Instant** | `0.1s` | `100ms` | Checkbox toggles, button active presses, badge updates |
| **Fast** | `0.16s` | `160ms` | Hover surface changes, tooltips, small popovers, chip removals |
| **Standard** | `0.22s` | `220ms` | Tab sliding pills, dropdown menus, segmented controls, card reorders |
| **Emphasis** | `0.28s` | `280ms` | Modal dialogs, drawer entrances, summary cards |
| **Page** | `0.24s` | `240ms` | Workspace route transitions (`opacity: 0 → 1`, `translateY: 8px → 0`) |

### Non-Linear Easing Curves
- **Natural Deceleration (Entrance)**: `cubic-bezier(0.16, 1, 0.3, 1)` (`easeOutExpo`) — snappy arrival with a soft, natural landing.
- **Snappy Acceleration (Exit)**: `cubic-bezier(0.55, 0.085, 0.68, 0.53)` (`easeInQuad`) — elements depart cleanly without lingering.
- **Smooth Continuous**: `cubic-bezier(0.4, 0, 0.2, 1)` (`easeInOutSmooth`) — for continuous indicators and segmented controls.

### Calibrated Organic Springs
- **`snappy`**: `{ type: 'spring', stiffness: 450, damping: 32, mass: 0.8 }` — active sidebar indicator and tab pills.
- **`smooth`**: `{ type: 'spring', stiffness: 350, damping: 30, mass: 1 }` — drawers and modals.
- **`gentle`**: `{ type: 'spring', stiffness: 280, damping: 24, mass: 1 }` — card hover and elevation states.

---

## 3. Architecture & Implementation

### 3.1 Persistent App Shell & Route Transitions
- **File**: [`components/layout/app-shell.tsx`](file:///Users/harihartosurya/Developer/AffiliateOS/web/components/layout/app-shell.tsx)
- **Wrapper**: [`components/motion/route-transition.tsx`](file:///Users/harihartosurya/Developer/AffiliateOS/web/components/motion/route-transition.tsx)
- The persistent navigation shell `<Sidebar>` and topbar `<header>` remain completely stationary across route changes.
- Content inside `<main id="workspace-content">` is wrapped with `<RouteTransition pathname={path}>`, animating subtly from `opacity: 0, translateY: 8px` to `opacity: 1, translateY: 0` in `240ms`.

### 3.2 Sidebar Selection Motion
- **Shared Layout Pill**: The active royal-blue background uses `<motion.div layoutId="sidebar-active-indicator" ... />`. As the user clicks between sidebar items, the selection pill slides fluidly along the sidebar.
- **Icon Micro-Interactions**: Icons subtly scale `scale 1 → 1.05` on hover with a 150ms transition.
- **Badge Animations**: Counter updates (e.g. Action Center or My Work tasks) scale in gently (`initial: { scale: 0.85 }, animate: { scale: 1 }`) without looping pulses.

### 3.3 Top Command Bar Tactile States
- Search trigger, Ask AI button, notification bell, create dropdown, and avatar button all have tactile press feedback (`active:scale-[0.98]` or `active:scale-95`).
- Search dropdown and create menus open with rapid fade + scale (`0.98 → 1.0`).

### 3.4 Dashboard & Hero
- **File**: [`components/dashboard/dashboard.tsx`](file:///Users/harihartosurya/Developer/AffiliateOS/web/components/dashboard/dashboard.tsx)
- **Hero Ambient Drift**: Abstract SVG ribbon artwork floats with slow, subtle keyframe translation (`ribbonDriftOne`, `ribbonDriftTwo`, `ribbonDriftThree`) over 16–20 seconds with low amplitude (~4–6px).
- **Period Selector**: Today, 7D, 30D, MTD, QTD, YTD segmented control uses shared layout animation (`layoutId="dashboard-period-indicator"`), sliding the dark selection pill smoothly between options.
- **KPI Cards**: Staggered entrance, hover elevation (`hover:-translate-y-0.5 hover:border-[#CBD5E1]`), and tactile active response.
- **GMV Chart**: Stable container dimensions (250px) preventing layout shift, with custom Recharts tooltip animation.

### 3.5 Marketplace Analytics Fluidity
- **File**: [`components/analytics/marketplace-analytics.tsx`](file:///Users/harihartosurya/Developer/AffiliateOS/web/components/analytics/marketplace-analytics.tsx)
- **Sticky Sub-Nav Tabs**: Overview, Creators, Products, Contribution, Campaigns, Stock, and AI tabs feature shared layout selection indicator (`layoutId="analytics-subnav-indicator"`).
- **Tab Content**: Clean crossfade with 6px vertical lift when switching sections.

### 3.6 Workflows & Action Center
- **File**: [`components/workflows/action-center.tsx`](file:///Users/harihartosurya/Developer/AffiliateOS/web/components/workflows/action-center.tsx)
- **Layout Animations**: Action cards use `<AnimatePresence mode="popLayout">` and `<motion.article layout ...>`.
- When an action is resolved or snoozed, the card fades and scales out (`opacity: 0, scale: 0.96`), and the remaining cards slide up smoothly into their new positions without abrupt list jumps.

### 3.7 My Work & Task Completion
- **File**: [`components/workflows/workspace.tsx`](file:///Users/harihartosurya/Developer/AffiliateOS/web/components/workflows/workspace.tsx)
- Tasks use layout animation with `<AnimatePresence mode="popLayout">`.
- Checkbox has active tactile scale (`active:scale-90`) and smooth row exit.

### 3.8 Drawers & Modals Standard
- **Files**: [`components/ui/sheet.tsx`](file:///Users/harihartosurya/Developer/AffiliateOS/web/components/ui/sheet.tsx), [`components/ui/dialog.tsx`](file:///Users/harihartosurya/Developer/AffiliateOS/web/components/ui/dialog.tsx)
- Drawers use 220ms natural deceleration curve `cubic-bezier(0.16, 1, 0.3, 1)` with `bg-black/20` backdrop blur.
- Modals scale subtly (`0.95 → 1.0`) with 200ms duration.

### 3.9 Ask AffiliateOS
- **File**: [`components/workflows/ask-affiliateos.tsx`](file:///Users/harihartosurya/Developer/AffiliateOS/web/components/workflows/ask-affiliateos.tsx)
- Branded AI loading state with spinning sparkle icon and grounded skeleton pulse lines.
- Complete structured AI responses reveal smoothly with subtle fade + vertical lift (`animate-in fade-in-50 slide-in-from-bottom-2`).

---

## 4. Accessibility & Reduced Motion

AffiliateOS strictly respects `prefers-reduced-motion: reduce`:
1. **CSS Overrides**:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
2. **React Hook**:
   `usePrefersReducedMotion()` uses `useSyncExternalStore` to reactively detect OS preference without cascading renders or SSR hydration mismatch.
3. **Route Transitions Fallback**:
   When reduced motion is preferred, `RouteTransition` bypasses vertical translations and applies an instant opacity reveal.

---

## 5. Verification & Test Results

- **Automated Tests**: **101/101 PASS** (94 baseline tests + 7 motion system tests).
- **TypeScript**: `npx tsc --noEmit` **PASS** (0 errors).
- **Lint**: `npm run lint` (oxlint) **PASS** (0 errors, 0 warnings).
- **Production Build**: `npm run build` **PASS** (~2.6s compilation).
- **HTTP Navigation**: All core routes (`/dashboard`, `/shopee`, `/tiktok`, `/actions`, `/my-work`, `/creators`, `/campaigns`, `/reports`, `/settings`) return `200 OK`.
