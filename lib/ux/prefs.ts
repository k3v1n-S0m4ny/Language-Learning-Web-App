"use client";

import { useSyncExternalStore } from "react";

// Device-local UX preferences. Deliberately NOT persisted to learner_settings —
// the prod DB is the dev DB, so a per-device UI toggle does not warrant a schema
// migration. Mirrors the theme-toggle pattern: the value lives in localStorage
// (the external store) and is read with useSyncExternalStore, so multiple tabs
// stay in sync via the storage event and there is no setState-in-effect /
// hydration-mismatch hazard.
//
// Every preference is the same four moving parts (key, change event, read,
// write), so they are built once by `pref()` below rather than copy-pasted per
// setting. The hooks stay as individually named `useX` functions — a hook call
// hidden inside a returned object method would neither read as a hook nor
// satisfy the react-hooks lint rules.

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

interface Pref {
  get: () => boolean;
  set: (enabled: boolean) => void;
  subscribe: (callback: () => void) => () => void;
  /** SSR snapshot: the default, so server markup matches the pre-hydration client. */
  server: () => boolean;
}

function pref(key: string, fallback: boolean): Pref {
  // The native storage event only fires in OTHER tabs, so the setter also
  // dispatches this one to wake same-tab subscribers.
  const event = `${key}change`;
  const get = () => read(key, fallback);
  return {
    get,
    set: (enabled: boolean) => write(key, event, enabled),
    subscribe: (callback: () => void) => {
      window.addEventListener(event, callback);
      window.addEventListener("storage", callback);
      return () => {
        window.removeEventListener(event, callback);
        window.removeEventListener("storage", callback);
      };
    },
    server: () => fallback,
  };
}

const haptics = pref("ux:haptics", true);
const sound = pref("ux:sound", false);
// Show pinyin — OFF by default: it is a crutch you opt into, and defaulting it on
// would hand away the reading half of every recognition card. Shared by the flip
// card's back face and the multiple-choice prompt, and REMEMBERED, because the
// per-card React state it replaced made the Learner re-tap it on every question.
const pinyin = pref("ux:pinyin", false);
// Tone colour — ON by default (the locked design decision); rides with the pinyin
// setting so both faces colour the same phrase the same way.
const toneColor = pref("ux:tone-color", true);
// Autoplay the pronunciation on a recognition multiple-choice card. ON by default:
// without it, step 1 is read-only and never trains listening. Suppressible mid-round
// from the session itself, for the bus/office case.
const mcAutoplay = pref("ux:mc-autoplay", true);

// Imperative getters — used by the non-React haptic()/playSfx() call sites and by
// event handlers, which fire from gestures, not render. SSR-safe: `localStorage`
// is only touched in the browser.
export const getHapticsEnabled = haptics.get;
export const getSoundEnabled = sound.get;
export const getPinyinShown = pinyin.get;
export const getToneColorOn = toneColor.get;
export const getMcAutoplay = mcAutoplay.get;

export const setHapticsEnabled = haptics.set;
export const setSoundEnabled = sound.set;
export const setPinyinShown = pinyin.set;
export const setToneColorOn = toneColor.set;
export const setMcAutoplay = mcAutoplay.set;

// Reactive hooks for the toggle UI.
export function useHapticsEnabled(): boolean {
  return useSyncExternalStore(haptics.subscribe, haptics.get, haptics.server);
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(sound.subscribe, sound.get, sound.server);
}

export function usePinyinShown(): boolean {
  return useSyncExternalStore(pinyin.subscribe, pinyin.get, pinyin.server);
}

export function useToneColorOn(): boolean {
  return useSyncExternalStore(toneColor.subscribe, toneColor.get, toneColor.server);
}

export function useMcAutoplay(): boolean {
  return useSyncExternalStore(mcAutoplay.subscribe, mcAutoplay.get, mcAutoplay.server);
}
