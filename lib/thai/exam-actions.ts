"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { thaiAttempts, thaiExamSessions, thaiItems, thaiProgress } from "@/lib/db/schema";
import { submitFlashcardGrade } from "./actions";
import { expectedAnswerFor } from "./drill";
import {
  decideStartAction,
  EXAM_MODES,
  expectedFinalAnswer,
  fetchExamConsonants,
  hydrateCard,
  initialExamState,
  interleaveDeck,
  applyAnswer as pureApplyAnswer,
  type ExamMode,
  type ExamState,
  type HydratedExamCard,
} from "./exam";
import { FLASHCARD_DRILL_TYPE, newShuffleSeed } from "./flashcards";
import { MASTERY_STREAK } from "./mastery";
import { isThaiQaUnlockEmail } from "./qa-access";
import { getUnitSummaries } from "./queries";
import type { UnitSummary } from "./types";

const CONSONANTS_EXAM_KEY = "consonants";

function assertKnownExam(examKey: string): void {
  if (examKey !== CONSONANTS_EXAM_KEY) throw new Error("Unknown exam");
}

// The exam opens once unit 5 is >=90% mastered — the same bar that used to
// unlock unit 6 directly. Re-derived server-side on every call (never
// trusted from the client), same pattern as submitThaiAttempt's own
// server-side unlock re-check. The owner's QA-unlock email bypasses this
// gate entirely, mirroring getUnitSummaries' own qaUnlockAll override.
//
// MEDIUM fix (2026-07-07 code review): accepts an optional pre-fetched
// `summaries` so callers that already have one (thai-home.tsx, app/thai/
// exam/page.tsx) don't force a second/third full getUnitSummaries
// recomputation per request — only fetches its own copy when none is passed.
async function isConsonantExamOpen(
  learnerId: string,
  email: string | null | undefined,
  summaries?: UnitSummary[],
): Promise<boolean> {
  if (isThaiQaUnlockEmail(email)) return true;
  const list = summaries ?? (await getUnitSummaries(learnerId));
  const unit5 = list.find((s) => s.unit === 5);
  return !!unit5 && unit5.unlocked && unit5.percentMastered >= 90;
}

// A consonant's "already read" flag for flashcard-mode exam cards — the same
// (letter-read OR legacy letter-sound) mastery check buildFlashcardDeck uses,
// scoped to the exam's own 42-item pool rather than a single unit's deck.
async function fetchAlreadyReadSet(learnerId: string, itemIds: string[]): Promise<Set<string>> {
  if (!itemIds.length) return new Set();
  const rows = await db
    .select({
      itemId: thaiProgress.itemId,
      drillType: thaiProgress.drillType,
      masteredAt: thaiProgress.masteredAt,
    })
    .from(thaiProgress)
    .where(and(eq(thaiProgress.learnerId, learnerId), inArray(thaiProgress.itemId, itemIds)));
  return new Set(
    rows
      .filter(
        (r) =>
          r.masteredAt !== null &&
          (r.drillType === FLASHCARD_DRILL_TYPE || r.drillType === "letter-sound"),
      )
      .map((r) => r.itemId),
  );
}

async function hydrateHead(
  learnerId: string,
  state: ExamState,
): Promise<HydratedExamCard | null> {
  const head = state.queue[0];
  if (!head) return null;
  const pool = await fetchExamConsonants();
  const itemsById = new Map(pool.map((i) => [i.id, i]));
  const item = itemsById.get(head.itemId);
  if (!item) throw new Error("Exam card references unknown item");
  const alreadyReadSet = await fetchAlreadyReadSet(learnerId, pool.map((i) => i.id));
  return hydrateCard(head, item, pool, alreadyReadSet.has(head.itemId));
}

interface StartOrResumeResult {
  firstCard: HydratedExamCard | null;
  clearedCount: number;
  total: number;
  firstTry: ExamState["firstTry"];
  slips: number;
  done: boolean;
}

// Builds the client-facing summary from an AUTHORITATIVE, already-persisted
// ExamState — never from a locally-built object that might not (or might no
// longer) match what's actually in the DB row. Every return path in
// startOrResumeExam routes through this so resume/retake/fresh-create can
// never disagree with the persisted row (2026-07-08 fix, see that function's
// own header for the race this closes on the create path).
async function buildStartResult(learnerId: string, state: ExamState): Promise<StartOrResumeResult> {
  return {
    firstCard: await hydrateHead(learnerId, state),
    clearedCount: state.clearedCount,
    total: state.total,
    firstTry: state.firstTry,
    slips: state.slips,
    done: state.queue.length === 0,
  };
}

