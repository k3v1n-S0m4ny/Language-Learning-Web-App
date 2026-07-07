// Consonant Review Exam (Stage 2): the cumulative "clear the deck" checkpoint
// between unit 5 and unit 6. Drills every consonant learned so far (all 42
// drillable letters across units 2-5) across five modes — flashcard (reuses
// the units 2-5 self-graded recognition card), letter-sound / letter-final /
// letter-class / audio-letter (reuse the exact MCQ builders lib/thai/drill.ts
// already ships for units 2-5's legacy pool, now sourced cross-unit).
//
// The DB-free ("pure") deck-building/scoring engine lives in
// lib/thai/exam-pure.ts (re-exported below) so lib/thai/exam.test.ts can
// exercise it without a database — same rationale as lib/thai/reachability.ts's
// own header comment. This file adds the one DB read (fetchExamConsonants)
// and the MCQ/flashcard card hydration, both of which need lib/thai/drill.ts
// and lib/thai/flashcards.ts (which transitively import "@/lib/db").

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { thaiItems } from "@/lib/db/schema";
import { consonantDistractors, expectedAnswerFor, finalSoundDistractors } from "./drill";
export * from "./exam-pure";
import { NO_FINAL, NO_FINAL_LABEL, expectedFinalAnswer, shuffled, type ExamCard } from "./exam-pure";
import { flashcardCardFromItem, type FlashcardCard } from "./flashcards";
import type { DrillOption, DrillQuestion } from "./types";

export type ItemRow = typeof thaiItems.$inferSelect;

// A hydrated card the client can render. Flashcard-mode cards are shaped
// exactly like FlashcardCard (units 2-5's own flashcard UI); MCQ-mode cards
// are shaped exactly like DrillQuestion PLUS an optional `promptDisplay`
// (owner QA round, CORRECTION 3): the positional-dash notation shown instead
// of the bare glyph for letter-sound ("ก-", initial position) and
// letter-final ("-ก", final position) — display-only, never affects
// itemId/correctness. Discriminated by `mode` (duplicates DrillQuestion's own
// `drillType` for the MCQ branches, but gives the client one single
// discriminant to switch on regardless of card shape).
export type HydratedExamCard =
  | ({ mode: "flashcard" } & FlashcardCard)
  | ({ mode: "letter-sound" | "letter-final" | "letter-class" | "audio-letter" } & DrillQuestion & {
        promptDisplay?: string;
      });

// All 42 drillable consonants across units 2-5 — the exam's full subject
// pool, both as the deck's source AND as the cross-unit distractor pool for
// its MCQ modes (genuine discrimination, not same-unit-only, per the plan).
export async function fetchExamConsonants(): Promise<ItemRow[]> {
  return db
    .select()
    .from(thaiItems)
    .where(
      and(
        eq(thaiItems.kind, "consonant"),
        eq(thaiItems.drillable, true),
        inArray(thaiItems.unit, [2, 3, 4, 5]),
      ),
    )
    .orderBy(thaiItems.id);
}

function buildLetterSoundCard(item: ItemRow, pool: ItemRow[]): DrillQuestion & { promptDisplay: string } {
  const correct = expectedAnswerFor(item, "letter-sound")!;
  const distractors = consonantDistractors(pool, item, "initialIpa");
  return {
    itemId: item.id,
    drillType: "letter-sound",
    prompt: item.display,
    // CORRECTION 3 (owner QA round): initial-position notation — glyph then
    // hyphen ("ก-") — distinguishes this card from the bare-glyph
    // letter-class prompt at a glance, without changing itemId/correctness.
    promptDisplay: `${item.display}-`,
    promptKind: "consonant",
    audioUrl: item.audioUrl ?? undefined,
    correct,
    options: shuffled([{ value: correct, label: correct }, ...distractors]),
  };
}

