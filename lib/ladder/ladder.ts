// The step ladder: what format a card is asked in, and what promotes or demotes
// it. Pure — no DB import, so it runs under `tsx --test` like hsk-gate.ts.
//
// Replaces the FSRS rating vocabulary entirely. There is no Again/Hard/Good/Easy
// here and no RatingValue: every answer is a boolean. Multiple choice is graded
// by the server comparing the chosen option; flashcards are self-graded.

import { MAX_RUNG, intervalDaysForRung, nextRung } from "./intervals";

// The four question formats. "recognise" puts the target language on the front
// and asks for English; "produce" reverses it and asks the Learner to generate
// the target — the direction the app has never tested until now.
export type StepFormat = "recognise-mc" | "recognise-card" | "produce-mc" | "produce-card";

// Ladders are per-course config, NOT one shared constant. The two courses are
// deliberately asymmetric: Mandarin skips the produce-mc scaffold and goes
// straight from recognition to cold production, while Advanced Thai vocab keeps
// it because producing unspaced Thai script is the hardest ask in the app.
export type LadderKey = "mandarin" | "advanced-thai:vocab" | "advanced-thai:phrase";

export const LADDERS: Record<LadderKey, readonly StepFormat[]> = {
  mandarin: ["recognise-mc", "recognise-card", "produce-card"],
  "advanced-thai:vocab": ["recognise-mc", "recognise-card", "produce-mc", "produce-card"],
  // A one-rung ladder. Phrase cards are never asked in production: recalling a
  // whole unspaced Thai clause from an English gloss tests the gloss's wording,
  // not the language. They exist purely to accrue interval.
  "advanced-thai:phrase": ["recognise-card"],
};

// Two CONSECUTIVE passes, so a single lucky multiple-choice guess (25% at four
// options) cannot promote a card. The streak resets on any failure.
export const PASSES_TO_PROMOTE = 2;

export interface LadderState {
  /** 1-based position in the ladder. */
  step: number;
  /** Consecutive passes at the current step. */
  passStreak: number;
  /** Rung the NEXT top-step pass will be scheduled at. */
  intervalRung: number;
  /** Lifetime demotions. Successor to the FSRS lapse count. */
  demotions: number;
}

export const INITIAL_STATE: LadderState = {
  step: 1,
  passStreak: 0,
  intervalRung: 0,
  demotions: 0,
};

export interface Transition {
  state: LadderState;
  /**
   * True when the card passed at its top step. It leaves the round and is
   * scheduled `intervalDays` out; everything else keeps cycling today.
   */
  finished: boolean;
  intervalDays: number | null;
}

export function topStep(key: LadderKey): number {
  return LADDERS[key].length;
}

/** The format to ask a card in, given where it currently sits. */
export function formatForStep(key: LadderKey, step: number): StepFormat {
  const steps = LADDERS[key];
  const index = Math.min(Math.max(step, 1), steps.length) - 1;
  return steps[index];
}

/**
 * Apply one answer.
 *
 * Promotion needs two consecutive passes, but the top step needs only one — a
 * card there has nowhere to be promoted to, so each pass buys an interval rung
 * instead. That is what makes the 3x tail reachable at all: requiring two passes
 * per rung would halve how fast intervals stretch.
 *
 * Failure demotes exactly one step and resets the rung to the bottom, so a card
 * that lapses at the top re-earns its whole interval. It does NOT reset to step
 * 1: forgetting a gloss does not mean losing the ability to recognise it in
 * multiple choice. The floor is step 1 — a failure there is a no-op on `step`
 * but still resets the streak and counts a demotion.
 */
export function applyAnswer(
  key: LadderKey,
  current: LadderState,
  passed: boolean,
): Transition {
  const top = topStep(key);
  const step = Math.min(Math.max(current.step, 1), top);

  if (!passed) {
    return {
      state: {
        step: Math.max(1, step - 1),
        passStreak: 0,
        intervalRung: 0,
        demotions: current.demotions + 1,
      },
      finished: false,
      intervalDays: null,
    };
  }

  if (step === top) {
    return {
      state: {
        step,
        passStreak: 0,
        intervalRung: nextRung(current.intervalRung),
        demotions: current.demotions,
      },
      finished: true,
      // Scheduled at the rung the card arrived holding; the state carries the
      // incremented rung forward for next time. A card reaching the top step for
      // the first time therefore leaves at rung 0 — one day, not one of the long
      // intervals it has not yet earned.
      intervalDays: intervalDaysForRung(current.intervalRung),
    };
  }

  const streak = current.passStreak + 1;
  const promoted = streak >= PASSES_TO_PROMOTE;

  return {
    state: {
      step: promoted ? step + 1 : step,
      passStreak: promoted ? 0 : streak,
      intervalRung: current.intervalRung,
      demotions: current.demotions,
    },
    finished: false,
    intervalDays: null,
  };
}

/**
 * Exposures a never-seen card needs to graduate: two passes at every step below
 * the top, plus one pass at the top step to set its first interval.
 *
 * Mandarin 5, Advanced Thai vocab 7, Advanced Thai phrase 1. Exported because
 * the round-length risk lives here — a 20-card Mandarin round of new cards is
 * ~100 card-views, and that number should be visible, not buried.
 */
export function exposuresToGraduate(key: LadderKey): number {
  return (topStep(key) - 1) * PASSES_TO_PROMOTE + 1;
}

export function isAtTopStep(key: LadderKey, state: LadderState): boolean {
  return state.step >= topStep(key);
}

/**
 * Leeches — cards that need re-authoring rather than more repetition.
 *
 * The successor to the FSRS lapse count, and the threshold moves with it. Anki's
 * classic 8 counted only lapses of GRADUATED cards, because a card still in
 * learning steps could not lapse at all. A demotion is cheaper than that: every
 * miss at every step counts one, including the first four exposures of a card
 * being met for the first time, so a struggling new card can collect three or
 * four in a single sitting.
 *
 * 10 is set against that cheaper unit. It is the only difficulty signal the
 * scheduler has left — binary grading tells the 3x interval table nothing about
 * how hard a card was — so it is deliberately a flag for a human to look at, not
 * an input to scheduling.
 */
export const LEECH_DEMOTIONS = 10;

export function isLeech(demotions: number): boolean {
  return demotions >= LEECH_DEMOTIONS;
}

export { MAX_RUNG };
