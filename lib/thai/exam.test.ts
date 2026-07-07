import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyAnswer,
  decideStartAction,
  expectedFinalAnswer,
  initialExamState,
  interleaveDeck,
  isExamClearedSticky,
  NO_FINAL,
  requeue,
  unitSixUnlocked,
  type ExamCard,
} from "./exam-pure";

// 42 synthetic consonants, mirroring the real content shape (units 2-5, 42
// drillable letters) — 30 with audio, 12 without, so both the "all audio"
// and "partial audio" deck-size cases can be exercised from one fixture.
function makeConsonants(count: number, audioCount: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `consonant:${i}`,
    audioUrl: i < audioCount ? `https://example.com/${i}.mp3` : null,
  }));
}

test("interleaveDeck: full deck size is 210 when every consonant has audio (42 x 5 modes)", () => {
  const deck = interleaveDeck(makeConsonants(42, 42), 1);
  assert.equal(deck.length, 210);
});

test("interleaveDeck: deck size is 42x4 + audioCount when some consonants lack audio", () => {
  const deck = interleaveDeck(makeConsonants(42, 30), 1);
  assert.equal(deck.length, 42 * 4 + 30);
});

// Owner QA round (CORRECTION 1): letter-final is unconditional for EVERY
// consonant — including a "finalless" one (interleaveDeck itself has no
// notion of finalness; that's resolved later at hydration time via
// expectedFinalAnswer/item.finalIpa — this only proves letter-final is
// emitted the same way flashcard/letter-sound/letter-class are, unlike
// audio-letter which is conditional on audioUrl).
test("interleaveDeck: emits a letter-final card for every consonant, unconditionally (like flashcard/letter-sound/letter-class)", () => {
  const finalless = [{ id: "consonant:finalless-example", audioUrl: null }];
  const deck = interleaveDeck(finalless, 1);
  const modes = deck.map((c) => c.mode).sort();
  assert.deepEqual(modes, ["flashcard", "letter-class", "letter-final", "letter-sound"]);
});

test("interleaveDeck: never places two cards for the same consonant back-to-back", () => {
  const deck = interleaveDeck(makeConsonants(42, 42), 12345);
  for (let i = 1; i < deck.length; i++) {
    assert.notEqual(deck[i].itemId, deck[i - 1].itemId, `adjacent same-item cards at index ${i}`);
  }
});

test("interleaveDeck: deterministic for a fixed seed", () => {
  const consonants = makeConsonants(42, 35);
  const deckA = interleaveDeck(consonants, 777);
  const deckB = interleaveDeck(consonants, 777);
  assert.deepEqual(deckA, deckB);
});

test("interleaveDeck: a different seed can produce a different order", () => {
  const consonants = makeConsonants(42, 35);
  const deckA = interleaveDeck(consonants, 1);
  const deckB = interleaveDeck(consonants, 2);
  assert.notDeepEqual(deckA, deckB);
});

test("requeue: reinserts 10 positions ahead when at least 10 cards remain", () => {
  const remaining: ExamCard[] = Array.from({ length: 20 }, (_, i) => ({
    itemId: `consonant:${i}`,
    mode: "letter-sound",
  }));
  const card: ExamCard = { itemId: "consonant:missed", mode: "letter-sound" };
  const result = requeue(remaining, card);
  assert.equal(result.length, 21);
  assert.equal(result[10], card);
});

test("requeue: falls back to the end when fewer than 10 cards remain (letter-final mode)", () => {
  const remaining: ExamCard[] = Array.from({ length: 4 }, (_, i) => ({
    itemId: `consonant:${i}`,
    mode: "letter-final",
  }));
  const card: ExamCard = { itemId: "consonant:missed", mode: "letter-final" };
  const result = requeue(remaining, card);
  assert.equal(result.length, 5);
  assert.equal(result[result.length - 1], card);
});

test("requeue: exactly 10 remaining inserts at index 10, which IS the end (boundary)", () => {
  const remaining: ExamCard[] = Array.from({ length: 10 }, (_, i) => ({
    itemId: `consonant:${i}`,
    mode: "letter-sound",
  }));
  const card: ExamCard = { itemId: "consonant:missed", mode: "letter-sound" };
  const result = requeue(remaining, card);
  assert.equal(result.length, 11);
  assert.equal(result[result.length - 1], card);
});