// Persistence model (deviation from a naive "insert a new row every session"
// design, documented in the implementation summary): exactly ONE
// thai_exam_sessions row is ever kept per (learner, examKey) — its `status`
// toggles between "in_progress" and "completed" and `state` is overwritten
// on every retake. This is required by the unique index on (learnerId,
// examKey, status): since the exam is retakeable, a second completion would
// otherwise try to insert a second row with status "completed" for the same
// learner+examKey and violate that same index. Keeping a single row that
// toggles status satisfies the index trivially (there is only ever one row)
// while the index itself still guards against a genuine concurrency bug (two
// requests racing to insert two simultaneous "in_progress" rows).
//
// BLOCKING BUG FIX (2026-07-08, owner QA on localhost): the create path
// (`existing` is null — a learner's very first-ever attempt) used to be a
// plain SELECT-then-INSERT, which is a read-then-write race: Next dev renders
// a server component more than once per request (streaming/prefetch), so two
// concurrent invocations of this function can both see "no row" and both
// attempt the INSERT — the second one violates
// `thai_exam_sessions_learner_key_status_uq` and 500s. Fixed by making that
// INSERT idempotent (`onConflictDoNothing` on the exact same unique-index
// columns, so the LOSER's insert is a silent no-op instead of a thrown
// duplicate-key error) and then re-SELECTing the row afterward — both the
// winner and the loser of the race end up reading and returning the SAME
// persisted row, rather than the loser crashing or returning a `state` object
// it never actually managed to save. neon-http has no interactive
// transactions, so `ON CONFLICT ... DO NOTHING` (not a transaction) is the
// correct primitive here, same rationale as every other atomic upsert in this
// codebase (see submitThaiAttempt's own header in lib/thai/actions.ts).
export async function startOrResumeExam(
  examKey: string,
  summaries?: UnitSummary[],
): Promise<StartOrResumeResult> {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");
  assertKnownExam(examKey);

  const open = await isConsonantExamOpen(learnerId, session.user?.email, summaries);
  if (!open) throw new Error("Exam not open");

  const [existing] = await db
    .select()
    .from(thaiExamSessions)
    .where(and(eq(thaiExamSessions.learnerId, learnerId), eq(thaiExamSessions.examKey, examKey)));

  // decideStartAction (lib/thai/exam-pure.ts) is the single, unit-tested
  // source of truth for this routing — see its own header for why it's a
  // pure function of `existing`'s status alone (deterministic even when two
  // concurrent requests both observe `existing === undefined`, which is
  // exactly the race the create-path fix below handles).
  const action = decideStartAction(existing ? (existing.status as "in_progress" | "completed") : null);

  if (action === "resume") {
    return buildStartResult(learnerId, existing!.state as ExamState);
  }

  // Either a retake (existing row is "completed") or a true first-ever
  // attempt (no row at all) — both need a freshly-shuffled deck.
  const pool = await fetchExamConsonants();
  const seed = newShuffleSeed();
  const queue = interleaveDeck(
    pool.map((c) => ({ id: c.id, audioUrl: c.audioUrl })),
    seed,
  );
  const freshState = initialExamState(seed, queue);
  const now = new Date();

  if (action === "retake") {
    // Retake: UPDATE the existing (completed) row back to in_progress.
    // CRITICAL fix (2026-07-07 code review): do NOT null `completedAt` here.
    // A retake resets `status`/`state`/`startedAt` (a fresh deck, live
    // progress starting over), but `completedAt` is the STICKY "has this
    // exam ever been fully cleared" signal that lib/thai/queries.ts's unit-6
    // gate depends on (via lib/thai/exam-pure.ts::unitSixUnlocked) — nulling
    // it here would re-lock unit 6 the instant a retake starts, exactly the
    // regression the review caught. Omitting the field entirely leaves
    // whatever sticky value is already there (the first-ever-clear
    // timestamp) untouched.
    //
    // Known, milder, un-fixed race (2026-07-08, noted per coordinator):
    // this UPDATE is keyed only by the row's own `id` with no version/
    // timestamp guard, so two concurrent retake requests both update the
    // SAME row — last-writer-wins on the fresh seed/deck, but (unlike the
    // create path above) this can never throw a unique-constraint error,
    // since it's an UPDATE-by-primary-id, not an INSERT. Left as-is,
    // consistent with how submitExamAnswer's own read-then-write gap is
    // documented rather than fixed.
    await db
      .update(thaiExamSessions)
      .set({ state: freshState, status: "in_progress", startedAt: now, updatedAt: now })
      .where(eq(thaiExamSessions.id, existing!.id));
    return buildStartResult(learnerId, freshState);
  }

  // True first-time create — see this function's own header for the race
  // this closes. `onConflictDoNothing` makes a concurrent loser's insert a
  // no-op instead of violating the unique index; the re-SELECT below then
  // returns whichever row actually persisted (the winner's), so every
  // concurrent caller for a never-before-seen learner converges on one
  // consistent, authoritative state.
  await db
    .insert(thaiExamSessions)
    .values({
      learnerId,
      examKey,
      status: "in_progress",
      state: freshState,
      startedAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [thaiExamSessions.learnerId, thaiExamSessions.examKey, thaiExamSessions.status],
    });

  const [persisted] = await db
    .select()
    .from(thaiExamSessions)
    .where(
      and(
        eq(thaiExamSessions.learnerId, learnerId),
        eq(thaiExamSessions.examKey, examKey),
        eq(thaiExamSessions.status, "in_progress"),
      ),
    );
  if (!persisted) {
    // Structurally should not happen (either our own insert or a concurrent
    // winner's insert must have landed for this exact (learner, examKey,
    // "in_progress") triple) — defensive, not a case any known race path
    // reaches.
    throw new Error("Failed to create or find exam session");
  }
  return buildStartResult(learnerId, persisted.state as ExamState);
}

