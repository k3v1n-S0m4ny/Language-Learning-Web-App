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
      className={`glass flex items-center gap-3 rounded-[var(--r-lg)] p-3 shadow-[var(--glass-shadow)] transition-shadow sm:gap-4 sm:p-4 ${
        locked ? "opacity-60" : "hover:shadow-[0_12px_40px_rgba(23,23,23,0.18)]"
      }`}
    >
      <ProgressRing percent={built ? percentMastered : 0} locked={locked} />

      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          Unit {unit}
        </div>
        <div className="truncate text-sm font-semibold text-foreground">{title}</div>
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
            className="tap-press group inline-flex min-h-[2.75rem] items-center gap-0.5 rounded-[var(--r-pill)] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-[var(--glass-bg-strong)] sm:min-h-[auto]"
          >
            Lesson
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            >
              ›
            </span>
          </Link>
          {!lessonOnly && unlocked && (
            <Link
              href={`/thai/${unit}/drill`}
              className="tap-press group inline-flex min-h-[2.75rem] items-center gap-0.5 rounded-[var(--r-pill)] bg-accent px-3 py-1.5 text-xs font-medium text-on-earthy transition-opacity hover:opacity-90 sm:min-h-[auto]"
            >
              {percentMastered >= 100 ? "Repractice" : "Drill"}
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              >
                ›
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
