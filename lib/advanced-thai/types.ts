// Runtime shapes for the Advanced Thai study flow. The CONTENT shapes
// (VocabEntry / GrammarPattern / PhraseEntry) live in seed/advanced-thai/types.ts
// and are the single source of truth — these are the per-Learner state shapes
// layered on top, mirroring how lib/thai/types.ts relates to seed/thai/types.ts.

import type {
  GrammarPattern,
  PhraseEntry,
  VocabEntry,
} from "@/seed/advanced-thai/types";

export type AtCardKind = "vocab" | "grammar" | "phrase";

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
