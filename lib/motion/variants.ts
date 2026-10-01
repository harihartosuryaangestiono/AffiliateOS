import type { Variants } from 'motion/react';
import { MOTION_DURATIONS, MOTION_EASINGS, MOTION_DELAYS, MOTION_SPRINGS } from './tokens.ts';

/**
 * Route / Page content entrance variants.
 * Subtle 8px vertical lift + opacity fade for native-app feel.
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.page,
      ease: MOTION_EASINGS.easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeInQuad,
    },
  },
};

/**
 * Simple fade in variant.
 */
export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: MOTION_DURATIONS.instant,
      ease: MOTION_EASINGS.easeInQuad,
    },
  },
};

/**
 * Slide up element reveal (used for cards, summary cards, headers).
 */
export const slideUpVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.standard,
      ease: MOTION_EASINGS.easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeInQuad,
    },
  },
};

/**
 * Scale in variant (used for modals, popovers, quick-create menus, badges).
 */
export const scaleInVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.97,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: {
      duration: MOTION_DURATIONS.instant,
      ease: MOTION_EASINGS.easeInQuad,
    },
  },
};

/**
 * Stagger container for card grids (KPI cards, hero items, leaderboards).
 * Fast total duration to never make users wait.
 */
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      delayChildren: MOTION_DELAYS.staggerFast,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.standard,
      ease: MOTION_EASINGS.easeOutExpo,
    },
  },
};

/**
 * Right drawer sheet slide variant.
 */
export const drawerRightVariants: Variants = {
  initial: {
    x: '100%',
    opacity: 0.5,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: MOTION_SPRINGS.smooth,
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeInQuad,
    },
  },
};

/**
 * Badge count change pop animation.
 */
export const badgePopVariants: Variants = {
  initial: { scale: 0.85, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: MOTION_SPRINGS.snappy,
  },
  exit: { scale: 0.85, opacity: 0, transition: { duration: 0.08 } },
};

/**
 * Phase 2.9: Cinematic Route Workspace Transition
 * Preserves shell stability while content glides with scale, blur, and lift.
 */
export const cinematicRouteVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.995,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: MOTION_DURATIONS.page,
      ease: MOTION_EASINGS.easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.995,
    filter: 'blur(3px)',
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeInQuad,
    },
  },
};

/**
 * Phase 2.9: Dashboard Hero Choreography Variants
 */
export const heroChoreographyContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      delayChildren: 0.04,
    },
  },
};

export const heroChoreographyItem: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: MOTION_EASINGS.easeOutExpo,
    },
  },
};

/**
 * Phase 2.9: Pareto Chart Bar Sequential Rise
 */
export const paretoBarVariants: Variants = {
  initial: {
    scaleY: 0,
    opacity: 0,
    transformOrigin: 'bottom',
  },
  animate: (i: number) => ({
    scaleY: 1,
    opacity: 1,
    transformOrigin: 'bottom',
    transition: {
      delay: i * 0.035,
      duration: 0.32,
      ease: MOTION_EASINGS.easeOutExpo,
    },
  }),
};

/**
 * Phase 2.9: AI Gemini Pulse & Shimmer
 */
export const aiSparkleVariants: Variants = {
  initial: { rotate: 0, scale: 1 },
  animate: {
    rotate: [0, 15, -12, 0],
    scale: [1, 1.1, 0.96, 1],
    transition: {
      repeat: Infinity,
      duration: 3.6,
      ease: 'easeInOut',
    },
  },
};

