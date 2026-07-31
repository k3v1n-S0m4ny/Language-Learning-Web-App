// Runtime shapes for the Advanced Thai study flow. The CONTENT shapes
// (VocabEntry / PhraseEntry) live in seed/advanced-thai/types.ts and are the
// single source of truth — these are the per-Learner state shapes layered on
// top, mirroring how lib/thai/types.ts relates to seed/thai/types.ts.

import type { LadderKey, StepFormat } from "@/lib/ladder/ladder";
import type { PhraseEntry, VocabEntry } from "@/seed/advanced-thai/types";

// Single source of truth for the two card kinds, so route validation (the
// [kind] segment) and the "Practice by type" home section iterate the same
// list rather than each hand-rolling their own union.
export const AT_CARD_KINDS = ["vocab", "phrase"] as const;
export type AtCardKind = (typeof AT_CARD_KINDS)[number];

/**
 * Which ladder a kind climbs. Vocab gets the full four-step climb up to cold
 * production; a phrase card has a one-rung ladder and never leaves recognition
 * — see the note on "advanced-thai:phrase" in lib/ladder/ladder.ts.
 */
export const LADDER_FOR_KIND: Record<AtCardKind, LadderKey> = {
  vocab: "advanced-thai:vocab",
  phrase: "advanced-thai:phrase",
};

/**
 * A card prepared for study. `payload` is discriminated by `kind` — this is the
 * same discriminated union the at_cards table stores, surfaced to the client so
 * one session component can dispatch to the two card designs.
 *
 * `step` and `format` come from the Learner's LADDER STATE, not from the content:
 * the same card is a different question at different steps, and the format is what
 * the session component actually dispatches on. `demotions` is the successor to
 * the FSRS lapse count and drives the leech badge.
 *
 * `options` carries the multiple-choice answers, and its contract is the security
 * one: the four strings are sent in DISPLAY ORDER WITH NO MARKING OF WHICH IS
 * CORRECT. The client cannot know the answer, so it cannot grade itself — it
 * posts back the string it chose and the server compares. Same discipline as
 * submitThaiAttempt (lib/thai/actions.ts).
 */
export type AtStudyCard = {
  id: string;
  step: number;
  format: StepFormat;
  demotions: number;
  /** Present on multiple-choice formats only; four options, correct one unmarked. */
  options?: string[];
} & (
  | { kind: "vocab"; payload: VocabEntry; audioUrl: string | null }
  | { kind: "phrase"; payload: PhraseEntry; audioUrl: string | null }
);

/**
 * Round counts, read as "Left N · Repeats N".
 *
 * Deliberately NARROWER than the Mandarin SessionCounts: there is no `gate`
 * field, because Advanced Thai is ungated by owner's decision (M16) — a theme's
 * cards are all available the moment the theme is seeded, and the seeding IS the
 * gate. Nothing here can withhold a card except the daily new-card cap.
 *
 * `remaining` COUNTS DOWN TO ZERO AT THE FINISH LINE, and it is deliberately not
 * the number of cards left to ASK. Those differ by a lot: a fresh Advanced Thai
 * vocab card takes four exposures to graduate, so a ten-card round runs ~40
 * answers. Defining `remaining` as "not yet asked this round" was tried first and
 * is actively misleading — it reads 0 after the tenth answer of forty, with the
 * whole climb still ahead. What a Learner wants from a finish line is how many
 * cards still owe them work, so that is what this is: every card in the batch
 * that has not yet passed at its top step.
 *
 * `repeats` is the subset of those already seen at least once today — the signal
 * that you are on a second or later pass rather than still meeting the batch. It
 * is read off `last_review` against the BANGKOK DAY BOUNDARY, which is what lets
 * an unpersisted round report itself at all: a card served this round was stamped
 * today by definition, and a card that merely came due today still carries the
 * stamp of the day it was last answered. Same boundary the daily new-card cap
 * uses, so both halves of the header agree on when "today" started.
 */
export interface AtRoundCounts {
  // Cards in the batch still short of a top-step pass — the round's finish line.
  remaining: number;
  // How many of those have already been asked today (`last_review` is on or after
  // the start of the Thailand day). A subset of `remaining`, not a second bucket.
  repeats: number;
  // Never-seen cards left in this theme, BEFORE the daily cap. The round-complete
  // screen uses this to decide whether a today-only top-up could actually produce
  // a card: if every card is seen, raising the allowance does nothing.
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
 * Header count for cross-theme practice-by-kind — one number, where the study
 * round has three.
 *
 * That collapse is the whole change to practice mode: it is now READ-ONLY. It
 * writes no state, so a card cannot climb, cannot be finished, and cannot leave —
 * which means there is no `remaining` to count down and no round to complete. It
 * is an endless random drill over what the Learner has already met, and the only
 * honest thing to report is how big that pool is. The session's own tally is
 * client-side, because it is a property of the sitting, not of the database.
 */
export interface AtPracticeCounts {
  // Every card of this kind the Learner has ever seen, across all themes.
  poolSize: number;
}

/**
 * What a study flow needs to draw its next question — returned BY THE GRADING
 * ACTIONS rather than fetched afterwards.
 *
 * This is the shape that lets the answer feedback and the next-card fetch
 * overlap. The old flow returned only a verdict, so the next card did not exist
 * anywhere until the client called router.refresh() once the feedback had
 * expired: the fetch was strictly serial AFTER the reveal, and the one moment the
 * Learner is happily busy reading was spent doing nothing. Handing the next card
 * back with the verdict moves that fetch behind the feedback, and removes a whole
 * client→server hop per card (the RSC re-render) along with it.
 *
 * A null `card` is the end of the flow — round complete, or an empty practice
 * pool. Modelled on SubmitExamAnswerResult.nextCard in lib/thai/exam-actions.ts,
 * which is where this pattern already works.
 *
 * `flow` is what makes the pair a discriminated union rather than two lookalikes.
 * The counts genuinely differ — a round has a finish line to count down, a
 * read-only drill has only a pool size — and the session component that carries
 * these payloads is shared by both flows and reads neither. The tag is what lets
 * each screen take back exactly the shape it knows how to render, with no cast.
 */
export interface AtNextRound {
  flow: "round";
  counts: AtRoundCounts;
  card: AtStudyCard | null;
}

export interface AtNextPractice {
  flow: "practice";
  counts: AtPracticeCounts;
  card: AtStudyCard | null;
}

export type AtNext = AtNextRound | AtNextPractice;

/** One card kind on the picker, with this Learner's progress through it. */
export interface AtKindSummary {
  kind: AtCardKind;
  seenCards: number;
  totalCards: number;
}
