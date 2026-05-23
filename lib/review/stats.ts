// Stats queries for the Progress / Stats view (Milestone 6).
// All "day" bucketing uses Asia/Bangkok local midnight (A11).
// Data is small (2 learners, ~100 cards, hundreds of logs): rows are fetched and
// aggregated in JS rather than writing tz-sensitive SQL window functions.

import { gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards, reviewLogs, reviewStates, users } from "@/lib/db/schema";
import {
  startOfThailandDay,
  thaiDateKey,
  thaiShortLabel,
} from "@/lib/review/time";

// --- Public types -----------------------------------------------------------

export interface DayCount {
  /** Short human label for the X axis, e.g. "May 3" */
  label: string;
  count: number;
}

export interface RatingCounts {
  again: number; // FSRS rating 1
  hard: number; // FSRS rating 2
  good: number; // FSRS rating 3
  easy: number; // FSRS rating 4
}

export interface LearnerStats {
  learnerId: string;
  /** Displayed name — falls back to email when name is null */
  displayName: string;
  /** Cards that have at least one review_states row */
  seen: number;
  /** Total cards in the shared library */
  total: number;
  /** Cards where FSRS scheduled_days >= 21 (A4 definition of "mature") */
  mature: number;
  /** Reviews per Thai day, last 30 days, chronological (A5) */
  reviewsByDay: DayCount[];
  /** Current consecutive Thai-day streak with ≥1 review, ending today (A6) */
  streak: number;
  /** Cards due on each of the next 7 Thai days (A7) */
  dueForecast: DayCount[];
  /** Per-rating breakdown across all review_logs (A8) */
  ratingCounts: RatingCounts;
}

// --- Internal helpers -------------------------------------------------------

// Build an array of `n` Thai-day keys starting from (and including) `from`.
// `from` must be the startOfThailandDay boundary — a UTC instant whose offset-
// shifted date equals the Thai calendar date we want.
function buildDayKeys(from: Date, n: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
    keys.push(thaiDateKey(d));
  }
  return keys;
}

// Map a YYYY-MM-DD key (produced by thaiDateKey) back to the UTC instant that
// startOfThailandDay would return for that Thai calendar date — for label
// formatting with thaiShortLabel.
function keyToUtcInstant(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  // Date.UTC gives us midnight-UTC of that year/month/day; subtracting the
  // Thailand offset converts "Thai calendar midnight expressed in UTC" to the
  // actual UTC instant for that local midnight.
  return new Date(Date.UTC(y, m - 1, d) - 7 * 60 * 60 * 1000);
}

// Build a DayCount array for `dayKeys`, filling zeros for days with no data.
function buildDayCounts(
  dayKeys: string[],
  countsByKey: Map<string, number>,
): DayCount[] {
  return dayKeys.map((key) => ({
    label: thaiShortLabel(keyToUtcInstant(key)),
    count: countsByKey.get(key) ?? 0,
  }));
}

// Extract scheduled_days from the FSRS jsonb blob stored in review_states.
// ts-fsrs writes it as `scheduled_days` (snake_case).
function scheduledDays(fsrsCard: unknown): number {
  if (
    fsrsCard !== null &&
    typeof fsrsCard === "object" &&
    "scheduled_days" in fsrsCard
  ) {
    const v = (fsrsCard as Record<string, unknown>).scheduled_days;
    return typeof v === "number" ? v : 0;
  }
  return 0;
}

// --- Main export ------------------------------------------------------------

