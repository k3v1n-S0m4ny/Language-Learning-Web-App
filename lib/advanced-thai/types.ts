// Runtime shapes for the Advanced Thai study flow. The CONTENT shapes
// (VocabEntry / GrammarPattern / PhraseEntry) live in seed/advanced-thai/types.ts
// and are the single source of truth — these are the per-Learner state shapes
// layered on top, mirroring how lib/thai/types.ts relates to seed/thai/types.ts.

import type {
  GrammarPattern,
  PhraseEntry,
  VocabEntry,
} from "@/seed/advanced-thai/types";

// Single source of truth for the three card kinds, so route validation (the
// [kind] segment) and the "Practice by type" home section iterate the same
// list rather than each hand-rolling their own union.
export const AT_CARD_KINDS = ["vocab", "grammar", "phrase"] as const;
export type AtCardKind = (typeof AT_CARD_KINDS)[number];

/**
 * A card prepared for study. `payload` is discriminated by `kind` — this is the
 * same discriminated union the at_cards table stores, surfaced to the client so
 * one session component can dispatch to the three card designs.
 */
export type AtStudyCard =
  | { id: string; kind: "vocab"; payload: VocabEntry; audioUrl: string | null; lapses: number }
  | { id: string; kind: "grammar"; payload: GrammarPattern; audioUrl: null; lapses: number }
  | { id: string; kind: "phrase"; payload: PhraseEntry; audioUrl: string | null; lapses: number };

/**
 * Header counts. Deliberately NARROWER than the Mandarin SessionCounts: there is
 * no `gate` field, because Advanced Thai is ungated by owner's decision (M16) —
 * a theme's cards are all available the moment the theme is seeded, and the
 * seeding IS the gate. Nothing here can withhold a card except the daily new-card
 * cap, so there is nothing for a gate status to explain.
 */
export interface AtSessionCounts {
  dueCount: number;
  newRemaining: number;
  // Never-seen cards left in this theme, BEFORE the daily cap. The "all caught
  // up" screen uses this to decide whether a today-only top-up could actually
  // produce a card: if every card is seen, raising the allowance does nothing.
  unseenRemaining: number;
}

/** One theme on the picker, with this Learner's progress through it. */
export interface AtThemeSummary {
  slug: string;
  titleThai: string;
  titleEnglish: string;
  summary: string;
  totalCards: number;
  seenCards: number;
  dueCount: number;
  newRemaining: number;
}

/**
 * Header counts for cross-theme practice-by-kind. Shaped nothing like
 * AtSessionCounts on purpose — there is no `new`/`unseen` split here (the pool
 * is only cards already introduced, by design; see queries.ts) and instead a
 * `repeatCount` that a per-theme session doesn't need to surface, because this
 * flow's whole pool can legitimately drain to zero `remaining` while repeats
 * are still being served.
 */
export interface AtPracticeCounts {
  // Pool cards not yet rated in THIS session (lastReview is null or predates
  // `since`).
  remaining: number;
  // Practiced-this-session cards due again before the end of the Thai day —
  // the tier-1/tier-3 repeat queue.
  repeatCount: number;
  // Every card of this kind the Learner has ever seen, across all themes —
  // the session's total pool size, used for the "practiced all N" summary.
  poolSize: number;
}

/** One card kind on the picker, with this Learner's progress through it. */
export interface AtKindSummary {
  kind: AtCardKind;
  seenCards: number;
  totalCards: number;
}
