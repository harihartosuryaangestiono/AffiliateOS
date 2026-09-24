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
