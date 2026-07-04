import Link from "next/link";
import type { UnitSummary } from "@/lib/thai/types";
import { ProgressRing } from "./progress-ring";

// Glass-native unit-map row (Phase 2): the unit map is a "floating chrome"
// surface per the design system, so the .glass recipe is sanctioned here
// (unlike the flat drill/lesson content surfaces). Concentric capsule
// radius; Drill CTA uses the Thai accent (saffron via [data-lang="thai"]);
// Lesson stays a quiet glass/ghost link. All existing links/lessonOnly/
// unlocked/Repractice logic preserved verbatim.
export function UnitRow({ summary }: { summary: UnitSummary }) {
  const { unit, title, built, unlocked, lessonOnly, percentMastered } = summary;
  const locked = !built || !unlocked;

  return (
    <div
      className={`glass flex items-center gap-4 rounded-[var(--r-lg)] p-4 ${
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
            className="rounded-[var(--r-pill)] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-[var(--glass-bg-strong)]"
          >
            Lesson
          </Link>
          {!lessonOnly && unlocked && (
            <Link
              href={`/thai/${unit}/drill`}
              className="rounded-[var(--r-pill)] bg-accent px-3 py-1.5 text-xs font-medium text-on-earthy transition-opacity hover:opacity-90"
            >
              {percentMastered >= 100 ? "Repractice" : "Drill"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
