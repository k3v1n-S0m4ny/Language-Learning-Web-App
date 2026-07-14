import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { getThemeSummaries } from "@/lib/advanced-thai/queries";
import { ProgressRing } from "@/components/progress-ring";

// The Advanced Thai home: the theme picker.
//
// A theme is one source text (นักโฆษณา, and more to follow in the same shape),
// and it is also the unit of release — the course is UNGATED by owner's decision
// (M16), so a theme's cards become available the moment the theme is seeded, and
// the seeding IS the gate. That is why this screen has no locks on it: there is
// nothing here a learner has to earn.
//
// It doubles as the progress view. Advanced Thai has no /stats page (the bottom
// nav correctly hides its Progress tab rather than link to a 404), so the per-
// theme ring and counts below are where progress actually lives.
export async function AdvancedThaiHome({
  learnerId,
  learnerName,
}: {
  learnerId: string;
  learnerName: string | null | undefined;
}) {
  const themes = await getThemeSummaries(learnerId);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 page-gutter pb-[calc(5rem+var(--safe-bottom))] sm:pb-8">
      <TopBar
        activeMode="advanced-thai"
        learnerName={learnerName}
        statsHref="/"
        showAdvancedThai
      />

      <div className="flex w-full max-w-2xl flex-col gap-1 pt-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Advanced Thai</h1>
        <p className="text-sm text-foreground-muted">
          Vocabulary, grammar and every phrase, from real Thai occupational texts.
        </p>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-3">
        {themes.length === 0 ? (
          <div className="glass flex flex-col items-center gap-2 rounded-[var(--r-lg)] p-8 text-center">
            <p className="text-sm font-medium text-foreground">No themes yet</p>
            <p className="text-xs text-foreground-muted">
              Seed one with scripts/seed-advanced-thai-db.ts.
            </p>
          </div>
        ) : (
          themes.map((theme) => {
            const percent =
              theme.totalCards === 0
                ? 0
                : Math.round((theme.seenCards / theme.totalCards) * 100);
            return (
              <Link
                key={theme.slug}
                href={`/advanced-thai/${theme.slug}`}
                className="group flex items-center gap-4 rounded-[var(--r-lg)] border border-border-base bg-surface p-4 shadow-[var(--glass-shadow)] transition-transform hover:-translate-y-0.5"
              >
                {/* `locked` is always false: Advanced Thai is ungated, so no theme
                    is ever withheld. */}
                <ProgressRing percent={percent} locked={false} />

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-thai-looped text-lg leading-tight text-foreground">
                      {theme.titleThai}
                    </span>
                    <span className="truncate text-sm text-foreground-muted">
                      {theme.titleEnglish}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-snug text-foreground-muted">
                    {theme.summary}
                  </p>
                  <p className="pt-1 text-[11px] font-semibold text-foreground-muted">
                    <span className="tabular-nums text-foreground">{theme.dueCount}</span> due ·{" "}
                    <span className="tabular-nums text-foreground">{theme.newRemaining}</span> new ·{" "}
                    <span className="tabular-nums">
                      {theme.seenCards}/{theme.totalCards}
                    </span>{" "}
                    seen
                  </p>
                </div>

                <span
                  aria-hidden
                  className="text-foreground-muted transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
