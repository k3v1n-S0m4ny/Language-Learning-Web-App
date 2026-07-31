import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_STATE,
  LADDERS,
  type LadderKey,
  type LadderState,
  PASSES_TO_PROMOTE,
  applyAnswer,
  exposuresToGraduate,
  formatForStep,
  isAtTopStep,
  topStep,
} from "./ladder";
import { MAX_RUNG } from "./intervals";

// Walk a card through a sequence of answers, returning every transition so a
// test can assert on the shape of the whole climb rather than one step of it.
function walk(key: LadderKey, answers: boolean[], from: LadderState = INITIAL_STATE) {
  let state = from;
  return answers.map((passed) => {
    const transition = applyAnswer(key, state, passed);
    state = transition.state;
    return transition;
  });
}

// === ladder definitions =====================================================

test("the two courses are deliberately asymmetric", () => {
  assert.deepEqual(LADDERS.mandarin, ["recognise-mc", "recognise-card", "produce-card"]);
  assert.deepEqual(LADDERS["advanced-thai:vocab"], [
    "recognise-mc",
    "recognise-card",
    "produce-mc",
    "produce-card",
  ]);
  assert.deepEqual(LADDERS["advanced-thai:phrase"], ["recognise-card"]);
});

test("phrase cards are never asked in production", () => {
  for (const format of LADDERS["advanced-thai:phrase"]) {
    assert.ok(!format.startsWith("produce"));
  }
});

test("formatForStep clamps rather than returning undefined", () => {
  assert.equal(formatForStep("mandarin", 1), "recognise-mc");
  assert.equal(formatForStep("mandarin", 3), "produce-card");
  assert.equal(formatForStep("mandarin", 99), "produce-card");
  assert.equal(formatForStep("mandarin", 0), "recognise-mc");
});

// === promotion ==============================================================

test("one pass promotes", () => {
  const [first, second] = walk("mandarin", [true, true]);
  assert.equal(first.state.step, 2);
  assert.equal(second.state.step, 3);
});

test("a failure between passes gives back exactly the step it bought", () => {
  // pass, fail, pass -> step 1 -> 2 -> 1 -> 2. A miss costs one step, no more.
  const [first, second, third] = walk("mandarin", [true, false, true]);
  assert.equal(first.state.step, 2);
  assert.equal(second.state.step, 1);
  assert.equal(third.state.step, 2);
});

test("passStreak is vestigial while one pass promotes", () => {
  // It can never reach 1: the pass that would set it promotes instead, and a
  // failure zeroes it. Asserted so a future streak rule has to come back here.
  assert.equal(PASSES_TO_PROMOTE, 1);
  for (const transition of walk("advanced-thai:vocab", [true, true, false, true])) {
    assert.equal(transition.state.passStreak, 0);
  }
});

test("a lucky multiple-choice guess is caught by the next step, not by a streak", () => {
  // The anti-guessing guarantee PASSES_TO_PROMOTE = 2 used to give. Guessing
  // step 1 promotes to step 2 — which is recognise-card, self-graded, no options
  // to guess from — and missing it there returns the card to step 1.
  const [guessed] = walk("advanced-thai:vocab", [true]);
  assert.equal(formatForStep("advanced-thai:vocab", guessed.state.step), "recognise-card");

  const [, missed] = walk("advanced-thai:vocab", [true, false]);
  assert.equal(missed.state.step, 1);
  assert.equal(missed.state.demotions, 1);
});

// === the top step ===========================================================

test("the top step needs only one pass, and it buys a rung", () => {
  const state: LadderState = { step: 3, passStreak: 0, intervalRung: 0, demotions: 0 };
  const { finished, intervalDays, state: next } = applyAnswer("mandarin", state, true);

  assert.equal(finished, true);
  assert.equal(intervalDays, 1);
  assert.equal(next.step, 3);
  assert.equal(next.intervalRung, 1);
});

test("a card leaves at the rung it arrived holding, not the one it earned", () => {
  // Arriving at rung 2 schedules 9 days and carries rung 3 forward — it must not
  // skip straight to 27 days on the strength of this pass.
  const state: LadderState = { step: 3, passStreak: 0, intervalRung: 2, demotions: 0 };
  const { intervalDays, state: next } = applyAnswer("mandarin", state, true);

  assert.equal(intervalDays, 9);
  assert.equal(next.intervalRung, 3);
});

