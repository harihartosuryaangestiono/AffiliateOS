'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cinematicRouteVariants } from '@/lib/motion/variants';
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';

interface RouteTransitionProps {
  children: React.ReactNode;
  pathname: string;
}

export function RouteTransition({ children, pathname }: RouteTransitionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div id="workspace-content" tabIndex={-1} className="w-full outline-none">
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={cinematicRouteVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        id="workspace-content"
        tabIndex={-1}
        className="w-full outline-none will-change-transform"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
