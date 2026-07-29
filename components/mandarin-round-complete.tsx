"use client";

import { useEffect, useSyncExternalStore } from "react";
import { RoundComplete } from "@/components/ladder/round-complete";
import { Celebration } from "@/components/ui/celebration";
import { addNewCardsToday } from "@/lib/review/actions";
import { hskLabel } from "@/lib/review/hsk-gate";
import type { GateStatus } from "@/lib/review/types";

// Shown when the round's batch is empty — the Mandarin finish line.
//
// It is a thin wrapper around the shared components/ladder/round-complete.tsx
// rather than that component directly, because Mandarin has one thing Advanced
// Thai does not: THE HSK BAND GATE. "You have finished, take another twenty" and
// "you have finished, and there is nothing more to give you until you learn the
// band below" are different messages, and offering the top-up button in the
// second case would be a button that does nothing.
//
// The file this replaces was called empty-state.tsx, and the rename is the point.
// An infinite FSRS drip had no completion — only a moment where nothing happened
// to be due, which is why the old copy could say no more than "all caught up". A
// round genuinely ends.
//
// The celebration is carried over unchanged. There is still no server-side
// "session complete" event (this renders whenever the batch is empty, including
// an idle revisit), so it is gated by a sessionStorage one-shot:
//   - `review-session:rated` is set by review-session.tsx the moment the Learner
//     commits any answer this session.
//   - `mandarin:cleared-fired` marks that it already fired, so returning to an
//     already-finished round never re-triggers it.
// Both live in sessionStorage (not localStorage), so a fresh tab starts ungated.

// No live updates needed — this is read once per mount via getSnapshot, which
// useSyncExternalStore still calls safely post-hydration even with a no-op
// subscription.
function subscribe() {
  return () => {};
}

// Pure read (no writes) — sessionStorage access must stay out of render on the
// server, where it doesn't exist; getServerSnapshot below covers that.
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

export function MandarinRoundComplete({ gate }: { gate: GateStatus }) {
  const celebrate = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // The gate is what is holding new Cards back — not the daily cap, and not a
  // finished deck. Under the gate this is a routine state (every eligible Card is
  // introduced, the band below is still short), so it must NOT read as a
  // milestone: no confetti for being stuck, and say what would actually unlock it.
  const blocked =
    gate.eligibleUnseen === 0 && gate.nextBand !== null && gate.blockingBand !== null;

  // Marks the one-shot fired — a plain external-system write, not a setState
  // call, so react-hooks/set-state-in-effect doesn't apply here.
  useEffect(() => {
    if (!celebrate || blocked) return;
    try {
      sessionStorage.setItem("mandarin:cleared-fired", "1");
    } catch {
      /* private mode / storage disabled — celebration just won't repeat-guard, harmless */
    }
  }, [celebrate, blocked]);

  if (blocked) {
    const { band, mastered, required } = gate.blockingBand!;
    return (
      <div className="glass flex w-full max-w-md flex-col items-center gap-3 rounded-[var(--r-xl)] px-8 py-12 text-center animate-fade-in">
        <p className="text-lg font-semibold text-foreground">
          {hskLabel(gate.nextBand!)} is locked
        </p>
        <p className="text-sm text-foreground-muted">
          Take all {required} of the {hskLabel(band)} phrases to the top of the ladder
          to unlock it — you&apos;re at {mastered}. A phrase counts once you can
          produce it from the English on its own.
        </p>
      </div>
    );
  }

  return (
    <Celebration show={celebrate}>
      <RoundComplete
        // The GATE's supply, not the raw unseen count: a top-up raises the daily
        // cap, and raising a cap the gate is already holding shut would add
        // nothing. Zero here correctly hides the button.
        unseenRemaining={gate.eligibleUnseen}
        onTopUp={addNewCardsToday}
        backHref="/stats"
        backLabel="See progress"
      />
    </Celebration>
  );
}
