import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { thaiItems, thaiProgress } from "@/lib/db/schema";
import {
  ALL_THAI_ITEMS,
  BUILT_UNITS,
  TOTAL_UNITS,
  UNIT_1_LESSON_MARKER_ID,
  UNIT_TITLES,
} from "@/seed/thai/items";
import { LESSON_READ_DRILL_TYPE, isUnitUnlocked, percentMastered } from "./mastery";
import { isThaiQaUnlockEmail } from "./qa-access";
import { unitMasteryStats } from "./reachability";
import type { UnitSummary } from "./types";

// itemId -> the set of drillTypes mastered (masteredAt not null) for that item.
// M12: thai_progress is now keyed per (learner, item, drillType), so this
// replaces the old "itemId -> masteredAt" map.
async function fetchMasteredDrillTypesByItem(learnerId: string): Promise<Map<string, Set<string>>> {
  const rows = await db
    .select({
      itemId: thaiProgress.itemId,
      drillType: thaiProgress.drillType,
      masteredAt: thaiProgress.masteredAt,
    })
    .from(thaiProgress)
    .where(eq(thaiProgress.learnerId, learnerId));
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.masteredAt) continue;
    const set = map.get(row.itemId) ?? new Set<string>();
    set.add(row.drillType);
    map.set(row.itemId, set);
  }
  return map;
}

// STRICT per-UNIT mastery (A1, owner-approved 2026-07-03; SCOPING fixed in
// round 2 — see lib/thai/reachability.ts header comment for the full CRITICAL
// 1 writeup). A unit's own percentMastered — which gates the NEXT unit's
// unlock — requires EVERY drill type that unit's OWN drill session offers for
// an item, per `reachableDrillTypesForUnit(unit, ...)`. Deliberately NOT the
// cross-unit union (`allReachableDrillTypesForItem`): a unit 2-5 consonant's
// `letter-final` streak (only ever drilled inside unit 6's session) must
// never gate that consonant's HOME unit's own percentage, or the home unit
// can never reach 90% and the whole course deadlocks past unit 2. Structural
// (not gated on whether audioUrl currently exists — an item with no clip yet
// stays genuinely unmasterable, per A1's original STRICT intent), computed
// from the static seed content so it needs no DB round-trip beyond the
// learner's own progress rows. `unitMasteryStats` itself now lives in
// lib/thai/reachability.ts (M13/A6 residual #2) so scripts/seed-thai-db.ts
// can run a regression guard against it without importing this DB-backed
// module.

// The 14-unit map for the Thai-mode home screen (A4). All 14 units are built
// (BUILT_UNITS = [1..14] as of M14) — the "coming soon" placeholder branch in
// components/thai/unit-row.tsx is retained for safety but is no longer reachable.
export async function getUnitSummaries(learnerId: string): Promise<UnitSummary[]> {
  // Owner-approved QA bypass (lib/thai/qa-access.ts) — for exactly one email,
  // force every BUILT unit's exposed `unlocked` flag true, so the owner can
  // QA any unit without grinding the 90%-mastery gate. Resolving auth() here
  // is safe: every caller of getUnitSummaries/getUnitSummary is request-
  // scoped, and a missing session or any other learner's session simply
  // yields qaUnlockAll = false (normal gating, unaffected). Real mastery
  // numbers below are computed identically either way — only the exposed
  // `unlocked` flag is overridden, and the previousUnitUnlocksNext
  // propagation math still uses the REAL computed unlock state, not this
  // override.
  const session = await auth();
  const qaUnlockAll = isThaiQaUnlockEmail(session?.user?.email);

  const masteredByItem = await fetchMasteredDrillTypesByItem(learnerId);

  const unit1LessonComplete =
    masteredByItem.get(UNIT_1_LESSON_MARKER_ID)?.has(LESSON_READ_DRILL_TYPE) ?? false;

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

    const { total, mastered: masteredCount } = unitMasteryStats(unit, masteredByItem, ALL_THAI_ITEMS);
    const pct = percentMastered(masteredCount, total);
    const unlocked: boolean = previousUnitUnlocksNext;

    summaries.push({
      unit,
      title: UNIT_TITLES[unit],
      built: true,
      totalItems: total,
      masteredItems: masteredCount,
      percentMastered: pct,
      unlocked: qaUnlockAll ? true : unlocked,
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

export interface ToneWordWithAudio {
  id: string;
  display: string;
  initialIpa: string | null;
  metadata: Record<string, unknown>;
  audioUrl: string | null;
}

// Unit 9's tone-word rows with their (possibly still-null) audioUrl, for the
// lesson's listen-and-repeat tiles (A3). Read from the DB rather than the
// typed seed module — seed/thai/types.ts content has no audioUrl field; that
// only exists once the M12 paid audio batch writes it into thai_items.
export async function getToneWords(): Promise<ToneWordWithAudio[]> {
  const rows = await db
    .select({
      id: thaiItems.id,
      display: thaiItems.display,
      initialIpa: thaiItems.initialIpa,
      metadata: thaiItems.metadata,
      audioUrl: thaiItems.audioUrl,
    })
    .from(thaiItems)
    .where(and(eq(thaiItems.kind, "tone-word"), eq(thaiItems.unit, 9)))
    // Deterministic order (round 2 LOW fix) — without this, Postgres makes no
    // ordering guarantee at all, so ToneEarLesson's family grouping order
    // ([...new Set(words.map(w => w.metadata.family))], which relies on first-
    // appearance order) could vary between requests.
    .orderBy(thaiItems.id);
  return rows.map((r) => ({ ...r, metadata: (r.metadata ?? {}) as Record<string, unknown> }));
}

export interface ItemDrillProgress {
  drillType: string;
  streak: number;
  lastSeen: Date | null;
  masteredAt: Date | null;
}

// Per-learner progress rows for a set of item ids, keyed by itemId — now one
// entry per (item, drillType) row rather than one per item (M12/A1). Used by
// the drill round builder (lib/thai/drill.ts) to weight sampling.
export async function getProgressByItemIds(
  learnerId: string,
  itemIds: string[],
): Promise<Map<string, ItemDrillProgress[]>> {
  if (!itemIds.length) return new Map();
  const rows = await db
    .select()
    .from(thaiProgress)
    .where(
      and(eq(thaiProgress.learnerId, learnerId), inArray(thaiProgress.itemId, itemIds)),
    );
  const map = new Map<string, ItemDrillProgress[]>();
  for (const r of rows) {
    const list = map.get(r.itemId) ?? [];
    list.push({ drillType: r.drillType, streak: r.streak, lastSeen: r.lastSeen, masteredAt: r.masteredAt });
    map.set(r.itemId, list);
  }
  return map;
}
