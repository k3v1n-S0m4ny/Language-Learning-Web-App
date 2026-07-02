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
import { DRILLED_UNITS, findUnreachableDrillableIds } from "../lib/thai/reachability";

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
