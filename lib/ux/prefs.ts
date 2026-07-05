"use client";

import { useSyncExternalStore } from "react";

// Device-local UX preferences (haptics + sound). Deliberately NOT persisted to
// learner_settings — the prod DB is the dev DB, so a per-device UI toggle does
// not warrant a schema migration. Mirrors the theme-toggle pattern: the value
// lives in localStorage (the external store) and is read with
// useSyncExternalStore, so multiple tabs stay in sync via the storage event and
// there is no setState-in-effect / hydration-mismatch hazard.

const HAPTICS_KEY = "ux:haptics";
const SOUND_KEY = "ux:sound";
// Bumped on every setter so same-tab subscribers re-render (the native storage
// event only fires in OTHER tabs).
const HAPTICS_EVENT = "ux:hapticschange";
const SOUND_EVENT = "ux:soundchange";

function read(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "on";
  } catch {
    return fallback;
  }
}

function write(key: string, event: string, enabled: boolean): void {
  try {
    localStorage.setItem(key, enabled ? "on" : "off");
  } catch {
    /* private mode / storage disabled — preference still applies this session
       is not possible without state, so it silently no-ops for the session. */
  }
  window.dispatchEvent(new Event(event));
}

// Imperative getters — used by the non-React haptic()/playSfx() call sites,
// which fire from event handlers, not render. SSR-safe: `localStorage` is only
// touched in the browser (these are only ever called from client gestures).
export function getHapticsEnabled(): boolean {
  return read(HAPTICS_KEY, true);
}

export function getSoundEnabled(): boolean {
  return read(SOUND_KEY, false);
}

export function setHapticsEnabled(enabled: boolean): void {
  write(HAPTICS_KEY, HAPTICS_EVENT, enabled);
}

export function setSoundEnabled(enabled: boolean): void {
  write(SOUND_KEY, SOUND_EVENT, enabled);
}

function subscribe(event: string) {
  return (callback: () => void) => {
    window.addEventListener(event, callback);
    window.addEventListener("storage", callback);
    return () => {
      window.removeEventListener(event, callback);
      window.removeEventListener("storage", callback);
    };
  };
}

const subscribeHaptics = subscribe(HAPTICS_EVENT);
const subscribeSound = subscribe(SOUND_EVENT);

// Reactive hooks for the toggle UI. SSR snapshot returns the default so the
// server-rendered markup matches the pre-hydration client default (on / off).
export function useHapticsEnabled(): boolean {
  return useSyncExternalStore(subscribeHaptics, getHapticsEnabled, () => true);
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(subscribeSound, getSoundEnabled, () => false);
}
