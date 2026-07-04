import Link from "next/link";
import { auth } from "@/auth";
import { LangSync } from "@/components/lang-sync";
import { getThaiStats } from "@/lib/thai/stats";
import { MasteredOverTimeChart } from "@/components/thai/stats/mastered-over-time-chart";
import { AccuracyByUnitChart } from "@/components/thai/stats/accuracy-by-unit-chart";
import { DrillActivityChart } from "@/components/thai/stats/drill-activity-chart";
import { FailureHeatmap } from "@/components/thai/stats/failure-heatmap";
import { StreakCalendar } from "@/components/thai/stats/streak-calendar";
import { ToneConfusionMatrix } from "@/components/thai/stats/tone-confusion-matrix";

// /thai/stats (A7): items-mastered-over-time, accuracy-by-unit, drill-activity
// history, per-item failure heatmap, streak calendar.
export default async function ThaiStatsPage() {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) return null;

  const stats = await getThaiStats(learnerId, new Date());

  return (
    <main className="min-h-dvh px-6 py-8">
      <LangSync activeMode="thai" />
      <div className="mx-auto mb-8 flex max-w-3xl items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">Read Thai — Progress</h1>
        <Link
          href="/"
          className="rounded-[var(--r-pill)] border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
        >
          Back to units
        </Link>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border-base bg-surface p-6">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