// HIGH fix (2026-07-07 code review): exam-scoped `drill_type` bookkeeping
// keys for the three MCQ modes' `thai_progress`/`thai_attempts` rows. The
// exam still WRITES real progress/attempt rows for those modes (owner-
// approved — "reinforces mastery... writes thai_progress + thai_attempts",
// so history/stats/streaks keep working), but must never write them under
// the REAL DrillType strings ("letter-sound" etc.): those exact strings are
// what lib/thai/reachability.ts::isRequiredTypeMastered's letter-sound ->
// letter-read GRANDFATHER recognizes (added to avoid re-locking learners who
// mastered under the pre-Stage-1 MCQ regime). A fresh "letter-sound" mastery
// row written here would silently satisfy that grandfather and move a unit
// 2-5's displayed percentMastered via MCQ answers alone — contradicting the
// plan's explicit "only flashcard-mode moves a unit %" invariant (confirmed
// reachable, not just theoretical — see the review's HIGH finding). Prefixing
// with "exam-" guarantees no unit's `reachableDrillTypesForUnit` nor the
// grandfather ever recognizes these keys, while `expectedAnswerFor`/
// correctness itself is still derived from the REAL DrillType (`mode`) below
// — only the STORED bookkeeping key changes. Verified this doesn't break
// /thai/stats: lib/thai/stats.ts's accuracyByUnit/failureHeatmap/drillActivity
// all group by item id/unit, not by drill_type, and the tone-confusion matrix
// filters on the literal `"audio-tone"` string (never matched by these three
// exam-scoped keys) — no fixed drill_type label map exists anywhere to break.
const EXAM_SCOPED_DRILL_TYPE: Record<
  "letter-sound" | "letter-final" | "letter-class" | "audio-letter",
  string
> = {
  "letter-sound": "exam-letter-sound",
  "letter-final": "exam-letter-final",
  "letter-class": "exam-letter-class",
  "audio-letter": "exam-audio-letter",
};

