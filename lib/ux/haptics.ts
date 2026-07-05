"use client";

import { getHapticsEnabled } from "./prefs";

// Tactile feedback for answer results and unlocks. Triple-gated:
//   1. feature-detect  — navigator.vibrate exists (desktop / iOS Safari don't)
//   2. user preference — ux:haptics is on (default on)
//   3. reduced-motion  — a vibration IS motion, so an OS reduce-motion request
//      suppresses it, matching the double-gate rule used for visual animation.
// Any throw (some browsers reject rapid re-triggers) is swallowed.

type HapticKind = "tap" | "success" | "error" | "unlock";

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 10,
  success: [0, 30, 40, 30],
  error: [0, 60, 40, 60],
  unlock: [0, 20, 40, 20, 40, 60],
};

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function haptic(kind: HapticKind): void {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    if (!getHapticsEnabled()) return;
    if (prefersReducedMotion()) return;
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* vibrate rejected (e.g. too-frequent calls) — non-essential, ignore. */
  }
}
