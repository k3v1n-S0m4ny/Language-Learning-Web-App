"use client";

import { useTransition } from "react";
import Link from "next/link";

// The finish line — the thing FSRS never had.
//
// The old empty state said "all caught up", which was the only honest thing it
// could say: an infinite drip has no completion, only a moment where nothing
// happens to be due. A round genuinely ends, and this screen is where it ends.
//
// The top-up button is REPEATABLE by design. It grants a today-only bonus on top
// of the standing daily allowance (addNewCardsToday), stamped with the Bangkok
// date so it expires overnight with no cleanup — press it three times and you get
// three more batches today and none of them tomorrow. That is the intended
// escape hatch for a day with more appetite than the cap allows, and it is the
// only way to extend a finished round.

export const TOP_UP_BATCH = 20;

export function RoundComplete({
  unseenRemaining,
  onTopUp,
  backHref = "/",
  backLabel = "Back to themes",
}: {
  /** Never-seen cards left, BEFORE the daily cap — zero means a top-up would do nothing. */
  unseenRemaining: number;
  onTopUp: (amount: number) => Promise<void>;
  backHref?: string;
  backLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const canTopUp = unseenRemaining > 0;

  function addMore() {
    startTransition(async () => {
      await onTopUp(TOP_UP_BATCH);
    });
  }

  return (
    <div className="glass flex w-full max-w-md flex-col items-center gap-2 rounded-[var(--r-lg)] p-8 text-center animate-slide-up-fade">
      <p className="text-lg font-semibold text-foreground">Round complete</p>
      <p className="text-sm text-foreground-muted">
        {canTopUp ? (
          <>
            Every card you were owed today has reached the top of its ladder. Come back
            tomorrow, or add another batch of new cards now.
          </>
        ) : (
          <>
            Every card you were owed today has reached the top of its ladder, and there are
            no unseen cards left here. Come back tomorrow.
          </>
        )}
      </p>
      {canTopUp && (
        <button
          type="button"
          onClick={addMore}
          disabled={pending}
          className="mt-2 rounded-[var(--r-pill)] px-6 py-2.5 text-sm font-semibold text-on-earthy shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] transition-transform active:scale-95 disabled:opacity-70"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-3))" }}
        >
          {pending ? "Adding…" : `Add ${TOP_UP_BATCH} new cards today`}
        </button>
      )}
      <Link
        href={backHref}
        className="mt-2 rounded-[var(--r-pill)] border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-background hover:text-foreground"
      >
        {backLabel}
      </Link>
    </div>
  );
}
