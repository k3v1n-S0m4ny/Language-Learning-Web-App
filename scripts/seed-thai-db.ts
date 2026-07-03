/**
 * Idempotent refresh of `thai_items` from the typed content module
 * (seed/thai/items.ts) — the Read-Thai equivalent of scripts/refresh-seed-db.ts.
 *
 * Safe to re-run any time the content module changes:
 *   1. Asserts the "every drillable item is reachable" invariant (see below)
 *      — aborts before touching the DB if it fails.
 *   2. Deletes thai_items rows whose id is no longer in ALL_THAI_ITEMS.
 *      FK cascades remove their thai_progress/thai_attempts rows too (expected:
 *      dropping a taught item should drop any progress on it).
 *   3. Upserts every item in ALL_THAI_ITEMS (insert new, update drifted).
 *
 * Mandarin-only tables (cards/words/review_states/…) are never touched.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { inArray, notInArray } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { ALL_THAI_ITEMS } from "../seed/thai/items";
import {
  DRILLED_UNITS,
  assertUnitMasteryScopingGuard,
  findUnreachableDrillableIds,
  maxAchievablePercentForUnit,
} from "../lib/thai/reachability";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Mechanical invariant (M11 review round 3): a thai_items row that is
// drillable:true and tagged unit:N is counted in that unit's
// getUnitSummaries denominator. If it has no path to becoming an actual
// drill subject (lib/thai/reachability.ts::computeReachableIds — the SAME
// function lib/thai/drill.ts's buildSubjectPool calls, not a re-implemented
// copy), that unit's mastery percentage can never reach 100%, and if it
// can't reach 90% the next unit can never unlock. This bug shipped twice
// (round 1: the 8 FinalItem rows; round 2: 9 word-bank rows with
// finalSound:null) before either failure mode was checked mechanically —
// this function is what prevents a third recurrence, for these two known
// cases and for any future unit whose content introduces the same pattern.
function assertEveryDrillableItemIsReachable(): void {
  const problems: string[] = [];
  for (const unit of DRILLED_UNITS) {
    const orphans = findUnreachableDrillableIds(unit, ALL_THAI_ITEMS);
    if (orphans.length) {
      problems.push(`unit ${unit}: ${orphans.length} unreachable drillable item(s): ${orphans.join(", ")}`);
    }
  }
  if (problems.length) {
    throw new Error(
      [
        "Reachability invariant violated — the following drillable items are",
        "counted in a unit's mastery denominator but can never be answered by",
        "any drill type buildSubjectPool builds for that unit (this permanently",
        "caps that unit below the unlock threshold):",
        ...problems.map((p) => `  - ${p}`),
        "Fix: either mark the orphaned item(s) drillable:false (if they are",
        "lesson-illustration-only content), or give them a real drill subject",
        "role in lib/thai/drill.ts's buildSubjectPool.",
      ].join("\n"),
    );
  }
  const total = DRILLED_UNITS.reduce(
    (sum, unit) => sum + ALL_THAI_ITEMS.filter((i) => i.unit === unit && i.drillable).length,
    0,
  );
  console.log(
    `[reachability] OK — every drillable item across units ${DRILLED_UNITS.join(",")} (${total} total) is reachable as a drill subject.`,
  );
}

// Second, independent invariant (M12 review round 2, point 3): "is this item
// reachable at all" (above) is necessary but not sufficient — round 2 found
// TWO new bug classes that check still misses entirely:
//   1. a drill type IS reachable, but only from a unit that is currently
//      LOCKED relative to the unit whose percentage needs it (letter-final
//      required units 2-5's own percentage but is only ever drilled in
//      unit-6's session) — a permanent unlock deadlock, not a reachability
//      gap.
//   2. a drill type is structurally required for an item that can never
//      satisfy it AT ALL (audio-form required for the two hidden vowels,
//      which have no written form to ever synthesize audio for) — the item
//      IS "reachable" (buildSubjectPool includes it), but one of its
//      required drill types is a permanent dead end.
// Both bug classes manifest the same way: a drilled unit's maximum
// achievable percentMastered, computed from ITS OWN drill session
// (reachableDrillTypesForUnit — never the cross-unit union), is less than
// 100% even for a hypothetically perfect learner. This assertion is that
// exact check — the same computation the M12 round-2 code review used to
// prove the deadlock, now a permanent seed-time gate.
function assertEveryUnitCanReach100Percent(): void {
  const problems: string[] = [];
  for (const unit of DRILLED_UNITS) {
    const pct = maxAchievablePercentForUnit(unit, ALL_THAI_ITEMS);
    if (pct < 100) {
      problems.push(
        `unit ${unit}: max achievable percentMastered = ${pct}% (< 100%) — some drill ` +
          "type required for an item in this unit's own session can never produce a " +
          "scoreable question (or is only ever offered by a different unit's session).",
      );
    }
  }
  if (problems.length) {
    throw new Error(
      [
        "Unlock-deadlock invariant violated — the following units can never reach",
        "100% percentMastered even for a perfect learner, which permanently blocks",
        "the 90% unlock threshold for the NEXT unit (M12 review round 2, CRITICAL 1/2):",
        ...problems.map((p) => `  - ${p}`),
        "Fix: make sure lib/thai/queries.ts::getUnitSummaries derives percentMastered",
        "from reachableDrillTypesForUnit(unit, ...) (per-unit-scoped), not from",
        "allReachableDrillTypesForItem's cross-unit union; and make sure every",
        "audio-gated drill type in reachableDrillTypesForUnit is only added when",
        "canEverHaveAudio(item) is true.",
      ].join("\n"),
    );
  }
  console.log(
    `[reachability] OK — every drilled unit (${DRILLED_UNITS.join(",")}) can reach 100% percentMastered given its own drill session.`,
  );
}

async function main() {
  if (!ALL_THAI_ITEMS.length) {
    throw new Error("seed/thai/items.ts has no items — aborting.");
  }

  const ids = ALL_THAI_ITEMS.map((item) => item.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) {
    throw new Error(`Duplicate thai_items id(s): ${[...new Set(dupes)].join(", ")}`);
  }

  assertEveryDrillableItemIsReachable();
  assertEveryUnitCanReach100Percent();
  assertUnitMasteryScopingGuard(ALL_THAI_ITEMS);

  // 1. Delete items no longer in the content module.
  const doomed = await db
    .select({ id: schema.thaiItems.id })
    .from(schema.thaiItems)
    .where(notInArray(schema.thaiItems.id, ids));
  if (doomed.length) {
    await db.delete(schema.thaiItems).where(
      inArray(
        schema.thaiItems.id,
        doomed.map((d) => d.id),
      ),
    );
  }
  console.log(`[delete] ${doomed.length} dropped item(s).`);

  // 2. Upsert every item.
  let inserted = 0;
  let updated = 0;
  const existing = await db
    .select({ id: schema.thaiItems.id })
    .from(schema.thaiItems)
    .where(inArray(schema.thaiItems.id, ids));
  const existingIds = new Set(existing.map((r) => r.id));

  for (const item of ALL_THAI_ITEMS) {
    await db
      .insert(schema.thaiItems)
      .values({
        id: item.id,
        kind: item.kind,
        unit: item.unit,
        display: item.display,
        initialIpa: item.initialIpa,
        finalIpa: item.finalIpa,
        consonantClass: item.consonantClass,
        metadata: item.metadata,
        drillable: item.drillable,
      })
      .onConflictDoUpdate({
        target: schema.thaiItems.id,
        set: {
          kind: item.kind,
          unit: item.unit,
          display: item.display,
          initialIpa: item.initialIpa,
          finalIpa: item.finalIpa,
          consonantClass: item.consonantClass,
          metadata: item.metadata,
          drillable: item.drillable,
        },
      });
    if (existingIds.has(item.id)) updated++;
    else inserted++;
  }

  console.log(
    `\nDone. ${inserted} inserted, ${updated} upserted-as-update, ${doomed.length} deleted. Total items: ${ALL_THAI_ITEMS.length}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
