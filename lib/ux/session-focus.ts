"use client";

import { useSyncExternalStore } from "react";

// Tiny module-singleton store for "a study session is actively in progress",
// so the bottom nav can recede (dim, never hide) during a review/drill to avoid
// mis-taps — the same idiom the TopBar already uses via its `receded` prop.
// A plain module store (not context) keeps it decoupled: the setters live in
// ReviewSession/DrillSession, the reader in BottomNav, with no shared parent.

let sessionActive = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setSessionActive(active: boolean): void {
  if (sessionActive === active) return;
  sessionActive = active;
  emit();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): boolean {
  return sessionActive;
}

export function useSessionActive(): boolean {
  // SSR snapshot is always false (no session in progress at first paint).
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