export async function getLearnersStats(now: Date): Promise<LearnerStats[]> {
  const todayStart = startOfThailandDay(now);
  // 30-day window starts 29 days before today (inclusive of today = 30 days).
  const past30Start = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
  // Fetch logs from 31 days back to give timezone headroom (A11).
  const logWindowStart = new Date(todayStart.getTime() - 31 * 24 * 60 * 60 * 1000);

  // Wave 1 — all data in parallel (no per-learner branching yet).
  const [allUsers, totalRow, allStates, recentLogs, allLogs] =
    await Promise.all([
      // All learners. Allowlist is 2 people; fetching all is safe.
      db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users),

      // Total cards in the shared library (A4 denominator).
      db.select({ n: sql<number>`cast(count(*) as int)` }).from(cards),

      // Every review_states row (needed for seen, mature, dueForecast).
      // Small table — safe to pull all rows.
      db
        .select({
          learnerId: reviewStates.learnerId,
          due: reviewStates.due,
          fsrsCard: reviewStates.fsrsCard,
        })
        .from(reviewStates),

      // Recent logs for the 30-day reviews-per-day chart (A5).
      db
        .select({
          learnerId: reviewLogs.learnerId,
          reviewedAt: reviewLogs.reviewedAt,
        })
        .from(reviewLogs)
        .where(gte(reviewLogs.reviewedAt, logWindowStart)),

      // All-time logs for the per-rating breakdown (A8) and streak (A6).
      // No date filter — ensures streak is never silently capped.
      db
        .select({
          learnerId: reviewLogs.learnerId,
          rating: reviewLogs.rating,
          reviewedAt: reviewLogs.reviewedAt,
        })
        .from(reviewLogs),
    ]);

  const total = totalRow[0]?.n ?? 0;

  // Aggregate per-learner stats in JS — avoids tz-sensitive SQL aggregations.
  return allUsers.map((u): LearnerStats => {
    const displayName = u.name ?? u.email ?? u.id;

    // --- Seen + mature (A4) ---
    const myStates = allStates.filter((s) => s.learnerId === u.id);
    const seen = myStates.length;
    const mature = myStates.filter((s) => scheduledDays(s.fsrsCard) >= 21).length;

    // All-time logs for this learner — used by both streak (A6) and rating
    // breakdown (A8).  Defined early so both sections can reference it.
    const myAllLogs = allLogs.filter((l) => l.learnerId === u.id);

    // --- Reviews per Thai day, last 30 days (A5) ---
    const past30Keys = buildDayKeys(past30Start, 30);
    const myRecentLogs = recentLogs.filter((l) => l.learnerId === u.id);
    const reviewsByKey = new Map<string, number>();
    for (const log of myRecentLogs) {
      const key = thaiDateKey(log.reviewedAt);
      reviewsByKey.set(key, (reviewsByKey.get(key) ?? 0) + 1);
    }
    const reviewsByDay = buildDayCounts(past30Keys, reviewsByKey);

    // --- Streak (A6) ---
    // Build a day-keyed review map from ALL-TIME logs so a streak of any length
    // is counted correctly.  `recentLogs` (31-day window) would silently cap the
    // streak at ~32 days.
    //
    // Semantics (standard SRS): today not yet reviewed does NOT break the streak.
    // We walk from i=0 (today) backwards.  If today has reviews, it increments
    // the streak and we continue.  If today has no reviews yet (i=0, zero count),
    // we skip rather than break — so "not yet reviewed today" doesn't reset the
    // streak.  The break only fires on a zero-review day that is NOT i=0, meaning
    // a genuine gap in the past.  Result: today=0, yesterday=reviews → streak
    // counts from yesterday; today=reviews, yesterday=reviews → streak includes
    // today.  This matches standard SRS "don't punish for not reviewing yet today"
    // behavior.
    //
    // Safety cap of 365 iterations: allLogs has no date filter so the backing
    // data supports any streak length; 365 is a practical upper bound (> 1 year).
    const myAllLogsReviewsByKey = new Map<string, number>();
    for (const log of myAllLogs) {
      const key = thaiDateKey(log.reviewedAt);
      myAllLogsReviewsByKey.set(key, (myAllLogsReviewsByKey.get(key) ?? 0) + 1);
    }
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const key = thaiDateKey(dayStart);
      if ((myAllLogsReviewsByKey.get(key) ?? 0) >= 1) {
        streak++;
      } else {
        // Today with zero reviews: skip so mid-day doesn't reset the streak.
        if (i === 0) continue;
        break;
      }
    }

    // --- Due forecast, next 7 Thai days (A7) ---
    // Cards overdue (due before today's Thailand midnight) are bucketed into
    // today so they are not silently dropped from the forecast.
    const forecastKeys = buildDayKeys(todayStart, 7);
    const todayKey = forecastKeys[0];
    const forecastCounts = new Map<string, number>();
    for (const state of myStates) {
      // Treat any overdue card as due today.
      const dueKey =
        state.due < todayStart ? todayKey : thaiDateKey(state.due);
      if (forecastKeys.includes(dueKey)) {
        forecastCounts.set(dueKey, (forecastCounts.get(dueKey) ?? 0) + 1);
      }
    }
    const dueForecast = buildDayCounts(forecastKeys, forecastCounts);

    // --- Per-rating breakdown, all time (A8) ---
    const ratingCounts: RatingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
    for (const log of myAllLogs) {
      if (log.rating === 1) ratingCounts.again++;
      else if (log.rating === 2) ratingCounts.hard++;
      else if (log.rating === 3) ratingCounts.good++;
      else if (log.rating === 4) ratingCounts.easy++;
    }

    return {
      learnerId: u.id,
      displayName,
      seen,
      total,
      mature,
      reviewsByDay,
      streak,
      dueForecast,
      ratingCounts,
    };
  });
}
