// Consonant Review Exam (Stage 2): the cumulative "clear the deck" checkpoint
// between unit 5 and unit 6. Drills every consonant learned so far (all 42
// drillable letters across units 2-5) across four modes — flashcard (reuses
// the units 2-5 self-graded recognition card), letter-sound / letter-class /
// audio-letter (reuse the exact MCQ builders lib/thai/drill.ts already ships
// for units 2-5's legacy pool, now sourced cross-unit).
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
import { consonantDistractors, expectedAnswerFor } from "./drill";
export * from "./exam-pure";
import { shuffled, type ExamCard } from "./exam-pure";
import { flashcardCardFromItem, type FlashcardCard } from "./flashcards";
import type { DrillOption, DrillQuestion } from "./types";

export type ItemRow = typeof thaiItems.$inferSelect;

// A hydrated card the client can render. Flashcard-mode cards are shaped
// exactly like FlashcardCard (units 2-5's own flashcard UI); MCQ-mode cards
// are shaped exactly like DrillQuestion (the shared MCQ option-grid UI) —
// discriminated by `mode` (duplicates DrillQuestion's own `drillType` for the
// MCQ branches, but gives the client one single discriminant to switch on
// regardless of card shape).
export type HydratedExamCard =
  | ({ mode: "flashcard" } & FlashcardCard)
  | ({ mode: "letter-sound" | "letter-class" | "audio-letter" } & DrillQuestion);

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

function buildLetterSoundCard(item: ItemRow, pool: ItemRow[]): DrillQuestion {
  const correct = expectedAnswerFor(item, "letter-sound")!;
  const distractors = consonantDistractors(pool, item, "initialIpa");
  return {
    itemId: item.id,
    drillType: "letter-sound",
    prompt: item.display,
    promptKind: "consonant",
    audioUrl: item.audioUrl ?? undefined,
    correct,
    options: shuffled([{ value: correct, label: correct }, ...distractors]),
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
  return { mode: "audio-letter", ...buildAudioLetterCard(item, pool) };
}
