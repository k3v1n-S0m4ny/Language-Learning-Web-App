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

// One pass promotes. This was two — a streak, so a single lucky multiple-choice
// guess (25% at four options) could not promote a card — and the anti-guessing
// job now belongs to DEMOTION instead. A card promoted on a lucky guess meets a
// self-graded flashcard at the next step, and a miss there sends it straight back
// down. The ladder catches the guess one exposure later rather than pre-empting
// it, at roughly half the repetition: Mandarin graduates in 3 exposures rather
// than 5, Advanced Thai vocab in 4 rather than 7.
export const PASSES_TO_PROMOTE = 1;

export interface LadderState {
  /** 1-based position in the ladder. */
  step: number;
  /**
   * Consecutive passes at the current step.
   *
   * VESTIGIAL while PASSES_TO_PROMOTE is 1 — a pass promotes, so this can never
   * reach 1 and is written 0 on every transition. Kept in the type and in the
   * `step` columns rather than dropped: removing it is a migration against real
   * learner data that buys nothing, and it is what a future per-ladder streak
   * rule would reach for.
   */
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
 * Every pass below the top promotes; every pass AT the top buys an interval rung
 * instead, because a card there has nowhere to be promoted to. That second half
 * is what makes the 3x tail reachable at all — gating a rung behind a streak
 * would halve how fast intervals stretch.
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
 * Exposures a never-seen card needs to graduate: PASSES_TO_PROMOTE passes at
 * every step below the top, plus one pass at the top step to set its first
 * interval.
 *
 * Mandarin 3, Advanced Thai vocab 4, Advanced Thai phrase 1. Exported because
 * the round-length risk lives here — a 20-card Mandarin round of new cards is
 * ~60 card-views, and that number should be visible, not buried.
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
