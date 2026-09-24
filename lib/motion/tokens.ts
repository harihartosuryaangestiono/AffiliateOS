/**
 * AffiliateOS Centralized Motion Design Tokens
 * 
 * Defines semantic timing, easing curves, springs, and z-index layers.
 * Follows the principle: Fast, fluid, subtle, native-app-like, GPU-friendly.
 */

export const MOTION_DURATIONS = {
  /** Micro-interactions, checkboxes, icon toggles, button active presses (80-120ms) */
  instant: 0.1,
  /** Fast transitions, hover states, tooltip reveals, badge pops (140-180ms) */
  fast: 0.16,
  /** Standard UI changes, popovers, dropdowns, segmented controls, tabs (180-240ms) */
  standard: 0.22,
  /** Modal dialogs, drawer slides, card expansions, hero entrances (240-320ms) */
  emphasis: 0.28,
  /** Page/route transitions, workspace views crossfade (220-300ms) */
  page: 0.24,
} as const;

export const MOTION_DURATIONS_MS = {
  instant: 100,
  fast: 160,
  standard: 220,
  emphasis: 280,
  page: 240,
} as const;

/**
 * Natural, non-linear easing curves for polished UI feel.
 * Deceleration curves for entering elements; acceleration curves for exiting.
 */
export const MOTION_EASINGS = {
  /** Natural deceleration curve for entering elements (snappy arrival, soft landing) */
  easeOutExpo: [0.16, 1, 0.3, 1] as const,
  /** Smooth gentle acceleration for exiting elements (leaves quickly without linger) */
  easeInQuad: [0.55, 0.085, 0.68, 0.53] as const,
  /** Natural symmetric curve for continuous elements (moving pills, sliders) */
  easeInOutSmooth: [0.4, 0, 0.2, 1] as const,
  /** Tactile button press curve */
  tactilePress: [0.2, 0, 0, 1] as const,
  /** CSS string representation for CSS transitions */
  cssEaseOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  cssEaseIn: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  cssEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * High-performance spring configurations for organic UI responses.
 * Tuned to settle rapidly without excessive bounce or disorientation.
 */
export const MOTION_SPRINGS = {
  /** Snappy spring for active tabs, segmented pills, small badges */
  snappy: {
    type: 'spring' as const,
    stiffness: 450,
    damping: 32,
    mass: 0.8,
  },
  /** Balanced spring for drawers, side sheets, modal dialogs */
  smooth: {
    type: 'spring' as const,
    stiffness: 350,
    damping: 30,
    mass: 1,
  },
  /** Gentle spring for subtle card hover and scale states */
  gentle: {
    type: 'spring' as const,
    stiffness: 280,
    damping: 24,
    mass: 1,
  },
} as const;

export const MOTION_DELAYS = {
  staggerFast: 0.03, // 30ms between list items
  staggerStandard: 0.05, // 50ms between cards
  heroDelay: 0.08,
} as const;
