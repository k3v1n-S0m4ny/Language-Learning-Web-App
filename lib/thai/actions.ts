"use server";

import { refresh } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { learnerSettings, thaiAttempts, thaiItems, thaiProgress } from "@/lib/db/schema";
import { ALL_THAI_ITEMS, UNIT_1_LESSON_MARKER_ID } from "@/seed/thai/items";
import { expectedAnswerFor } from "./drill";
import { FLASHCARD_DRILL_TYPE, FLASHCARD_UNIT } from "./flashcards";
import { LESSON_READ_DRILL_TYPE, MASTERY_STREAK } from "./mastery";
import { getUnitSummaries } from "./queries";
import {
  allReachableDrillTypesForItem,
  isRequiredTypeMastered,
  unitOfferingDrillType,
  type DrillTypeId,
} from "./reachability";
import type { ActiveMode, DrillAnswerResult, DrillType } from "./types";

const KNOWN_DRILL_TYPES: DrillType[] = [
  "letter-sound",
  "letter-class",
  "letter-final",
  "word-final",
  "form-sound",
  "audio-letter",
  "audio-form",
  "audio-tone",
  "audio-word",
  "tone-assembly",
  "mark-tone",
  "word-ipa",
  // M14/A2.
  "sign-function",
  "leader-tone",
  "audio-leader",
  "numeral-value",
  "value-numeral",
  "audio-numeral",
  "phrase-split",
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
// Uses the LESSON_READ_DRILL_TYPE sentinel since thai_progress.drill_type is
// NOT NULL as of M12/A1 and this row has no real drill type.
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
      drillType: LESSON_READ_DRILL_TYPE,
      streak: 1,
      lastSeen: now,
      masteredAt: now,
    })
    .onConflictDoUpdate({
      target: [thaiProgress.learnerId, thaiProgress.itemId, thaiProgress.drillType],
      set: { lastSeen: now },
    });

  refresh();
}

// Score one drill answer: log the attempt (thai_attempts) and update mastery
// (thai_progress) per the 3-correct-in-a-row rule (A6), now scoped per
// (item, drillType) rather than per item (M12/A1: thai_progress gained a
// drillType dimension so streaks for e.g. letter-sound and letter-class on
// the same consonant no longer blend together). No `refresh()` here — the
// drill session is a client-driven multi-question round; the page only
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
// for the same (learnerId, itemId, drillType) (e.g. two tabs). neon-http's
// driver has no interactive transaction support (`db.transaction()` throws
// "No transactions support in neon-http driver" — verified directly in
// node_modules/drizzle-orm/neon-http/session.cjs), so the fix is a single
// atomic INSERT ... ON CONFLICT DO UPDATE whose SET expressions reference the
// table's own live pre-update values (thai_progress.streak / .mastered_at) —
// Postgres resolves these under the row lock taken by the upsert itself, so
// there is no separate read to race against.
//
// STRICT per-item mastery (A1, owner-approved 2026-07-03): the `newlyMastered`
// flag returned here reflects the ITEM as a whole (every drill type it is
// structurally reachable through — allReachableDrillTypesForItem — now has a
// 3-streak), not just this one drillType, so the drill summary screen's
// "newly mastered" count and the unit-% progress ring stay consistent with
// getUnitSummaries' own strict aggregation. Since an already-mastered
// drillType's mastered_at is frozen by the CASE below, the item's aggregate
// mastery state can only change on the turn a specific drillType crosses the
// threshold for the first time — so the aggregate check only needs to run
// when THIS write is that turn.
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

  // Server-side unlock check (round 2 HIGH fix). The drill *page*
  // (app/thai/[unit]/drill/page.tsx) already gates rendering on
  // `current?.unlocked`, but this Server Action is directly invocable
  // regardless of what the UI rendered — never trust the client on which
  // unit's session a (itemId, drillType) pair belongs to. Re-derive it:
  // some drill types (letter-final, word-final) are only ever offered by a
  // LATER unit's session than the item's own home unit (e.g. a unit
  // 2-5 consonant's letter-final is drilled inside unit 6), so the gating
  // unit is "whichever unit's session offers this exact pair", not
  // `item.unit`. Unit 1's lesson marker never reaches this action.
  //
  // M13/A6 residual #1: unit 2 is NOT unconditionally available — it is only
  // submittable once unit 1's lesson marker has been read, same as every
  // other built unit's gate (getUnitSummaries already computes unit 2's own
  // `unlocked` from `unit1LessonComplete`; this used to be bypassed by an
  // `gatingUnit > 2` check that skipped the summaries lookup entirely for
  // unit 2).
  const gatingUnit = unitOfferingDrillType(itemId, drillType as DrillTypeId, ALL_THAI_ITEMS);
  if (gatingUnit === null) throw new Error("Drill type does not apply to this item");
  // Review round-1 LOW fix: `gatingUnit` can never be < 2 here — every
  // element of `DRILLED_UNITS` (lib/thai/reachability.ts) is >= 2, and the
  // `=== null` check above already rejected the only other case. The unlock
  // check below is therefore unconditional (was previously gated on a
  // `gatingUnit >= 2` tautology left over from the A6.1 fix, which changed a
  // real `> 2` bypass into a condition that could never be false).
  const summaries = await getUnitSummaries(learnerId);
  const gatingUnitSummary = summaries.find((s) => s.unit === gatingUnit);
  if (!gatingUnitSummary?.unlocked) throw new Error("Unit not unlocked");

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
    INSERT INTO thai_progress (learner_id, item_id, drill_type, streak, last_seen, mastered_at)
    VALUES (
      ${learnerId},
      ${itemId},
      ${drillType},
      CASE WHEN ${correct} THEN 1 ELSE 0 END,
      now(),
      CASE WHEN ${correct} AND 1 >= ${MASTERY_STREAK} THEN now() ELSE NULL END
    )
    ON CONFLICT (learner_id, item_id, drill_type) DO UPDATE SET
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

  const localNewlyMastered =
    progressRow.mastered_at !== null &&
    progressRow.last_seen !== null &&
    progressRow.mastered_at === progressRow.last_seen;

  let itemFullyMastered = false;
  if (localNewlyMastered) {
    const required = allReachableDrillTypesForItem(itemId, ALL_THAI_ITEMS);
    const otherRequired = required.filter((dt) => dt !== drillType);
    if (otherRequired.length === 0) {
      itemFullyMastered = true;
    } else {
      // Include the legacy letter-sound alias in the query so the unit-2
      // flashcard grandfather (isRequiredTypeMastered) can see a pre-pilot
      // learner's letter-sound row — otherwise it would be filtered out here
      // and the item could never re-badge as fully mastered.
      const queryTypes: DrillTypeId[] = otherRequired.includes("letter-read")
        ? [...otherRequired, "letter-sound"]
        : otherRequired;
      const otherRows = await db
        .select({ drillType: thaiProgress.drillType, masteredAt: thaiProgress.masteredAt })
        .from(thaiProgress)
        .where(
          and(
            eq(thaiProgress.learnerId, learnerId),
            eq(thaiProgress.itemId, itemId),
            inArray(thaiProgress.drillType, queryTypes),
          ),
        );
      const masteredSet = new Set(
        otherRows.filter((r) => r.masteredAt !== null).map((r) => r.drillType),
      );
      itemFullyMastered = otherRequired.every((dt) => isRequiredTypeMastered(masteredSet, dt));
    }
  }

  return { correct, newlyMastered: itemFullyMastered, streak: progressRow.streak };
}

