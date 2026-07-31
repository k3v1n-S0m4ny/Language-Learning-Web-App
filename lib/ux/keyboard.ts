"use client";

import { useEffect, useRef } from "react";

// The study-session keyboard shortcuts.
//
// Until this file the app had exactly ONE keyboard listener — the iOS
// AudioContext unlock in lib/ux/audio.ts — and every answer, reveal, self-grade
// and Continue was pointer-only. That is fine on the phone this was designed
// for and dead weight on a desktop, where a whole round should be playable
// without reaching for the mouse.
//
// THE BINDINGS GATE ON STATE, NEVER ON THE DOM. This is the one rule that
// matters here, and it is not theoretical: components/advanced-thai/
// advanced-review-session.tsx swaps its entire subtree out for a "Next card…"
// spinner while an answer is in flight, and components/ladder/mc-question.tsx
// disables its buttons behind `locked`. A window-level listener keeps firing
// straight through both. So every caller passes an `enabled` computed from the
// same `answered` / `pending` / `revealed` values the buttons are disabled by,
// and routes through the same handler the buttons call — which already carries
// the `if (answered) return;` re-entrancy guard. A key press must never be able
// to submit a second answer for a card that has one.
//
// A keypress also already counts as the user gesture the iOS audio unlock needs
// (lib/ux/audio.ts registers `keydown` alongside `pointerdown`, capture phase),
// so a key-driven reveal satisfies the same rule a click does and playAudio
// stays correct on the reveal path. Nothing here needs to know about that.

/**
 * Text entry wins over shortcuts, always. No study screen has a text field
 * today — this exists so that adding one later is not silently broken by a
 * digit key being swallowed before it reaches the input.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * The shared listener. `handler` returns true when it consumed the event, which
 * is the only thing that triggers preventDefault — so an unhandled key (Tab,
 * a browser shortcut, a find-in-page) behaves exactly as it would with no
 * listener attached.
 *
 * The handler is held in a ref and refreshed every render rather than being an
 * effect dependency: it closes over card state that changes on every keystroke,
 * and re-subscribing the window listener that often is both wasteful and a way
 * to drop an event between teardown and re-attach.
 */
function useKeydown(handler: (event: KeyboardEvent) => boolean, enabled: boolean): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;

    function onKeydown(event: KeyboardEvent) {
      // event.repeat: holding a key must not fire a card's answer twice.
      // Modifiers: Cmd/Ctrl/Alt combinations belong to the browser and the OS.
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (latest.current(event)) event.preventDefault();
    }

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [enabled]);
}

/**
 * Digit keys 1..count, reported back as a zero-based index.
 *
 * `count` rather than a hardcoded 4 because the option count is not a constant
 * across this codebase: the ladder's multiple-choice step is always four
 * (MC_OPTION_COUNT in lib/ladder/distractors.ts), but the Read-Thai drills run
 * three to five, and the binary self-grade below is two. One hook covers all of
 * them and cannot drift out of step with what is on screen.
 */
export function useAnswerKeys({
  count,
  enabled,
  onPick,
}: {
  count: number;
  enabled: boolean;
  onPick: (index: number) => void;
}): void {
  useKeydown((event) => {
    // Number(" ") is 0 and Number("Enter") is NaN, so both fall outside the
    // range without a special case.
    const n = Number(event.key);
    if (!Number.isInteger(n) || n < 1 || n > count) return false;
    onPick(n - 1);
    return true;
  }, enabled);
}

/** A single action bound to one or more named keys (" " is Space). */
export function useActionKeys(keys: readonly string[], enabled: boolean, onFire: () => void): void {
  useKeydown((event) => {
    if (!keys.includes(event.key)) return false;
    onFire();
    return true;
  }, enabled);
}
