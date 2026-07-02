import Link from "next/link";
import type { UnitSummary } from "@/lib/thai/types";
import { ProgressRing } from "./progress-ring";

export function UnitRow({ summary }: { summary: UnitSummary }) {
  const { unit, title, built, unlocked, lessonOnly, percentMastered } = summary;
  const locked = !built || !unlocked;

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-border-base bg-surface p-4 ${
        locked ? "opacity-60" : ""
      }`}
    >
      <ProgressRing percent={built ? percentMastered : 0} locked={locked} />

      <div className="flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          Unit {unit}
        </div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {!built && (
          <div className="mt-0.5 text-xs text-foreground-muted">Coming soon</div>
        )}
        {built && !unlocked && (
          <div className="mt-0.5 text-xs text-foreground-muted">
            Locked — reach 90% on the previous unit
          </div>
        )}
      </div>

      {built && (
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/thai/${unit}/lesson`}
            className="rounded-full border border-border-base px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-background"
          >
            Lesson
          </Link>
          {!lessonOnly && unlocked && (
            <Link
              href={`/thai/${unit}/drill`}
              className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              {percentMastered >= 100 ? "Repractice" : "Drill"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
