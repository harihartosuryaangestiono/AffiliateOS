'use client';

import { useSyncExternalStore } from 'react';

/**
 * Global utility to check if reduced motion is preferred by user OS.
 */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  return isReducedMotionPreferred();
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * React hook to reactively listen to OS reduced-motion preferences.
 * Defaults to false on SSR to prevent hydration divergence.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getSnapshot, getServerSnapshot);
}

/**
 * Returns instantaneous transition values when reduced motion is preferred.
 */
export function getMotionOrInstant<T>(standardMotion: T, instantFallback: T, reducedMotion: boolean): T {
  return reducedMotion ? instantFallback : standardMotion;
}
