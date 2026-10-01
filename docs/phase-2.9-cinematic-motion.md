# Phase 2.9 — Cinematic Motion, Delight & Immersive Interaction Overhaul

AffiliateOS Phase 2.9 introduces an integrated, expressive, and high-performance motion design system. This personal web application prioritizes visual impact, fluid continuity, tactile delight, and spatial elegance over conservative enterprise minimalism while preserving 100% of deterministic business logic and data integrity.

---

## 1. Central Motion Architecture & Primitives (`lib/motion/tokens.ts`)

Motion tokens are centralized in [`lib/motion/tokens.ts`](file:///Users/harihartosurya/Developer/AffiliateOS/web/lib/motion/tokens.ts):

```typescript
export const motionTokens = {
  duration: {
    instant: 0.1,    // 100ms: micro-interactions, toggles, badge pops
    fast: 0.16,      // 160ms: dropdowns, tooltips, chips
    normal: 0.22,    // 220ms: standard UI transitions, tabs, segmented controls
    expressive: 0.35,// 350ms: section crossfades, card expansions
    cinematic: 0.6,  // 600ms: hero choreography, intro moments
  },
  easing: {
    standard: [0.16, 1, 0.3, 1],    // easeOutExpo for natural deceleration
    enter: [0.16, 1, 0.3, 1],       // snappier entry with soft landing
    exit: [0.55, 0.085, 0.68, 0.53],// easeInQuad for rapid, clean exit
    emphasized: [0.2, 0, 0, 1],     // tactile press
    spring: 'spring',
  },
  spring: {
    soft: { type: 'spring', stiffness: 280, damping: 24, mass: 1 },
    responsive: { type: 'spring', stiffness: 450, damping: 32, mass: 0.8 },
    expressive: { type: 'spring', stiffness: 350, damping: 26, mass: 1 },
    magnetic: { type: 'spring', stiffness: 500, damping: 22, mass: 0.7 },
  },
  distance: {
    micro: 2,   // button shifts, hover nudge
    small: 6,   // dropdowns, toast stagger
    medium: 12, // cards, hero elements
    large: 24,  // drawer slides
  }
};
```

---

## 2. Cinematic Route Transitions & Persistent App Shell

- **App Shell Stability**: The header, sidebar, background canvas, and global navigation remain physically stable during page switches.
- **Content Workspace Motion (`components/motion/route-transition.tsx`)**:
  - **Old Page**: `opacity: 1 → 0`, `y: 0 → -6px`, `scale: 1 → 0.995`, `filter: blur(0) → blur(3px)`.
  - **New Page**: `opacity: 0 → 1`, `y: 10px → 0`, `scale: 0.995 → 1`, `filter: blur(4px) → blur(0)`.
  - Duration is locked to `240ms` using `easeOutExpo`, preventing sluggish slide behavior.

---

## 3. Sidebar Liquid Navigation & Top Command Bar

- **Traveling Pill Indicator**: The active sidebar item uses Framer Motion `layoutId="sidebar-active-indicator"` powered by spring physics (`stiffness: 420, damping: 34`).
- **Interactive Micro-Hover**:
  - Sidebar icons scale `1.0 → 1.05` on hover.
  - Sidebar labels translate `0 → 2px` smoothly.
  - Active icon features a subtle ambient drop shadow.
- **Top Command Bar**:
  - Global search bar expands subtly with an elevated border and focus ring on activation.
  - Shortcut badge (`⌘K`) softens on focus.
  - Dedicated Ask AI Copilot header button with interactive sparkle icon and `⌘J` shortcut.

---

## 4. Dashboard Hero & Multi-Layer Parallax

- **Multi-layer Cursor Depth Response**:
  - Layer 1: Ambient radial light follow (`radial-gradient` following cursor).
  - Layer 2: 3D glassmorphic SVG ribbons with opposite parallax translate (`translate3d(-x * 3.5px, -y * 3.5px, 0)`).
  - Layer 3: Floating Creator Economy card with higher depth ratio (`translate3d(-x * 5.5px, -y * 5.5px, 0)`).
- **Text Choreography**:
  - Contextual time-based greeting (`GOOD MORNING, HARIHARTO ✦`).
  - Staggered headline reveal: "Turn creators into real growth".
  - Magnetic CTA buttons: "Create campaign", "Browse creators", and "Ask AI Copilot".
  - Instant AI prompt chips directly on the hero.

---

## 5. Magnetic CTA Buttons (`components/motion/magnetic-button.tsx`)

- Desktop primary buttons implement subtle magnetic physics (`MagneticButton` and `MagneticLink`).
- Pointer proximity translates button content by 1–3px toward the cursor.
- Pointer down applies an elastic compression (`scale: 0.975`).
- On release, the button springs back organically.
- Automatically disabled on touch screens (`pointer: coarse`) and when reduced-motion is preferred.

---

## 6. KPI Card Choreography & Number Motion (`components/motion/animated-number.tsx`)

- Cards apply hover depth (`translateY(-2px)`, shadow ramp, subtle border highlight).
- Value updates utilize `AnimatedNumber`, `AnimatedCurrency`, and `AnimatedPercentage`, rolling smoothly from previous values instead of resetting to 0.
- Sparklines execute coordinated stroke draw animations (`pathLength: 0 → 1`).

---

## 7. Chart Animation System & Pareto Choreography

- **Line & Area Charts**:
  - Path draws horizontally from left to right on initial appearance.
  - Smooth crossfading between Daily and Cumulative views.
- **Pareto 80/20 Chart (`components/analytics/pareto-chart.tsx`)**:
  - Bars rise sequentially from the baseline (`400ms`).
  - Cumulative percentage line begins drawing after the bars rise (`animationBegin: 200ms`, `500ms` duration).
  - 80% revenue cutoff reference line provides immediate visual grounding.
  - Top 5 / Top 10 / Top 20 depth switches reorder smoothly.

---

## 8. Analytics Continuity & Shopee ↔ TikTok Transition

- Sibling marketplace switcher features an animated shared-element pill (`layoutId="sibling-market-pill"`).
- Warm orange accent reflects Shopee identity, while dark slate/cyan reflects TikTok, without recoloring the entire interface.
- Analytics sub-navigation tabs glide using `layoutId="analytics-subnav-indicator"` and tab contents crossfade smoothly with `AnimatePresence`.

---

## 9. Gemini AI Signature Motion Language (`components/motion/ai-signature.tsx`)

- **Branded Generation State (`AIGenerationState`)**:
  - Gently rotating & pulsing Gemini sparkle icon.
  - Shimmering blue-to-violet gradient background.
  - Dual-speed progressive skeleton lines.
- **Progressive Chunk Reveal (`ProgressiveChunkReveal`)**:
  - Structured multi-paragraph AI explanations reveal paragraph-by-paragraph with subtle upward settling.
- **Ask AffiliateOS Drawer (`components/workflows/ask-affiliateos.tsx`)**:
  - Accessible via topbar, hero CTA, bottom-right floating trigger, sidebar menu, and `⌘J` shortcut.
  - Clean question settlement and structured response cards with reference badges.

---

## 10. Action Center & Task Completion

- Reorders action cards smoothly via `AnimatePresence mode="popLayout"` and `layout`.
- Status transitions morph between `OPEN` and `IN_PROGRESS`.
- Resolved cards collapse with checkmark spring and remaining cards physically glide upward.

---

## 11. Accessibility, Reduced Motion & Performance

- **Prefers Reduced Motion**:
  - Fully respects `prefers-reduced-motion: reduce`.
  - Disables parallax, cursor lighting, magnetic shifts, and complex chart draws.
  - Replaces all motion with instantaneous opacity transitions.
- **Performance & 60 FPS Target**:
  - Only GPU-accelerated properties (`transform`, `opacity`, `filter: blur`) are animated.
  - Zero layout shifts (CLS = 0) with preserved dimensions.
  - All interactive elements preserve keyboard navigation, ARIA semantics, and focus rings.