// Reinforcement for the three MCQ modes — the SAME atomic thai_progress
// upsert + thai_attempts insert submitThaiAttempt uses, WITHOUT
// submitThaiAttempt's own unitOfferingDrillType gate check.
//
// Spec deviation (owner-approved): the plan's Stage 2 section describes
// reinforcement as flowing "through the existing scoring actions"
// (submitThaiAttempt / submitFlashcardGrade). Calling submitThaiAttempt
// directly for the MCQ modes doesn't work here: it re-derives "which unit's
// session offers this (item, drillType) pair" via unitOfferingDrillType and
// rejects the call unless that unit is unlocked — but letter-sound/
// letter-class/audio-letter are no longer offered by ANY unit's own session
// (they were deliberately removed from every unit's reachable set in Stage
// 1/M13, see lib/thai/reachability.ts's header) precisely because the exam
// now owns them outside the unit mastery denominators. The exam route IS the
// offering context and its own open-gate (isConsonantExamOpen) already
// re-checks unit 5's mastery server-side, so this local write reproduces
// submitThaiAttempt's exact SQL without the now-inapplicable gate, rather
// than skip reinforcement entirely.
//
// `drillType` here is the EXAM-SCOPED bookkeeping key (EXAM_SCOPED_DRILL_TYPE
// values, e.g. "exam-letter-sound"), NOT the real DrillType — see that
// constant's own doc comment for why.
async function reinforceExamMcqAnswer(
  learnerId: string,
  itemId: string,
  drillType: string,
  expected: string,
  chosen: string,
  correct: boolean,
): Promise<void> {
  await db.execute(sql`
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
  `);

  await db.insert(thaiAttempts).values({
    learnerId,
    itemId,
    drillType,
    expected,
    chosen,
    correct,
    timestamp: new Date(),
  });
}

export interface SubmitExamAnswerResult {
  correct: boolean;
  clearedCount: number;
  total: number;
  done: boolean;
  nextCard: HydratedExamCard | null;
  // Included on every answer (not just at `done`) so the client can render a
  // live "first-try / slips" readout without re-deriving this itself — the
  // plan's own §5 summary screen needs these numbers, and the engine has
  // already computed them as part of `newState`.
  firstTry: ExamState["firstTry"];
  slips: number;
}

export async function submitExamAnswer(
  examKey: string,
  itemId: string,
  mode: ExamMode,
  answer: string,
): Promise<SubmitExamAnswerResult> {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");
  assertKnownExam(examKey);

  if (!itemId || !EXAM_MODES.includes(mode) || answer === undefined) {
    throw new Error("Invalid attempt payload");
  }

  const [row] = await db
    .select()
    .from(thaiExamSessions)
    .where(
      and(
        eq(thaiExamSessions.learnerId, learnerId),
        eq(thaiExamSessions.examKey, examKey),
        eq(thaiExamSessions.status, "in_progress"),
      ),
    );
  if (!row) throw new Error("No active exam session");

  const state = row.state as ExamState;
  const head = state.queue[0];
  // Never trust the client on deck position — the answered card must be the
  // session's own current head (same defense-in-depth shape as
  // submitThaiAttempt's server-side unlock re-check).
  if (!head || head.itemId !== itemId || head.mode !== mode) {
    throw new Error("Answer does not match the current exam card");
  }

  const [item] = await db.select().from(thaiItems).where(eq(thaiItems.id, itemId));
  if (!item) throw new Error("Unknown item");

  let correct: boolean;
  if (mode === "flashcard") {
    // Self-graded, same trust model as submitFlashcardGrade itself: the
    // learner reports whether they knew it.
    const knewIt = answer === "known";
    correct = knewIt;
    await submitFlashcardGrade(itemId, knewIt);
  } else if (mode === "letter-final") {
    // CORRECTION 1 (owner QA round): letter-final is NOT routed through
    // expectedAnswerFor — its real-DrillType case returns a bare `null` for
    // the 6 finalless consonants (a valid, expected card here, not an error —
    // see expectedFinalAnswer's own doc comment). Correctness is derived from
    // the REAL finalIpa via expectedFinalAnswer; only the STORED bookkeeping
    // key is exam-scoped.
    const expected = expectedFinalAnswer(item.finalIpa);
    correct = expected === answer;
    await reinforceExamMcqAnswer(
      learnerId,
      itemId,
      EXAM_SCOPED_DRILL_TYPE["letter-final"],
      expected,
      answer,
      correct,
    );
  } else {
    // `mode` here is narrowed to the real DrillType by the `!== "flashcard"`/
    // `!== "letter-final"` branches — correctness is derived from the REAL
    // DrillType (expectedAnswerFor is the single source of truth), but the
    // row PERSISTED to thai_progress/thai_attempts uses the exam-scoped
    // bookkeeping key (EXAM_SCOPED_DRILL_TYPE) so it can never satisfy the
    // letter-sound->letter-read grandfather.
    const expected = expectedAnswerFor(item, mode);
    if (expected === null) throw new Error("Drill type does not apply to this item");
    correct = expected === answer;
    await reinforceExamMcqAnswer(learnerId, itemId, EXAM_SCOPED_DRILL_TYPE[mode], expected, answer, correct);
  }

  const newState = pureApplyAnswer(state, head, correct);
  const done = newState.queue.length === 0;
  const now = new Date();

  // CRITICAL fix (2026-07-07 code review): never null `completedAt`. On the
  // done branch, set it to the row's EXISTING value if already set (a
  // retake clearing again must not disturb the original first-clear
  // timestamp) else `now` (the first-ever clear); on the non-done branch,
  // omit the field entirely so a prior sticky value is left untouched. This
  // is what lib/thai/queries.ts's unit-6 gate (unitSixUnlocked) depends on —
  // nulling/resetting this on every non-final answer was the exact
  // regression that re-locked unit 6 mid-retake.
  await db
    .update(thaiExamSessions)
    .set({
      state: newState,
      status: done ? "completed" : "in_progress",
      updatedAt: now,
      ...(done ? { completedAt: row.completedAt ?? now } : {}),
    })
    .where(eq(thaiExamSessions.id, row.id));

  const nextCard = done ? null : await hydrateHead(learnerId, newState);

  return {
    correct,
    clearedCount: newState.clearedCount,
    total: newState.total,
    done,
    nextCard,
    firstTry: newState.firstTry,
    slips: newState.slips,
  };
}

