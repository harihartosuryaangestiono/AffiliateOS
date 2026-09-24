import { MOTION_DURATIONS, MOTION_EASINGS, MOTION_SPRINGS } from './tokens.ts';

/**
 * Standard Framer/Motion transition definitions.
 */
export const transitions = {
  /** Page transition settings: subtle, fast, smooth deceleration */
  page: {
    duration: MOTION_DURATIONS.page,
    ease: MOTION_EASINGS.easeOutExpo,
  },
  /** Standard element transition (cards, dropdowns, popovers) */
  standard: {
    duration: MOTION_DURATIONS.standard,
    ease: MOTION_EASINGS.easeOutExpo,
  },
  /** Fast micro-interaction transition (chips, tooltips, tags) */
  fast: {
    duration: MOTION_DURATIONS.fast,
    ease: MOTION_EASINGS.easeOutExpo,
  },
  /** Exit transition (leaves faster than entrance) */
  exit: {
    duration: MOTION_DURATIONS.fast,
    ease: MOTION_EASINGS.easeInQuad,
  },
  /** Interactive spring for tabs & sliding layout elements */
  springTab: MOTION_SPRINGS.snappy,
  /** Drawer slide spring */
  springDrawer: MOTION_SPRINGS.smooth,
} as const;

/**
 * Common CSS transition strings for styling elements via inline styles or CSS variables.
 */
export const cssTransitions = {
  allFast: `all ${MOTION_DURATIONS.fast}s ${MOTION_EASINGS.cssEaseOut}`,
  allStandard: `all ${MOTION_DURATIONS.standard}s ${MOTION_EASINGS.cssEaseOut}`,
  transformFast: `transform ${MOTION_DURATIONS.fast}s ${MOTION_EASINGS.cssEaseOut}`,
  opacityFast: `opacity ${MOTION_DURATIONS.fast}s ${MOTION_EASINGS.cssEaseOut}`,
  colorsFast: `background-color ${MOTION_DURATIONS.fast}s ${MOTION_EASINGS.cssEaseOut}, border-color ${MOTION_DURATIONS.fast}s ${MOTION_EASINGS.cssEaseOut}, color ${MOTION_DURATIONS.fast}s ${MOTION_EASINGS.cssEaseOut}`,
} as const;
