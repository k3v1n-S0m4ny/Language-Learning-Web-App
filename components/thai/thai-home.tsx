import { restrictedExamOpen, restrictedUnitOpen } from "@/lib/access";
import { getConsonantExamState } from "@/lib/thai/exam-actions";
import { getUnitSummaries } from "@/lib/thai/queries";
import { TopBar } from "@/components/top-bar";
import { ExamCheckpointRow } from "@/components/thai/exam/exam-checkpoint-row";
import { UnitRow } from "./unit-row";

// Thai-mode home screen (A4): the 14-unit vertical map replaces the Mandarin
// study screen entirely when learner_settings.active_mode = 'thai'. Phase 2:
// the inline header row is replaced by the shared floating glass <TopBar>
// (already renders the Thai "สวัสดี" greeting); no bg-background on <main> so
// the ambient mesh shows through, matching the Mandarin home (app/page.tsx).
export async function ThaiHome({
  learnerId,
  learnerName,
  restricted = false,
  showAdvancedThai = false,
}: {
  learnerId: string;
  learnerName: string | null | undefined;
  /** Restricted testers: hide the Mandarin mode toggle and lock units 3+. */
  restricted?: boolean;
  /** Owner only: adds the "Advanced" segment to the mode toggle (M16). */
  showAdvancedThai?: boolean;
}) {
  // MEDIUM fix (2026-07-07 code review): fetch summaries once and thread
  // them into getConsonantExamState, instead of letting it independently
  // re-run getUnitSummaries internally (it did, via isConsonantExamOpen) —
  // was a redundant full recompute on every home-page render.
  const units = await getUnitSummaries(learnerId);
  const examState = await getConsonantExamState(learnerId, units);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 page-gutter pb-[calc(5rem+var(--safe-bottom))] sm:pb-8">
      <TopBar
        activeMode="thai"
        learnerName={learnerName}
        statsHref="/thai/stats"
        showModeToggle={!restricted}
        showAdvancedThai={showAdvancedThai}
      />

      <div className="flex w-full max-w-2xl flex-col gap-3">
        <h1 className="text-display text-foreground">Read Thai</h1>
        {units.map((summary, i) => (
          // Entrance stagger (Phase 3): CSS animation-delay, gated keyframe →
          // instant for reduce-motion. Capped at 10 steps so a long list never
          // waits > ~0.4s before the last row appears.
          <div
            key={summary.unit}
            className="animate-slide-up-fade"
            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
          >
            <UnitRow
              summary={summary}
              lockedReason={
                restricted && !restrictedUnitOpen(summary.unit, summary.unlocked)
                  ? "In construction"
                  : undefined
              }
            />
            {summary.unit === 5 && (
              <div className="mt-3">
                <ExamCheckpointRow
                  examState={examState}
                  lockedReason={
                    restricted && !restrictedExamOpen(examState.open) ? "In construction" : undefined
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
