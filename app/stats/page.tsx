import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isRestrictedLearner } from "@/lib/access";
import { LangSync } from "@/components/lang-sync";
import { getLearnersStats } from "@/lib/review/stats";
import { ReviewsChart } from "@/components/stats/reviews-chart";
import { ForecastChart } from "@/components/stats/forecast-chart";
import { RatingChart } from "@/components/stats/rating-chart";
import { CountUp } from "@/components/ui/count-up";
import { StatCard } from "@/components/ui/stat-card";
import type { LearnerStats } from "@/lib/review/stats";

// Stats page — read-only progress view for both learners side by side.
// proxy.ts already redirects unauthenticated visitors; auth() here is a
// defensive guard that matches the pattern used in app/page.tsx (A2).
export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  // This page shows every learner's Mandarin progress side by side — restricted
  // testers have no Mandarin access, so send them to the Thai progress view.
  if (isRestrictedLearner(session.user.email)) {
    redirect("/thai/stats");
  }

  const learners = await getLearnersStats(new Date());

  return (
    // No bg-background here (Phase 3) — the global ambient mesh shows
    // through, matching app/page.tsx.
    <main className="min-h-dvh page-gutter pb-[calc(5rem+var(--safe-bottom))] sm:pb-8">
      <LangSync activeMode="mandarin" />
      {/* Header with back link (A1) */}
      <div className="mx-auto mb-8 flex max-w-5xl items-center justify-between gap-4">
        <h1 className="text-display text-foreground">Progress</h1>
        <Link
          href="/"
          className="tap-press rounded-[var(--r-pill)] border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
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

// One column per learner (A3). Server component — charts (and the count-up
// hero figure) are the only client-rendered parts, passed data as props.
// Content surface (a stats card the learner reads), so it stays the same
// "solid elevated" recipe as the flip-card faces — border + bg-surface +
// var(--glass-shadow) — never actual .glass blur behind the figures (Phase 3).
function LearnerColumn({ stats }: { stats: LearnerStats }) {
  const pct =
    stats.total > 0 ? Math.round((stats.seen / stats.total) * 100) : 0;

  return (
    <section className="flex flex-col gap-6 rounded-[var(--r-lg)] border border-border-base bg-surface p-6 shadow-[var(--glass-shadow)]">
      {/* Learner label */}
      <h2 className="text-base font-semibold text-foreground">
        {stats.displayName}
      </h2>

      {/* Hero moment: one count-up figure per column (Phase 3) */}
      <StatCard
        hero
        accent
        label="Cards seen"
        value={<CountUp value={stats.seen} />}
        sub={`${pct}% of ${stats.total}`}
      />

      {/* Cards mature / streak / leech count (A4) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <StatCard label="Mature" value={stats.mature} className="animate-slide-up-fade" style={{ animationDelay: "0ms" }} />
        <StatCard label="Streak" value={`${stats.streak}d`} className="animate-slide-up-fade" style={{ animationDelay: "40ms" }} />
        <StatCard label="Leeches" value={stats.leechCount} className="animate-slide-up-fade" style={{ animationDelay: "80ms" }} />
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted opacity-70">
      {children}
    </div>
  );
}
