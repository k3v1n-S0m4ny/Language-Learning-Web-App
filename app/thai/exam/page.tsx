import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isRestrictedLearner, restrictedExamOpen } from "@/lib/access";
import { getConsonantExamState, startOrResumeExam } from "@/lib/thai/exam-actions";
import { getUnitSummaries } from "@/lib/thai/queries";
import { LangSync } from "@/components/lang-sync";
import { ExamSession } from "@/components/thai/exam/exam-session";

// The Consonant Review Exam route — mirrors app/thai/[unit]/drill/page.tsx's
// own shape (auth -> gate -> build session state -> render), but there is no
// `unit` param: this is a single cumulative checkpoint, not a numbered unit.
export default async function ThaiExamPage() {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) return null;

  // CRITICAL + MEDIUM fix (2026-07-07 code review): fetch summaries ONCE,
  // FIRST, and thread it into both getConsonantExamState and
  // startOrResumeExam — was previously a `Promise.all` racing getUnitSummaries
  // against startOrResumeExam (which itself re-ran getUnitSummaries
  // internally), so `unitSixWasLocked` could be read AFTER startOrResumeExam
  // had already mutated the exam session row, depending on resolution order.
  // Sequencing this explicitly (summaries first, then the mutating call)
  // guarantees `unitSixWasLocked` reflects the state strictly BEFORE this
  // session's own answers can affect it, and also collapses what was 2-3
  // getUnitSummaries recomputations per request down to one.
  const summaries = await getUnitSummaries(learnerId);
  const examState = await getConsonantExamState(learnerId, summaries);

  // Restricted testers: the exam isn't tester-ready ground at all until unit
  // 5 is finished (restrictedExamOpen mirrors restrictedUnitOpen's own
  // "opens on finishing the previous unit" shape) — everything above that
  // stays not-found, same as an unbuilt unit route.
  if (isRestrictedLearner(session.user?.email) && !restrictedExamOpen(examState.open)) {
    notFound();
  }

  if (!examState.open) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 page-gutter pb-[calc(5rem+var(--safe-bottom))] text-center sm:pb-8">
        <LangSync activeMode="thai" />
        <p className="text-sm text-foreground-muted">
          The Consonant Review Exam unlocks once unit 5 is 90% mastered.
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

  const unitSixWasLocked = !(summaries.find((s) => s.unit === 6)?.unlocked ?? false);
  const started = await startOrResumeExam("consonants", summaries);

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
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          Checkpoint
        </div>
        <h1 className="text-xl font-semibold text-foreground">Consonant Review Exam</h1>
      </div>

      <ExamSession
        firstCard={started.firstCard}
        clearedCount={started.clearedCount}
        total={started.total}
        firstTry={started.firstTry}
        slips={started.slips}
        unitSixWasLocked={unitSixWasLocked}
      />
    </main>
  );
}
