"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Celebration } from "@/components/ui/celebration";

// Shown when no Card is due and the daily new-card cap is exhausted. A
// quiet glass surface per the design spec's "Empty/loading" note — EXCEPT
// right after the learner just finished a review session, which is a
// genuine milestone ("deck cleared") worth a one-time confetti burst.
//
// There is no server-side "session complete" event (this Card renders
// whenever getStudyScreenData finds nothing due, including a plain idle
// revisit with zero reviews done), so the celebration is gated by a
// sessionStorage one-shot:
//   - `review-session:rated` is set by review-session.tsx's rate() the
//     moment the learner submits ANY rating this session.
//   - `mandarin:cleared-fired` marks that the celebration already fired
//     this session, so navigating back to an already-empty queue never
//     re-triggers it.
// Both keys live in sessionStorage (not localStorage), so a fresh tab/
// session always starts ungated — an idle revisit with no reviews done
// this session never fires confetti, only the transition INTO "all caught
// up" right after rating something does.

// No live updates needed — this is read once per mount via getSnapshot
// (below), which useSyncExternalStore still calls safely post-hydration
// even with a no-op subscription.
function subscribe() {
  return () => {};
}

// Pure read (no writes) — sessionStorage access must stay out of render on
// the server, where it doesn't exist; getServerSnapshot below covers that.
function getSnapshot(): boolean {
  try {
    const ratedThisSession = sessionStorage.getItem("review-session:rated") === "1";
    const alreadyFired = sessionStorage.getItem("mandarin:cleared-fired") === "1";
    return ratedThisSession && !alreadyFired;
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function EmptyState() {
  const celebrate = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Marks the one-shot fired — a plain external-system write, not a
  // setState call, so react-hooks/set-state-in-effect doesn't apply here.
  useEffect(() => {
    if (!celebrate) return;
    try {
      sessionStorage.setItem("mandarin:cleared-fired", "1");
    } catch {
      /* private mode / storage disabled — celebration just won't repeat-guard, harmless */
    }
  }, [celebrate]);

  return (
    <Celebration show={celebrate}>
      <div className="glass flex w-full max-w-md flex-col items-center gap-3 rounded-[var(--r-xl)] px-8 py-12 text-center animate-fade-in">
        <p className="text-4xl animate-gentle-bounce">🎉</p>
        <p className="text-lg font-semibold text-foreground">All caught up</p>
        <p className="text-sm text-foreground-muted">
          No Cards are due right now. Check back later.
        </p>
      </div>
    </Celebration>
  );
}
