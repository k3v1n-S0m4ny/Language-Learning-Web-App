"use server";

import { refresh } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { learnerSettings, thaiAttempts, thaiItems, thaiProgress } from "@/lib/db/schema";
import { UNIT_1_LESSON_MARKER_ID } from "@/seed/thai/items";
import { expectedAnswerFor } from "./drill";
import { MASTERY_STREAK } from "./mastery";
import { getUnitSummaries } from "./queries";
import type { ActiveMode, DrillAnswerResult, DrillType } from "./types";

const KNOWN_DRILL_TYPES: DrillType[] = [
  "letter-sound",
  "letter-class",
  "letter-final",
  "word-final",
  "form-sound",
];

// Persist the Learner's Mandarin/Thai mode choice (A3). Server Actions are
// reachable by direct POST, so the value is validated, not trusted.
export async function setActiveMode(mode: ActiveMode) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");

  if (mode !== "mandarin" && mode !== "thai") {
    throw new Error("Invalid mode");
  }

  await db
    .insert(learnerSettings)
    .values({ learnerId, activeMode: mode })
    .onConflictDoUpdate({
      target: learnerSettings.learnerId,
      set: { activeMode: mode },
    });

  refresh();
}

// Unit 1 has no drills — "complete when read" (A4). Marks the sentinel item's
// progress row as mastered so the unit map + unlock check treat it as done.
export async function markUnit1LessonRead() {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");

  const now = new Date();
  await db
    .insert(thaiProgress)
    .values({
      learnerId,
      itemId: UNIT_1_LESSON_MARKER_ID,
      streak: 1,
      lastSeen: now,
      masteredAt: now,
    })
    .onConflictDoUpdate({
      target: [thaiProgress.learnerId, thaiProgress.itemId],
      set: { lastSeen: now },
    });

  refresh();
}

// Score one drill answer: log the attempt (thai_attempts) and update mastery
// (thai_progress) per the 3-correct-in-a-row rule (A6). No `refresh()` here —
// the drill session is a client-driven multi-question round; the page only
// re-renders once, at the summary screen (handled by the caller navigating).
//
// Security (M11 review round 2, HIGH fix): the caller supplies only itemId +
// drillType + chosen. The "expected" answer is looked up server-side from
// thai_items and re-derived via expectedAnswerFor — never trusted from the
// client, since it drives both the persisted attempts log and mastery state.
//
// Concurrency (M11 review round 2, MEDIUM fix): the previous implementation
// SELECTed the current (streak, masteredAt), computed the next state in JS,
// then wrote it — a classic read-then-write race under concurrent submissions
// for the same (learnerId, itemId) (e.g. two tabs). neon-http's driver has no
// interactive transaction support (`db.transaction()` throws
// "No transactions support in neon-http driver" — verified directly in
// node_modules/drizzle-orm/neon-http/session.cjs), so the fix is a single
// atomic INSERT ... ON CONFLICT DO UPDATE whose SET expressions reference the
// table's own live pre-update values (thai_progress.streak / .mastered_at) —
// Postgres resolves these under the row lock taken by the upsert itself, so
// there is no separate read to race against. `newlyMastered` is derived from
// the RETURNING row by comparing mastered_at to last_seen: both are set to
// the statement's single `now()` call when a mastery transition happens in
// *this* write, so they're identical only when this write is the one that
// just mastered the item (a mastered_at from an earlier write will differ).
export async function submitThaiAttempt(
  itemId: string,
  drillType: DrillType,
  chosen: string,
): Promise<DrillAnswerResult> {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");

  if (!itemId || !KNOWN_DRILL_TYPES.includes(drillType) || chosen === undefined) {
    throw new Error("Invalid attempt payload");
  }

  const [item] = await db.select().from(thaiItems).where(eq(thaiItems.id, itemId));
  if (!item) throw new Error("Unknown item");

  const expected = expectedAnswerFor(item, drillType);
  if (expected === null) throw new Error("Drill type does not apply to this item");

  const correct = expected === chosen;

  // Raw db.execute() results are not schema-mapped (unlike .select()), so
  // timestamptz columns come back as the driver's text-protocol string
  // representation, not JS Date objects — confirmed against the dev DB while
  // building this fix. Comparing the two strings directly is sufficient (and
  // correct) here: they only need to be *equal*, not date-arithmetic-usable.
  const result = await db.execute<{
    streak: number;
    mastered_at: string | null;
    last_seen: string | null;
  }>(sql`
    INSERT INTO thai_progress (learner_id, item_id, streak, last_seen, mastered_at)
    VALUES (
      ${learnerId},
      ${itemId},
      CASE WHEN ${correct} THEN 1 ELSE 0 END,
      now(),
      CASE WHEN ${correct} AND 1 >= ${MASTERY_STREAK} THEN now() ELSE NULL END
    )
    ON CONFLICT (learner_id, item_id) DO UPDATE SET
      streak = CASE WHEN ${correct} THEN thai_progress.streak + 1 ELSE 0 END,
      last_seen = now(),
      mastered_at = CASE
        WHEN thai_progress.mastered_at IS NOT NULL THEN thai_progress.mastered_at
        WHEN ${correct} AND thai_progress.streak + 1 >= ${MASTERY_STREAK} THEN now()
        ELSE thai_progress.mastered_at
      END
    RETURNING streak, mastered_at, last_seen
  `);
  const progressRow = result.rows[0];
  if (!progressRow) throw new Error("Progress upsert returned no row");

  await db.insert(thaiAttempts).values({
    learnerId,
    itemId,
    drillType,
    expected,
    chosen,
    correct,
    timestamp: new Date(),
  });

  const newlyMastered =
    progressRow.mastered_at !== null &&
    progressRow.last_seen !== null &&
    progressRow.mastered_at === progressRow.last_seen;

  return { correct, newlyMastered, streak: progressRow.streak };
}

// Read-only snapshot used by the drill summary screen (A6: "unit %, unlock
// celebration"). Called once after the last question of a round.
export async function getUnitProgressSnapshot(unit: number) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");

  const summaries = await getUnitSummaries(learnerId);
  const current = summaries.find((s) => s.unit === unit);
  const next = summaries.find((s) => s.unit === unit + 1);

  return {
    percentMastered: current?.percentMastered ?? 0,
    nextUnitNewlyUnlocked: next?.unlocked ?? false,
    nextUnit: unit + 1,
  };
}
