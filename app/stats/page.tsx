import Link from "next/link";
import { auth } from "@/auth";
import { LangSync } from "@/components/lang-sync";
import { getLearnersStats } from "@/lib/review/stats";
import { ReviewsChart } from "@/components/stats/reviews-chart";
import { ForecastChart } from "@/components/stats/forecast-chart";
import { RatingChart } from "@/components/stats/rating-chart";
import type { LearnerStats } from "@/lib/review/stats";

// Stats page — read-only progress view for both learners side by side.
// proxy.ts already redirects unauthenticated visitors; auth() here is a
// defensive guard that matches the pattern used in app/page.tsx (A2).
export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const learners = await getLearnersStats(new Date());

  return (
    <main className="min-h-dvh bg-background px-6 py-8">
      <LangSync activeMode="mandarin" />
      {/* Header with back link (A1) */}
      <div className="mx-auto mb-8 flex max-w-5xl items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">
          Progress
        </h1>
        <Link
          href="/"
          className="rounded-full border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
        >
          Back to study
        </Link>
      </div>

      {/* Two-column layout — stacks on mobile (A3) */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2">
        {learners.map((learner) => (
          <LearnerColumn key={learner.learnerId} stats={learner} />
        ))}
      </div>
    </main>
  );
}

// One column per learner (A3). Server component — charts are the only
// client-rendered parts, passed data as props.
function LearnerColumn({ stats }: { stats: LearnerStats }) {
  const pct =
    stats.total > 0 ? Math.round((stats.seen / stats.total) * 100) : 0;

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border-base bg-surface p-6">
      {/* Learner label */}
      <h2 className="text-base font-semibold text-foreground">
        {stats.displayName}
      </h2>

      {/* Cards learned / mature / total (A4) + leech count */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Seen" value={`${stats.seen} / ${stats.total}`} sub={`${pct}%`} />
        <StatTile label="Mature" value={stats.mature} />
        <StatTile label="Streak" value={`${stats.streak}d`} />
        <StatTile label="Leeches" value={stats.leechCount} />
      </div>

      {/* Reviews over the last 30 days (A5) */}
      <div>
        <SectionLabel>Reviews — last 30 days</SectionLabel>
        <ReviewsChart data={stats.reviewsByDay} />
      </div>

      {/* Due forecast (A7) */}
      <div>
        <SectionLabel>Due — next 7 days</SectionLabel>
        <ForecastChart data={stats.dueForecast} />
      </div>

      {/* Rating breakdown (A8) */}
      <div>
        <SectionLabel>Rating breakdown</SectionLabel>
        <RatingChart ratingCounts={stats.ratingCounts} />
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-background p-3">
      <div className="text-xs text-foreground-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">
        {value}
      </div>
      {sub && (
        <div className="text-xs text-foreground-muted opacity-60">{sub}</div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted opacity-70">
      {children}
    </div>
  );
}
