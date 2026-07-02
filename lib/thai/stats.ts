// Stats queries for /thai/stats (A7). Data volume is tiny (113 items, one
// learner's attempts) so aggregation happens in JS, matching the pattern in
// lib/review/stats.ts.
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { thaiAttempts, thaiItems, thaiProgress } from "@/lib/db/schema";
import { THAILAND_OFFSET_MS, thaiDateKey, thaiShortLabel } from "@/lib/review/time";
import type { DayCount } from "@/lib/review/stats";

export interface UnitAccuracy {
  unit: number;
  total: number;
  correct: number;
  percent: number;
}

export interface FailureHeatmapRow {
  itemId: string;
  display: string;
  kind: string;
  unit: number;
  attempts: number;
  failures: number;
  failureRate: number; // 0-100
}

export interface StreakDay {
  key: string; // YYYY-MM-DD
  hasActivity: boolean;
}

export interface ThaiStats {
  masteredOverTime: DayCount[]; // cumulative, last 30 days
  accuracyByUnit: UnitAccuracy[];
  drillActivity: DayCount[]; // attempts/day, last 30 days
  failureHeatmap: FailureHeatmapRow[];
  streakCalendar: StreakDay[]; // last 84 days
}

function buildDayKeys(from: Date, n: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    keys.push(thaiDateKey(new Date(from.getTime() + i * 24 * 60 * 60 * 1000)));
  }
  return keys;
}

function keyToUtcInstant(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - THAILAND_OFFSET_MS);
}

export async function getThaiStats(learnerId: string, now: Date): Promise<ThaiStats> {
  const [progressRows, attemptRows, itemRows] = await Promise.all([
    db
      .select({ itemId: thaiProgress.itemId, masteredAt: thaiProgress.masteredAt })
      .from(thaiProgress)
      .where(eq(thaiProgress.learnerId, learnerId)),
    db
      .select({
        itemId: thaiAttempts.itemId,
        correct: thaiAttempts.correct,
        timestamp: thaiAttempts.timestamp,
      })
      .from(thaiAttempts)
      .where(eq(thaiAttempts.learnerId, learnerId)),
    db.select({ id: thaiItems.id, unit: thaiItems.unit, display: thaiItems.display, kind: thaiItems.kind }).from(thaiItems),
  ]);

  const itemById = new Map(itemRows.map((i) => [i.id, i]));

  // --- items mastered over time (cumulative, last 30 days) ---
  const todayStart = new Date(
    keyToUtcInstant(thaiDateKey(now)).getTime(),
  );
  const past30Start = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
  const past30Keys = buildDayKeys(past30Start, 30);

  const masteredByKey = new Map<string, number>();
  for (const row of progressRows) {
    if (!row.masteredAt) continue;
    const key = thaiDateKey(row.masteredAt);
    masteredByKey.set(key, (masteredByKey.get(key) ?? 0) + 1);
  }
  // Baseline: masteries before the 30-day window, so the chart starts from
  // the learner's real cumulative total rather than resetting to 0.
  let cumulative = 0;
  for (const row of progressRows) {
    if (row.masteredAt && row.masteredAt < past30Start) cumulative++;
  }
  const masteredOverTime: DayCount[] = past30Keys.map((key) => {
    cumulative += masteredByKey.get(key) ?? 0;
    return { label: thaiShortLabel(keyToUtcInstant(key)), count: cumulative };
  });

  // --- accuracy by unit ---
  const byUnit = new Map<number, { total: number; correct: number }>();
  for (const attempt of attemptRows) {
    const item = itemById.get(attempt.itemId);
    if (!item) continue;
    const bucket = byUnit.get(item.unit) ?? { total: 0, correct: 0 };
    bucket.total++;
    if (attempt.correct) bucket.correct++;
    byUnit.set(item.unit, bucket);
  }
  const accuracyByUnit: UnitAccuracy[] = [...byUnit.entries()]
    .sort(([a], [b]) => a - b)
    .map(([unit, { total, correct }]) => ({
      unit,
      total,
      correct,
      percent: total > 0 ? Math.round((correct / total) * 100) : 0,
    }));

  // --- drill activity, last 30 days ---
  const activityByKey = new Map<string, number>();
  for (const attempt of attemptRows) {
    const key = thaiDateKey(attempt.timestamp);
    activityByKey.set(key, (activityByKey.get(key) ?? 0) + 1);
  }
  const drillActivity: DayCount[] = past30Keys.map((key) => ({
    label: thaiShortLabel(keyToUtcInstant(key)),
    count: activityByKey.get(key) ?? 0,
  }));

  // --- per-item failure heatmap (only items with ≥1 attempt) ---
  const byItem = new Map<string, { attempts: number; failures: number }>();
  for (const attempt of attemptRows) {
    const bucket = byItem.get(attempt.itemId) ?? { attempts: 0, failures: 0 };
    bucket.attempts++;
    if (!attempt.correct) bucket.failures++;
    byItem.set(attempt.itemId, bucket);
  }
  const failureHeatmap: FailureHeatmapRow[] = [...byItem.entries()]
    .map(([itemId, { attempts, failures }]) => {
      const item = itemById.get(itemId);
      return {
        itemId,
        display: item?.display ?? itemId,
        kind: item?.kind ?? "",
        unit: item?.unit ?? 0,
        attempts,
        failures,
        failureRate: attempts > 0 ? Math.round((failures / attempts) * 100) : 0,
      };
    })
    .sort((a, b) => b.failureRate - a.failureRate || b.attempts - a.attempts);

  // --- streak calendar, last 84 days (12 weeks) ---
  // activityByKey is built from the full attempt list (not date-filtered
  // above), so it already covers however far back the calendar needs to look.
  const calendarStart = new Date(todayStart.getTime() - 83 * 24 * 60 * 60 * 1000);
  const calendarKeys = buildDayKeys(calendarStart, 84);
  const streakCalendar: StreakDay[] = calendarKeys.map((key) => ({
    key,
    hasActivity: (activityByKey.get(key) ?? 0) > 0,
  }));

  return { masteredOverTime, accuracyByUnit, drillActivity, failureHeatmap, streakCalendar };
}
