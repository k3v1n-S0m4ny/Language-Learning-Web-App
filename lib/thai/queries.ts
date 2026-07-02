import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { thaiItems, thaiProgress } from "@/lib/db/schema";
import {
  BUILT_UNITS,
  TOTAL_UNITS,
  UNIT_1_LESSON_MARKER_ID,
  UNIT_TITLES,
} from "@/seed/thai/items";
import { isUnitUnlocked, percentMastered } from "./mastery";
import type { UnitSummary } from "./types";

// Every drillable item, grouped by unit (built units only — units 9-14 have
// no thai_items rows yet). One query, aggregated in JS (data is tiny: ~110 rows).
async function fetchDrillableItemsByUnit(): Promise<Map<number, string[]>> {
  const rows = await db
    .select({ id: thaiItems.id, unit: thaiItems.unit })
    .from(thaiItems)
    .where(eq(thaiItems.drillable, true));
  const byUnit = new Map<number, string[]>();
  for (const row of rows) {
    const list = byUnit.get(row.unit) ?? [];
    list.push(row.id);
    byUnit.set(row.unit, list);
  }
  return byUnit;
}

// The 14-unit map for the Thai-mode home screen (A4). Units 1-8 reflect real
// progress; 9-14 render as locked "coming soon" placeholders (no content yet).
export async function getUnitSummaries(learnerId: string): Promise<UnitSummary[]> {
  const [itemsByUnit, allProgress] = await Promise.all([
    fetchDrillableItemsByUnit(),
    db
      .select({
        itemId: thaiProgress.itemId,
        masteredAt: thaiProgress.masteredAt,
      })
      .from(thaiProgress)
      .where(eq(thaiProgress.learnerId, learnerId)),
  ]);

  const masteredIds = new Set(
    allProgress.filter((p) => p.masteredAt !== null).map((p) => p.itemId),
  );

  const unit1LessonComplete = masteredIds.has(UNIT_1_LESSON_MARKER_ID);

  const summaries: UnitSummary[] = [];
  let previousUnitUnlocksNext: boolean = true; // unit 1 is always reachable

  for (let unit = 1; unit <= TOTAL_UNITS; unit++) {
    const built = (BUILT_UNITS as readonly number[]).includes(unit);
    const lessonOnly = unit === 1;

    if (!built) {
      summaries.push({
        unit,
        title: UNIT_TITLES[unit] ?? `Unit ${unit}`,
        built: false,
        totalItems: 0,
        masteredItems: 0,
        percentMastered: 0,
        unlocked: false,
        lessonOnly: false,
        lessonComplete: false,
      });
      continue;
    }

    if (lessonOnly) {
      summaries.push({
        unit,
        title: UNIT_TITLES[unit],
        built: true,
        totalItems: 0,
        masteredItems: 0,
        percentMastered: unit1LessonComplete ? 100 : 0,
        unlocked: true,
        lessonOnly: true,
        lessonComplete: unit1LessonComplete,
      });
      previousUnitUnlocksNext = unit1LessonComplete;
      continue;
    }

    const itemIds = itemsByUnit.get(unit) ?? [];
    const masteredCount = itemIds.filter((id) => masteredIds.has(id)).length;
    const pct = percentMastered(masteredCount, itemIds.length);
    const unlocked: boolean = previousUnitUnlocksNext;

    summaries.push({
      unit,
      title: UNIT_TITLES[unit],
      built: true,
      totalItems: itemIds.length,
      masteredItems: masteredCount,
      percentMastered: pct,
      unlocked,
      lessonOnly: false,
      lessonComplete: true, // built-unit lessons are always readable (A4)
    });

    previousUnitUnlocksNext = unlocked && isUnitUnlocked(pct);
  }

  return summaries;
}

export async function getUnitSummary(
  learnerId: string,
  unit: number,
): Promise<UnitSummary | null> {
  const all = await getUnitSummaries(learnerId);
  return all.find((u) => u.unit === unit) ?? null;
}

// Per-learner progress rows for a set of item ids, keyed by itemId. Used by the
// drill round builder (lib/thai/drill.ts) to weight sampling.
export async function getProgressByItemIds(
  learnerId: string,
  itemIds: string[],
): Promise<Map<string, { streak: number; lastSeen: Date | null; masteredAt: Date | null }>> {
  if (!itemIds.length) return new Map();
  const rows = await db
    .select()
    .from(thaiProgress)
    .where(
      and(eq(thaiProgress.learnerId, learnerId), inArray(thaiProgress.itemId, itemIds)),
    );
  return new Map(
    rows.map((r) => [
      r.itemId,
      { streak: r.streak, lastSeen: r.lastSeen, masteredAt: r.masteredAt },
    ]),
  );
}