test("applyAnswer: a card answered correctly on first sight counts as first-try correct and clears", () => {
  const queue: ExamCard[] = [
    { itemId: "consonant:a", mode: "flashcard" },
    { itemId: "consonant:b", mode: "letter-sound" },
  ];
  let state = initialExamState(1, queue);
  state = applyAnswer(state, queue[0], true);

  assert.equal(state.clearedCount, 1);
  assert.equal(state.slips, 0);
  assert.equal(state.firstTry.overall.seen, 1);
  assert.equal(state.firstTry.overall.correct, 1);
  assert.equal(state.firstTry.perMode.flashcard.seen, 1);
  assert.equal(state.firstTry.perMode.flashcard.correct, 1);
  assert.deepEqual(
    state.queue.map((c) => c.itemId),
    ["consonant:b"],
  );
});

test("applyAnswer: a requeued card cleared later does NOT count as first-try-correct twice", () => {
  const queue: ExamCard[] = [
    { itemId: "consonant:a", mode: "letter-class" },
    { itemId: "consonant:b", mode: "letter-class" },
    { itemId: "consonant:c", mode: "letter-class" },
  ];
  let state = initialExamState(1, queue);

  // First sight: missed -> requeued (falls back to end, since <10 remain),
  // first-try recorded as INCORRECT.
  state = applyAnswer(state, queue[0], false);
  assert.equal(state.slips, 1);
  assert.equal(state.clearedCount, 0);
  assert.equal(state.firstTry.overall.seen, 1);
  assert.equal(state.firstTry.overall.correct, 0);
  assert.deepEqual(
    state.queue.map((c) => c.itemId),
    ["consonant:b", "consonant:c", "consonant:a"],
  );

  // Cycle through the other two cards (first sight, both correct).
  state = applyAnswer(state, state.queue[0], true); // consonant:b
  state = applyAnswer(state, state.queue[0], true); // consonant:c

  // Now consonant:a comes back around and clears — must NOT bump first-try
  // stats a second time (it was already recorded, incorrectly, on the miss).
  assert.deepEqual(
    state.queue.map((c) => c.itemId),
    ["consonant:a"],
  );
  state = applyAnswer(state, state.queue[0], true);

  assert.equal(state.clearedCount, 3);
  assert.equal(state.queue.length, 0);
  assert.equal(state.firstTry.overall.seen, 3);
  // Only b and c's first-try correct count; a's first-try was already
  // recorded as incorrect and is never re-counted.
  assert.equal(state.firstTry.overall.correct, 2);
});

test("applyAnswer: tracks first-try stats for the letter-final mode too", () => {
  const queue: ExamCard[] = [
    { itemId: "consonant:a", mode: "letter-final" },
    { itemId: "consonant:b", mode: "letter-final" },
  ];
  let state = initialExamState(1, queue);
  state = applyAnswer(state, queue[0], true);

  assert.equal(state.firstTry.perMode["letter-final"].seen, 1);
  assert.equal(state.firstTry.perMode["letter-final"].correct, 1);
  // Every other mode's bucket stays untouched.
  assert.equal(state.firstTry.perMode.flashcard.seen, 0);
  assert.equal(state.firstTry.perMode["letter-sound"].seen, 0);
  assert.equal(state.firstTry.perMode["letter-class"].seen, 0);
  assert.equal(state.firstTry.perMode["audio-letter"].seen, 0);
});

test("clear-the-deck: terminates only once every card has been answered correctly at least once", () => {
  const queue: ExamCard[] = [
    { itemId: "consonant:a", mode: "flashcard" },
    { itemId: "consonant:b", mode: "flashcard" },
    { itemId: "consonant:c", mode: "flashcard" },
  ];
  let state = initialExamState(1, queue);

  // Miss every card once — the deck must not be done, and every original
  // card must still be present somewhere in the queue.
  state = applyAnswer(state, state.queue[0], false);
  state = applyAnswer(state, state.queue[0], false);
  state = applyAnswer(state, state.queue[0], false);
  assert.equal(state.queue.length, 3);
  assert.deepEqual(new Set(state.queue.map((c) => c.itemId)), new Set(["consonant:a", "consonant:b", "consonant:c"]));

  // Clear every remaining card correctly.
  while (state.queue.length > 0) {
    state = applyAnswer(state, state.queue[0], true);
  }

  assert.equal(state.queue.length, 0);
  assert.equal(state.clearedCount, 3);
});

// HIGH fix (2026-07-07 code review): the gate test the plan's own Stage-2
// verification section required ("unit 6 `unlocked` is false with unit 5
// mastered but exam not cleared, true once cleared") — and, critically, the
// PERMANENCE assertion that would have caught the CRITICAL retake-relock
// regression this same review found. `unitSixUnlocked` is DB-free (lives in
// lib/thai/exam-pure.ts) specifically so this can run under `npm test`
// without a database.

test("isExamClearedSticky: false when completedAt has never been set", () => {
  assert.equal(isExamClearedSticky(null), false);
  assert.equal(isExamClearedSticky(undefined), false);
});