// Unit 2 flashcard pilot: record one self-graded card ("knew it" / "missed
// it"). Unlike submitThaiAttempt there is no objective answer to re-derive —
// the learner grades themselves — so this action trusts `knewIt` for the
// SELF-REPORTED card only. It cannot be abused to unlock later units against
// the rules: the itemId is validated to be a real unit-2 consonant, and unit
// 3 only unlocks once ALL nine unit-2 cards are read-mastered, exactly the
// same 100%-of-the-unit gate every other unit uses (getUnitSummaries).
//
// Clear-the-deck-once (owner-approved 2026-07-05): a single "knew it" masters
// the card immediately (masteredAt set, then frozen — the 3-streak MCQ rule
// does NOT apply to flashcards). "Missed it" resets the streak but never
// un-masters a card already cleared in an earlier pass. Atomic upsert for the
// same concurrency reason submitThaiAttempt uses one (neon-http has no
// interactive transactions).
export async function submitFlashcardGrade(
  itemId: string,
  knewIt: boolean,
): Promise<{ mastered: boolean }> {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");

  if (!itemId || typeof knewIt !== "boolean") {
    throw new Error("Invalid attempt payload");
  }

  const [item] = await db.select().from(thaiItems).where(eq(thaiItems.id, itemId));
  if (!item) throw new Error("Unknown item");
  // Structural guard: only the unit-2 mid-class consonants are self-graded
  // flashcards. Anything else must go through submitThaiAttempt's re-derived
  // scoring, never this trusted path.
  if (item.unit !== FLASHCARD_UNIT || item.kind !== "consonant" || !item.drillable) {
    throw new Error("Item is not a unit-2 flashcard");
  }

  // Unlock gate (mirrors submitThaiAttempt): unit 2 is only submittable once
  // unit 1's lesson marker has been read — getUnitSummaries computes unit 2's
  // own `unlocked` from that. A directly-POSTed grade for a locked unit is
  // rejected here regardless of what the UI rendered.
  const summaries = await getUnitSummaries(learnerId);
  const unit2 = summaries.find((s) => s.unit === FLASHCARD_UNIT);
  if (!unit2?.unlocked) throw new Error("Unit not unlocked");

  await db.execute(sql`
    INSERT INTO thai_progress (learner_id, item_id, drill_type, streak, last_seen, mastered_at)
    VALUES (
      ${learnerId},
      ${itemId},
      ${FLASHCARD_DRILL_TYPE},
      CASE WHEN ${knewIt} THEN 1 ELSE 0 END,
      now(),
      CASE WHEN ${knewIt} THEN now() ELSE NULL END
    )
    ON CONFLICT (learner_id, item_id, drill_type) DO UPDATE SET
      streak = CASE WHEN ${knewIt} THEN thai_progress.streak + 1 ELSE 0 END,
      last_seen = now(),
      mastered_at = CASE
        WHEN thai_progress.mastered_at IS NOT NULL THEN thai_progress.mastered_at
        WHEN ${knewIt} THEN now()
        ELSE thai_progress.mastered_at
      END
  `);

  // Audit log — the self-report is stored verbatim (no objective `expected`
  // exists for a flashcard, so both columns record the grade itself).
  await db.insert(thaiAttempts).values({
    learnerId,
    itemId,
    drillType: FLASHCARD_DRILL_TYPE,
    expected: "self:known",
    chosen: knewIt ? "self:known" : "self:missed",
    correct: knewIt,
    timestamp: new Date(),
  });

  return { mastered: knewIt };
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
