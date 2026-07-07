import Link from "next/link";
import type { ConsonantExamState } from "@/lib/thai/exam-actions";
import { ProgressRing } from "@/components/thai/progress-ring";

// The Consonant Review Exam's own row on the Read-Thai home map, rendered
// between unit 5 and unit 6 (components/thai/thai-home.tsx). Mirrors
// unit-row.tsx's own glass-native styling exactly, but has no `unit` number
// and no Lesson link — it's a single checkpoint, not a numbered unit.
export function ExamCheckpointRow({
  examState,
  lockedReason,
}: {
  examState: ConsonantExamState;
  /** When set, force this row locked with this reason (restricted testers
   *  before unit 5 is finished). */
  lockedReason?: string;
}) {
  const forceLocked = Boolean(lockedReason);
  const locked = forceLocked || !examState.open;
  const percent = examState.total > 0 ? Math.round((examState.clearedCount / examState.total) * 100) : 0;
  // Live status drives this row's own Continue/Review/count display (2026-07-07
  // code review fix) — NOT the sticky `examState.cleared` flag, which stays
  // permanently true across a retake even though `status` (and the live
  // clearedCount/total) reset to a fresh in-progress deck. Using the sticky
  // flag here would show "Cleared"/100%/"Review" for a learner mid-retake.
  const currentlyCleared = examState.status === "completed";

  let statusLine: string;
  if (forceLocked) {
    statusLine = lockedReason!;
  } else if (!examState.open) {
    statusLine = "Locked — reach 90% on unit 5";
  } else if (currentlyCleared) {
    statusLine = "Cleared";
  } else if (examState.total > 0) {
    statusLine = `${examState.clearedCount} / ${examState.total} cleared`;
  } else {
    statusLine = "Every consonant so far, in one deck";
  }

  return (
    <div
      className={`glass flex items-center gap-3 rounded-[var(--r-lg)] p-3 shadow-[var(--glass-shadow)] transition-shadow sm:gap-4 sm:p-4 ${
        locked ? "opacity-60" : "hover:shadow-[0_12px_40px_rgba(23,23,23,0.18)]"
      }`}
    >
      <ProgressRing percent={locked ? 0 : currentlyCleared ? 100 : percent} locked={locked} />

      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Checkpoint</div>
        <div className="truncate text-sm font-semibold text-foreground">Consonant Review Exam</div>
        <div className="mt-0.5 text-xs text-foreground-muted">{statusLine}</div>
      </div>

      {!locked && (
        <div className="flex shrink-0 gap-2">
          <Link
            href="/thai/exam"
            className="tap-press group inline-flex min-h-[2.75rem] items-center gap-0.5 rounded-[var(--r-pill)] bg-accent px-3 py-1.5 text-xs font-medium text-on-earthy transition-opacity hover:opacity-90 sm:min-h-[auto]"
          >
            {currentlyCleared ? "Review" : examState.clearedCount > 0 ? "Continue" : "Start"}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              ›
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