test("isExamClearedSticky: true once completedAt is set (Date or raw driver string form)", () => {
  assert.equal(isExamClearedSticky(new Date()), true);
  assert.equal(isExamClearedSticky("2026-01-01T00:00:00.000Z"), true);
});

test("unitSixUnlocked: locked when unit 5 is >=90% mastered but the exam has never been cleared", () => {
  assert.equal(unitSixUnlocked(true, 95, null), false);
  assert.equal(unitSixUnlocked(true, 100, undefined), false);
});

test("unitSixUnlocked: locked when the exam is cleared but unit 5 itself isn't (mastery or unlocked flag)", () => {
  const clearedAt = new Date("2026-01-01T00:00:00Z");
  assert.equal(unitSixUnlocked(true, 80, clearedAt), false); // unit 5 < 90%
  assert.equal(unitSixUnlocked(false, 95, clearedAt), false); // unit 5 itself not unlocked
});

test("unitSixUnlocked: unlocked once unit 5 is >=90% AND the exam's completedAt is set", () => {
  const clearedAt = new Date("2026-01-01T00:00:00Z");
  assert.equal(unitSixUnlocked(true, 90, clearedAt), true);
});

test("unitSixUnlocked PERMANENCE: stays unlocked across a retake — completedAt is sticky, never re-derived from live status", () => {
  const firstClearedAt = new Date("2026-01-01T00:00:00Z");
  // First clear: unit 6 unlocks.
  assert.equal(unitSixUnlocked(true, 90, firstClearedAt), true);
  // A retake starts: per lib/thai/exam-actions.ts::startOrResumeExam, the
  // session row's own `status` resets to "in_progress" and its live
  // `clearedCount` resets to 0 — but `completedAt` is deliberately left
  // untouched (never nulled). unitSixUnlocked takes no `status`/`clearedCount`
  // argument at all, so re-evaluating it with the SAME (unchanged)
  // `completedAt` — the only thing a retake never resets — must still return
  // true. This is the direct regression test for the CRITICAL bug: the old
  // code derived "cleared" from live `status`, which WOULD have flipped this
  // false the instant a retake began.
  assert.equal(unitSixUnlocked(true, 90, firstClearedAt), true);
});

// Owner QA round (CORRECTION 1): expectedFinalAnswer is the letter-final
// mode's own answer-derivation, deliberately NOT routed through
// lib/thai/drill.ts's expectedAnswerFor (whose "letter-final" case would
// return a bare `null` for a finalless consonant — a real error case there,
// but a valid, expected card here).
test("expectedFinalAnswer: maps a null finalIpa (finalless consonant) to the NO_FINAL sentinel", () => {
  assert.equal(expectedFinalAnswer(null), NO_FINAL);
});

test("expectedFinalAnswer: passes a real final sound straight through", () => {
  assert.equal(expectedFinalAnswer("k"), "k");
});

// Blocking bug fix (2026-07-08, owner QA on localhost): startOrResumeExam's
// create path used to be a plain SELECT-then-INSERT — a read-then-write race
// where two concurrent invocations (Next dev renders a server component more
// than once per request) both see "no row" and both attempt the INSERT,
// violating thai_exam_sessions_learner_key_status_uq on the second one.
// decideStartAction is the pure routing logic that fix depends on: it proves
// that TWO SEPARATE calls with the exact same "no row yet" observation
// (existingStatus === null, exactly what two racing requests for a
// never-before-seen learner would both see) deterministically agree on the
// SAME branch ("create") — which is exactly why that branch's actual INSERT
// then has to be idempotent (onConflictDoNothing + re-SELECT, in
// lib/thai/exam-actions.ts) rather than assumed to be the only writer. This
// does not exercise the database-level unique-constraint race itself (that
// needs a real Postgres, not a DB-free test — see this file's own header
// comment for why DB-touching behavior isn't unit tested here), but it does
// lock in the deterministic-routing precondition the fix relies on.
test("decideStartAction: routes to 'resume' when an in_progress row already exists", () => {
  assert.equal(decideStartAction("in_progress"), "resume");
});

test("decideStartAction: routes to 'retake' when a completed row already exists", () => {
  assert.equal(decideStartAction("completed"), "retake");
});

test("decideStartAction: routes to 'create' when no row exists yet", () => {
  assert.equal(decideStartAction(null), "create");
});

test("decideStartAction: two concurrent 'no row yet' observations deterministically agree (idempotent routing)", () => {
  // Simulates two racing requests for a never-before-seen learner, both
  // reading `existingStatus === null` before either one's INSERT has landed.
  const first = decideStartAction(null);
  const second = decideStartAction(null);
  assert.equal(first, "create");
  assert.equal(second, "create");
  assert.equal(first, second);
});