test("consecutive top-step passes walk the whole 3x tail", () => {
  let state: LadderState = { step: 3, passStreak: 0, intervalRung: 0, demotions: 0 };
  const scheduled: number[] = [];

  for (let i = 0; i < 8; i++) {
    const transition = applyAnswer("mandarin", state, true);
    scheduled.push(transition.intervalDays!);
    state = transition.state;
  }

  assert.deepEqual(scheduled, [1, 3, 9, 27, 81, 243, 729, 729]);
  assert.equal(state.intervalRung, MAX_RUNG);
});

test("a one-step ladder finishes on its first pass", () => {
  const { finished, intervalDays } = applyAnswer("advanced-thai:phrase", INITIAL_STATE, true);
  assert.equal(finished, true);
  assert.equal(intervalDays, 1);
});

// === failure ================================================================

test("failure demotes exactly one step and resets the rung", () => {
  const state: LadderState = { step: 3, passStreak: 0, intervalRung: 4, demotions: 1 };
  const { finished, state: next } = applyAnswer("mandarin", state, false);

  assert.equal(finished, false);
  assert.equal(next.step, 2);
  assert.equal(next.intervalRung, 0);
  assert.equal(next.demotions, 2);
});

test("failure never drops below step 1", () => {
  const { state } = applyAnswer("mandarin", INITIAL_STATE, false);
  assert.equal(state.step, 1);
  assert.equal(state.demotions, 1);
});

test("failing a one-step ladder holds the card and resets its interval", () => {
  const state: LadderState = { step: 1, passStreak: 0, intervalRung: 5, demotions: 0 };
  const { finished, state: next } = applyAnswer("advanced-thai:phrase", state, false);

  assert.equal(finished, false);
  assert.equal(next.step, 1);
  assert.equal(next.intervalRung, 0);
});

test("a failed card never gets a due date", () => {
  const state: LadderState = { step: 3, passStreak: 0, intervalRung: 4, demotions: 0 };
  assert.equal(applyAnswer("mandarin", state, false).intervalDays, null);
});

// === graduation costs =======================================================

test("a new card graduates in the documented number of exposures", () => {
  assert.equal(exposuresToGraduate("mandarin"), 3);
  assert.equal(exposuresToGraduate("advanced-thai:vocab"), 4);
  assert.equal(exposuresToGraduate("advanced-thai:phrase"), 1);
});

test("an all-pass climb finishes exactly once, on the last exposure", () => {
  for (const key of Object.keys(LADDERS) as LadderKey[]) {
    const n = exposuresToGraduate(key);
    const transitions = walk(key, Array(n).fill(true));

    const finishes = transitions.filter((t) => t.finished);
    assert.equal(finishes.length, 1, `${key} should finish once`);
    assert.equal(transitions[n - 1].finished, true, `${key} should finish last`);
    assert.equal(finishes[0].intervalDays, 1, `${key} should leave at one day`);
    assert.ok(isAtTopStep(key, transitions[n - 1].state));
  }
});

test("a climb never finishes early, however long it runs", () => {
  // Guards the round-termination contract: only a top-step pass ends a card's
  // round, so nothing below the top may ever report finished.
  for (const key of Object.keys(LADDERS) as LadderKey[]) {
    let state = INITIAL_STATE;
    for (let i = 0; i < exposuresToGraduate(key) - 1; i++) {
      const transition = applyAnswer(key, state, true);
      assert.equal(transition.finished, false);
      assert.ok(state.step <= topStep(key));
      state = transition.state;
    }
  }
});

// === termination ============================================================

test("a round terminates as long as passes eventually happen", () => {
  // There is no demotion cap by design, so the only termination guarantee is
  // that a bounded run of passes always reaches the top. Worst case: a card sits
  // at step 1 after any number of failures, then needs exposuresToGraduate more.
  let state: LadderState = INITIAL_STATE;
  for (let i = 0; i < 50; i++) state = applyAnswer("advanced-thai:vocab", state, false).state;

  assert.equal(state.step, 1);
  assert.equal(state.demotions, 50);

  const n = exposuresToGraduate("advanced-thai:vocab");
  const transitions = walk("advanced-thai:vocab", Array(n).fill(true), state);
  assert.equal(transitions[n - 1].finished, true);
});
