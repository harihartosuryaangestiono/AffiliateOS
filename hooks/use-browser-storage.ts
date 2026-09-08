'use client';
import { useSyncExternalStore } from 'react';
const eventName = 'affiliateos-storage-change';
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(eventName, callback);
  };
}
export function useBrowserStorage(
  key: string,
  fallback: string,
  enabled = true,
) {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (!enabled) return fallback;
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
}
export function writeBrowserStorage(key: string, value: string) {
  localStorage.setItem(key, value);
  window.dispatchEvent(new Event(eventName));
}
