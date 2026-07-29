// Round ordering. A round is "every card owed today, cycled until each has
// passed at its top step", and it serves the batch in full passes: every
// unfinished card is asked once before any card is asked again.
//
// THE ROUND IS NOT PERSISTED. There is no round table, no batch snapshot, no
// pass counter. Full-cycle ordering falls out of two invariants instead:
//
//   1. Every answer that does NOT finish a card sets `due = now` and stamps
//      `last_review`. The card stays in the batch (`due <= now`) and moves to
//      the back of the line.
//   2. An answer that finishes a card schedules it a rung out (>= 1 day), so it
//      drops out of `due <= now` on its own.
//
// Serving the unfinished card with the oldest `last_review` then produces exact
// round-robin, and the batch drains itself. This is why the old three-tier queue
// and pickFutureToday are gone: Tier 3 existed to rescue cards that FSRS had
// scheduled minutes into the future, and nothing is ever scheduled in minutes
// now. The just-rated card cannot come back because every other unfinished card
// has an older `last_review` than the one just stamped.
//
// The whole rule is expressible as ORDER BY last_review ASC NULLS FIRST,
// deck_order ASC LIMIT 1. This module exists so that ordering is testable and
// stated once, rather than living only inside two SQL builders.

export interface RoundCandidate {
  cardId: string;
  /** Null for a card never answered — it has not been served this round yet. */
  lastReview: Date | null;
  /** Stable tiebreak. Deck order for new cards, so introduction stays sequential. */
  deckOrder: number;
}

/**
 * Order the batch as it should be served.
 *
 * Never-answered cards come first, in deck order: pass 1 of a round is the
 * introduction pass. After that, oldest-served first. Ties on `last_review`
 * (possible when a batch write stamps several rows the same millisecond) fall
 * back to deck order so the sequence is deterministic.
 */
export function orderRound(candidates: RoundCandidate[]): RoundCandidate[] {
  return [...candidates].sort((a, b) => {
    const aTime = a.lastReview?.getTime() ?? null;
    const bTime = b.lastReview?.getTime() ?? null;

    if (aTime === null && bTime !== null) return -1;
    if (aTime !== null && bTime === null) return 1;
    if (aTime !== null && bTime !== null && aTime !== bTime) return aTime - bTime;

    return a.deckOrder - b.deckOrder;
  });
}

/** The next card to serve, or undefined when the round is complete. */
export function pickNext(candidates: RoundCandidate[]): string | undefined {
  return orderRound(candidates)[0]?.cardId;
}
