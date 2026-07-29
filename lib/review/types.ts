// Shared shapes for the Mandarin study UI. Only serializable display data
// crosses to the client.
//
// The FSRS vocabulary is gone from this file entirely: there is no RatingValue
// (every answer is a boolean now) and no IntervalHints (the four "what happens if
// I press this" labels described FSRS's four grades, and the ladder has two
// buttons whose outcome never varies). What replaced them is `step` and `format`
// on the card itself — the same row is a different question depending on where
// the Learner has it.

import type { StepFormat } from "@/lib/ladder/ladder";

// One Word of a Card, ready to render. `audioUrl` is null when no Audio Clip exists.
export interface StudyWord {
  id: string;
  position: number;
  hanzi: string;
  gloss: string;
  pinyin: string;
  audioUrl: string | null;
}

/**
 * A Card prepared for study.
 *
 * `step` and `format` come from the Learner's LADDER STATE rather than from the
 * content, and `format` is what the session component dispatches on — the same
 * Card is a four-option recognition question at step 1, a flip card at step 2 and
 * a cold English→Chinese recall at step 3.
 *
 * `options` carries the multiple-choice answers, and its contract is the security
 * one: the four strings are sent in DISPLAY ORDER WITH NO MARKING OF WHICH IS
 * CORRECT, so the client cannot grade itself. It posts back the string it chose
 * and the server compares. Same discipline as submitThaiAttempt
 * (lib/thai/actions.ts) and AtStudyCard.options.
 */
export interface StudyCard {
  id: string;
  headword: string;
  isPhrase: boolean;
  wholeGloss: string;
  wholePinyin: string;
  wholeAudioUrl: string | null;
  words: StudyWord[];
  tags: string[];
  /**
   * HSK 3.0 band, or null if the Card has no confident level. 1-6 as published;
   * 7 means the merged "HSK 7-9" advanced band (HSK does not subdivide it).
   */
  hskLevel: number | null;
  /** 1-based position in the Mandarin ladder. */
  step: number;
  /** The question this Card is being asked as, derived from `step`. */
  format: StepFormat;
  /** Lifetime demotions — successor to the FSRS lapse count. Drives the leech badge. */
  demotions: number;
  /** Present on multiple-choice formats only; four options, correct one unmarked. */
  options?: string[];
}

// Why the HSK gate is currently withholding new Cards, if it is. Without this,
// an empty round is ambiguous between "daily cap reached" (come back tomorrow)
// and "next band locked" (reach the top step on more of the band below), and the
// round-complete screen cannot tell the Learner which.
export interface GateStatus {
  unlockedBand: number;
  /** The band that would open next, or null at the top of the ladder. */
  nextBand: number | null;
  /** The lowest band still under threshold — what actually blocks nextBand. */
  blockingBand: { band: number; mastered: number; required: number } | null;
  /**
   * Unseen Cards the gate would serve, BEFORE the daily cap is applied. Lets the
   * round-complete screen tell "you've done today's new Cards" (cap) apart from
   * "there are no new Cards left to give you until you master more" (gate), and
   * decides whether the +20 top-up button could actually produce anything.
   */
  eligibleUnseen: number;
}

/**
 * Header counts for the current round, read as "Left N · Repeats N".
 *
 * `remaining` COUNTS DOWN TO ZERO AT THE FINISH LINE and is deliberately not the
 * number of cards left to ASK: a fresh Mandarin card takes five exposures to
 * graduate, so a twenty-card round runs ~100 answers, and a counter defined as
 * "not yet asked this round" reads 0 after the twentieth of them with the whole
 * climb still ahead. It is every card in the batch that has not yet passed at its
 * top step. Same definition as AtRoundCounts.remaining — the two courses' headers
 * must mean the same thing.
 *
 * `repeats` is the subset already asked today, read off `last_review` against the
 * Bangkok day boundary — the same boundary the daily new-card cap uses.
 */
export interface SessionCounts {
  remaining: number;
  repeats: number;
  gate: GateStatus;
}