// CORRECTION 1 (owner QA round): the 5th mode — the letter's FINAL-position
// sound. `correct` is derived via `expectedFinalAnswer` (NOT
// `expectedAnswerFor`, whose "letter-final" case would return a bare `null`
// for the 6 finalless consonants — see that function's own doc comment for
// why that's the wrong contract here). Options = correct + 3 distractors:
// `finalSoundDistractors` (lib/thai/drill.ts) always yields exactly 3
// real-final candidates (confusable-group-biased, falling back to the wider
// FINAL_SOUNDS pool when `correct` itself is NO_FINAL — see that function's
// own FINAL_GROUPS fallback). For a real-final card, NO_FINAL is ALSO folded
// into the candidate pool before down-selecting to 3, so "no final sound"
// shows up on real-final cards too (not just the 6 finalless ones — a
// giveaway otherwise); for a finalless card (correct === NO_FINAL), NO_FINAL
// is excluded from its own distractor pool (it's already the correct answer,
// never a distractor against itself).
function buildLetterFinalCard(item: ItemRow): DrillQuestion & { promptDisplay: string } {
  const correct = expectedFinalAnswer(item.finalIpa);
  const realFinalCandidates = finalSoundDistractors(correct);
  const candidatePool: DrillOption[] =
    correct === NO_FINAL
      ? realFinalCandidates
      : [...realFinalCandidates, { value: NO_FINAL, label: NO_FINAL_LABEL }];

  const seen = new Set([correct]);
  const distractors: DrillOption[] = [];
  for (const candidate of shuffled(candidatePool)) {
    if (seen.has(candidate.value)) continue;
    seen.add(candidate.value);
    distractors.push(candidate);
    if (distractors.length >= 3) break;
  }

  const correctLabel = correct === NO_FINAL ? NO_FINAL_LABEL : correct;
  return {
    itemId: item.id,
    drillType: "letter-final",
    prompt: item.display,
    // Final-position notation — hyphen then glyph ("-ก") — the mirror image
    // of letter-sound's initial-position "ก-".
    promptDisplay: `-${item.display}`,
    promptKind: "consonant",
    audioUrl: item.audioUrl ?? undefined,
    correct,
    options: shuffled([{ value: correct, label: correctLabel }, ...distractors]),
  };
}

function buildLetterClassCard(item: ItemRow): DrillQuestion {
  const correct = expectedAnswerFor(item, "letter-class")!;
  const allClasses = ["mid", "high", "low"];
  const distractors: DrillOption[] = allClasses
    .filter((c) => c !== correct)
    .map((c) => ({ value: c, label: c }));
  return {
    itemId: item.id,
    drillType: "letter-class",
    prompt: item.display,
    promptKind: "consonant",
    audioUrl: item.audioUrl ?? undefined,
    correct,
    options: shuffled([{ value: correct, label: correct }, ...distractors]),
  };
}

function buildAudioLetterCard(item: ItemRow, pool: ItemRow[]): DrillQuestion {
  const correct = expectedAnswerFor(item, "audio-letter")!;
  const distractors = consonantDistractors(pool, item, "display");
  return {
    itemId: item.id,
    drillType: "audio-letter",
    prompt: "",
    promptKind: "audio",
    audioUrl: item.audioUrl ?? undefined,
    correct,
    options: shuffled([{ value: correct, label: correct }, ...distractors]),
  };
}

// Hydrate a single ExamCard into the shape the client renders. `pool` is the
// full 42-consonant set (for cross-unit distractors); `alreadyRead` feeds
// the flashcard card's own "seen before" flag (see FlashcardCard).
export function hydrateCard(
  card: ExamCard,
  item: ItemRow,
  pool: ItemRow[],
  alreadyRead: boolean,
): HydratedExamCard {
  if (card.mode === "flashcard") {
    return { mode: "flashcard", ...flashcardCardFromItem(item, alreadyRead) };
  }
  if (card.mode === "letter-class") {
    return { mode: "letter-class", ...buildLetterClassCard(item) };
  }
  if (card.mode === "letter-sound") {
    return { mode: "letter-sound", ...buildLetterSoundCard(item, pool) };
  }
  if (card.mode === "letter-final") {
    return { mode: "letter-final", ...buildLetterFinalCard(item) };
  }
  return { mode: "audio-letter", ...buildAudioLetterCard(item, pool) };
}
