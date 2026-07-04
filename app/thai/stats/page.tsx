import Link from "next/link";
import { auth } from "@/auth";
import { LangSync } from "@/components/lang-sync";
import { getThaiStats, type StreakDay } from "@/lib/thai/stats";
import { MasteredOverTimeChart } from "@/components/thai/stats/mastered-over-time-chart";
import { AccuracyByUnitChart } from "@/components/thai/stats/accuracy-by-unit-chart";
import { DrillActivityChart } from "@/components/thai/stats/drill-activity-chart";
import { FailureHeatmap } from "@/components/thai/stats/failure-heatmap";
import { StreakCalendar } from "@/components/thai/stats/streak-calendar";
import { ToneConfusionMatrix } from "@/components/thai/stats/tone-confusion-matrix";
import { CountUp } from "@/components/ui/count-up";
import { StatCard } from "@/components/ui/stat-card";

// Trailing run-length from the END of the (oldest-first) streak calendar
// already fetched by getThaiStats — no new query. Mirrors the same "today
// with zero activity yet doesn't break the streak" semantics as
// lib/review/stats.ts's streak calculation, applied to data already in hand.
//
// CAVEAT (post-review, MEDIUM): `stats.streakCalendar` is only an 84-day
// window (lib/thai/stats.ts's calendarKeys), so this silently caps the
// displayed streak at "84d" for any streak longer than that — unlike the
// Mandarin streak (lib/review/stats.ts's getLearnersStats, which walks up
// to 365 days of all-time review_logs specifically to avoid this cap). This
// phase's brief forbids adding a new query/lib change to fetch a longer
// window, so the cap is accepted as-is (a >84-day unbroken Thai drill streak
// is a low-likelihood edge case) — but it is NOT parity with the Mandarin
// figure, and a truly long-streak learner would see an inaccurate, truncated
// number rather than their real streak. Flagging here so a future phase
// that touches lib/thai/stats.ts can widen the window (or add a dedicated
// streak query) instead of assuming this number is exact.
function currentStreakFromCalendar(days: StreakDay[]): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].hasActivity) {
      streak++;
    } else if (i === days.length - 1) {
      continue; // today, no activity yet — don't reset
    } else {
      break;
    }
  }
  return streak;
}

// /thai/stats (A7): items-mastered-over-time, accuracy-by-unit, drill-activity
// history, per-item failure heatmap, streak calendar.
export default async function ThaiStatsPage() {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) return null;

  const stats = await getThaiStats(learnerId, new Date());

  // Hero + metric-row figures (Phase 3) — all derived from data the page
  // already fetched, no new queries or lib/thai/stats.ts changes.
  const itemsMastered = stats.masteredOverTime.at(-1)?.count ?? 0;
  const currentStreak = currentStreakFromCalendar(stats.streakCalendar);
  const drillAttempts30d = stats.drillActivity.reduce((sum, d) => sum + d.count, 0);
  const unitsWithData = stats.accuracyByUnit.length;

  return (
    <main className="min-h-dvh px-6 py-8">
      <LangSync activeMode="thai" />
      <div className="mx-auto mb-8 flex max-w-3xl items-center justify-between gap-4">
        <h1 className="text-display text-foreground">Read Thai — Progress</h1>
        <Link
          href="/"
          className="rounded-[var(--r-pill)] border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
        >
          Back to units
        </Link>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {/* Hero moment: items mastered (Phase 3) */}
        <StatCard
          hero
          accent
          label="Items mastered"
          value={<CountUp value={itemsMastered} />}
          sub="cumulative"
        />

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Streak" value={`${currentStreak}d`} />
          <StatCard label="Drills (30d)" value={drillAttempts30d} />
          <StatCard label="Units drilled" value={unitsWithData} />
        </div>

        <Section title="Items mastered — last 30 days">
          <MasteredOverTimeChart data={stats.masteredOverTime} />
        </Section>

        <Section title="Accuracy by unit">
          <AccuracyByUnitChart data={stats.accuracyByUnit} />
        </Section>

        <Section title="Drill activity — last 30 days">
          <DrillActivityChart data={stats.drillActivity} />
        </Section>

        <Section title="Per-item failure rate (hardest first)">
          <FailureHeatmap rows={stats.failureHeatmap} />
        </Section>

        <Section title="Streak calendar — last 12 weeks">
          <StreakCalendar days={stats.streakCalendar} />
        </Section>

        <Section title="Tone confusion matrix (audio-tone drills)">
          <ToneConfusionMatrix cells={stats.toneConfusion} />
        </Section>
      </div>
    </main>
  );
}

// Content surface (Phase 3): same "solid elevated" recipe as the Mandarin
// LearnerColumn — border + bg-surface + var(--glass-shadow), concentric
// radius — never actual .glass blur behind the charts/tables it wraps.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-border-base bg-surface p-6 shadow-[var(--glass-shadow)]">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
