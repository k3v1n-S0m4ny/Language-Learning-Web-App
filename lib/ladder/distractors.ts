// The multiple-choice option builder.
//
// Four options: the correct answer plus three distractors, drawn from the same
// neighbourhood as the answer — the same theme in Advanced Thai, the same HSK
// band in Mandarin. That biasing is the point, and it is copied from
// consonantDistractors (lib/thai/drill.ts): distractors sampled uniformly from
// the whole deck are trivially eliminable, so the question tests nothing. A
// distractor is only doing work if it is a plausible answer.
//
// Options are built AT QUERY TIME and nothing is stored, so they always reflect
// the live deck and no seed step can go stale.
//
// THE RETURN VALUE IS THE FOUR OPTIONS AND NOTHING ELSE — no index, no flag, no
// ordering convention that leaks which one is right. The correct answer is
// shuffled in among the distractors and the caller sends the array as-is. This is
// what makes it impossible for the client to grade itself, and the server
// re-derives the answer on submit rather than trusting a posted one (the same
// discipline as submitThaiAttempt, lib/thai/actions.ts).

// Relative, not "@/lib/shuffle": every other module in lib/ladder/ is importable
// by `tsx --test` without tsconfig path resolution, and this one stays that way.
import { pick, shuffled } from "../shuffle";

export const MC_OPTION_COUNT = 4;

/**
 * Collapses the differences that should not make two options count as different
 * answers: surrounding space, and the case of a Latin-script gloss. Thai text is
 * caseless so lowercasing is a no-op on it, and comparing normalized keeps a
 * distractor whose gloss differs from the answer only in capitalisation from
 * appearing beside it as a second correct option.
 */
export function normalizeOption(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Build the option list for one question.
 *
 * `pool` is every candidate answer in the neighbourhood, the correct one
 * included; it is filtered rather than assumed clean, because the caller reads it
 * straight out of the deck. Duplicates of the answer are dropped — a theme can
 * legitimately hold two cards glossed "to manage", and offering that gloss twice
 * would make the question unanswerable AND grade a right answer wrong, since the
 * server compares by text.
 *
 * A pool too small to yield three distractors returns what it has. The question
 * is easier than intended but still valid, which is the right failure for a deck
 * whose smallest theme is a handful of cards.
 */
export function buildOptions(correct: string, pool: string[]): string[] {
  const answer = normalizeOption(correct);
  const seen = new Set([answer]);
  const candidates: string[] = [];

  for (const value of pool) {
    const key = normalizeOption(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    candidates.push(value);
  }

  return shuffled([correct, ...pick(candidates, MC_OPTION_COUNT - 1)]);
}

/** Whether a submitted choice is the correct answer. The server's grading call. */
export function isCorrectChoice(choice: string, correct: string): boolean {
  return normalizeOption(choice) === normalizeOption(correct);
}
