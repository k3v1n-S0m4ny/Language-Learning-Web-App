import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isRestrictedLearner, restrictedUnitOpen } from "@/lib/access";
import { buildDrillRound } from "@/lib/thai/drill";
import { buildFlashcardDeck, FLASHCARD_UNITS, newShuffleSeed } from "@/lib/thai/flashcards";
import { getUnitSummaries } from "@/lib/thai/queries";
import { UNIT_TITLES } from "@/seed/thai/items";
import { LangSync } from "@/components/lang-sync";
import { DrillSession } from "@/components/thai/drill/drill-session";
import { FlashcardSession } from "@/components/thai/drill/flashcard-session";

const DRILLABLE_UNITS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);

export default async function ThaiDrillPage({
  params,
}: {
  params: Promise<{ unit: string }>;
}) {
  const { unit: unitParam } = await params;
  const unit = Number(unitParam);

  if (!Number.isInteger(unit) || !DRILLABLE_UNITS.has(unit)) {
    notFound();
  }

  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) return null;

  const summaries = await getUnitSummaries(learnerId);
  const current = summaries.find((s) => s.unit === unit);
  const nextUnitWasUnlocked = summaries.find((s) => s.unit === unit + 1)?.unlocked ?? false;

  // Restricted testers: units 1-2 are always open; unit 3 opens once they
  // finish unit 2; units 4+ stay under construction. (The generic unlock gate
  // below also applies — for unit 3 it's the same 90%-of-unit-2 condition.)
  if (
    isRestrictedLearner(session.user?.email) &&
    !restrictedUnitOpen(unit, current?.unlocked ?? false)
  ) {
    notFound();
  }

  if (!current?.unlocked) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 page-gutter pb-[calc(5rem+var(--safe-bottom))] text-center sm:pb-8">
        <LangSync activeMode="thai" />
        <p className="text-sm text-foreground-muted">
          Unit {unit} is still locked — reach 90% on the previous unit first.
        </p>
        <Link
          href="/"
          className="tap-press rounded-[var(--r-pill)] border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
        >
          Back to units
        </Link>
      </main>
    );
  }

  // Units 2-3 use the flashcard mechanic (self-graded clear-the-deck loop);
  // every other drilled unit uses the multiple-choice round.
  const isFlashcardUnit = FLASHCARD_UNITS.has(unit);
  const round = isFlashcardUnit ? null : await buildDrillRound(learnerId, unit);
  const cards = isFlashcardUnit ? await buildFlashcardDeck(learnerId, unit) : [];

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 page-gutter pb-[calc(5rem+var(--safe-bottom))] sm:pb-8">
      <LangSync activeMode="thai" />
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="tap-press rounded-[var(--r-pill)] border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
        >
          Back to units
        </Link>
        <Link
          href={`/thai/${unit}/lesson`}
          className="tap-press rounded-[var(--r-pill)] border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
        >
          Review lesson
        </Link>
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          Unit {unit} · {isFlashcardUnit ? "Flashcards" : "Drill"}
        </div>
        <h1 className="text-xl font-semibold text-foreground">{UNIT_TITLES[unit]}</h1>
      </div>

      {isFlashcardUnit ? (
        <FlashcardSession
          unit={unit}
          cards={cards}
          nextUnitWasUnlocked={nextUnitWasUnlocked}
          // Per-request seed so the client shuffle matches this server render
          // (no hydration mismatch) yet still varies each time the page loads.
          shuffleSeed={newShuffleSeed()}
        />
      ) : (
        <DrillSession
          unit={unit}
          questions={round!.questions}
          nextUnitWasUnlocked={nextUnitWasUnlocked}
        />
      )}
    </main>
  );
}