export interface ConsonantExamState {
  open: boolean;
  // Sticky/permanent: true once the learner has EVER fully cleared the exam
  // (derived from `completedAt`, which is only ever set once and never
  // un-set — see startOrResumeExam/submitExamAnswer). NOT the same as
  // `status` below — a retake resets `status` to "in_progress" while
  // `cleared` stays permanently true.
  cleared: boolean;
  // Live: the row's own current status, or "not_started" if no row exists
  // yet. This is what the checkpoint row's own Continue/Review/count display
  // must be driven by (2026-07-07 code review fix) — using the sticky
  // `cleared` flag there would show "Cleared"/100%/"Review" for a learner who
  // is mid-retake with a freshly-reset live queue.
  status: "not_started" | "in_progress" | "completed";
  clearedCount: number;
  total: number;
}

// Read-only snapshot for the home checkpoint row + the exam page's own gate.
// `learnerId` is caller-supplied (both callers already have it from their own
// `auth()` call) but the open-gate itself is re-derived from THIS call's own
// session email, never trusted from the caller. Accepts an optional
// pre-fetched `summaries` (MEDIUM fix, 2026-07-07 review) so callers that
// already fetched getUnitSummaries don't force a redundant recomputation.
export async function getConsonantExamState(
  learnerId: string,
  summaries?: UnitSummary[],
): Promise<ConsonantExamState> {
  const session = await auth();
  const open = await isConsonantExamOpen(learnerId, session?.user?.email, summaries);

  const [row] = await db
    .select()
    .from(thaiExamSessions)
    .where(
      and(eq(thaiExamSessions.learnerId, learnerId), eq(thaiExamSessions.examKey, CONSONANTS_EXAM_KEY)),
    );
  if (!row) return { open, cleared: false, status: "not_started", clearedCount: 0, total: 0 };

  const state = row.state as ExamState;
  // Sticky (permanent), NOT `row.status === "completed"` — see the interface
  // doc comment above for why the two are deliberately different signals.
  const cleared = row.completedAt != null;
  return {
    open,
    cleared,
    // Live status — when it's actually "completed", state.clearedCount
    // already equals state.total by construction (the queue only empties on
    // the answer that sets status to "completed"), so this is always the
    // CURRENT attempt's real progress, never forced to 100% by the sticky
    // `cleared` flag during a live retake.
    status: row.status as "in_progress" | "completed",
    clearedCount: state.clearedCount,
    total: state.total,
  };
}
