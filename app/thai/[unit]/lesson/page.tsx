import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getToneWords, getUnitSummary } from "@/lib/thai/queries";
import { TONE_MARK_ORDER } from "@/lib/thai/tone";
import type { ToneMark } from "@/seed/thai/types";
import {
  FINALS,
  HIGH_CONSONANTS,
  LOW_CONSONANTS_A,
  LOW_CONSONANTS_B,
  MID_CONSONANTS,
  UNIT_TITLES,
  VOWELS_A,
  VOWELS_B,
  WORD_BANK,
} from "@/seed/thai/items";
import { ConsonantTable } from "@/components/thai/lessons/consonant-table";
import { FinalsTable } from "@/components/thai/lessons/finals-table";
import { SyllableDecodeLesson } from "@/components/thai/lessons/syllable-decode-lesson";
import { ToneEarLesson } from "@/components/thai/lessons/tone-ear-lesson";
import { ToneRulesLesson } from "@/components/thai/lessons/tone-rules-lesson";
import { Unit1Lesson } from "@/components/thai/lessons/unit1-lesson";
import { VowelTable } from "@/components/thai/lessons/vowel-table";

const BUILT_LESSON_UNITS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

// M13/A2: groups the word bank's marked rows by tone mark, for the unit 10
// lesson's "one example per mark" section.
function markedExamplesByMark() {
  const map = {} as Record<ToneMark, typeof WORD_BANK>;
  for (const mark of TONE_MARK_ORDER) {
    map[mark] = WORD_BANK.filter((w) => w.metadata.toneMark === mark);
  }
  return map;
}

// Lesson pages are always readable regardless of drill lock state (A4) — this
// page only gates on "is this unit built at all" (1-8), not on unlock status.
export default async function ThaiLessonPage({
  params,
}: {
  params: Promise<{ unit: string }>;
}) {
  const { unit: unitParam } = await params;
  const unit = Number(unitParam);

  if (!Number.isInteger(unit) || !BUILT_LESSON_UNITS.has(unit)) {
    notFound();
  }

  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) return null;

  const summary = await getUnitSummary(learnerId, unit);
  const toneWords = unit === 9 ? await getToneWords() : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 bg-background px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-full border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
        >
          Back to units
        </Link>
        {unit < 11 && (
          <Link
            href={`/thai/${unit + 1}/lesson`}
            className="rounded-full border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
          >
            Next unit →
          </Link>
        )}
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          Unit {unit} · Lesson
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {UNIT_TITLES[unit]}
        </h1>
      </div>

      {unit === 1 && <Unit1Lesson alreadyRead={summary?.lessonComplete ?? false} />}
      {unit === 2 && <ConsonantTable items={MID_CONSONANTS} />}
      {unit === 3 && <ConsonantTable items={HIGH_CONSONANTS} />}
      {unit === 4 && <ConsonantTable items={LOW_CONSONANTS_A} />}
      {unit === 5 && <ConsonantTable items={LOW_CONSONANTS_B} />}
      {unit === 6 && <FinalsTable items={FINALS} />}
      {unit === 7 && <VowelTable items={VOWELS_A} />}
      {unit === 8 && <VowelTable items={VOWELS_B} />}
      {unit === 9 && toneWords && <ToneEarLesson words={toneWords} />}
      {unit === 10 && <ToneRulesLesson markedExamples={markedExamplesByMark()} />}
      {unit === 11 && <SyllableDecodeLesson words={WORD_BANK} />}

      {unit !== 1 && summary?.unlocked && (
        <Link
          href={`/thai/${unit}/drill`}
          className="w-fit rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Start drilling this unit
        </Link>
      )}
    </main>
  );
}
