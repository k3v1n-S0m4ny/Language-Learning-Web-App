import { test } from "node:test";
import assert from "node:assert/strict";
import { MC_OPTION_COUNT, buildOptions, isCorrectChoice, normalizeOption } from "./distractors";

const POOL = ["banana", "cherry", "durian", "elderberry", "fig"];

// buildOptions shuffles, so every assertion here is over the SET, never the
// order — and the ones that matter are run repeatedly, because a bug that only
// shows on some shuffles is the kind this builder can actually have.
function repeat(times: number, fn: () => void) {
  for (let i = 0; i < times; i++) fn();
}

test("returns four options", () => {
  repeat(50, () => assert.equal(buildOptions("apple", POOL).length, MC_OPTION_COUNT));
});

test("always includes the correct answer, verbatim", () => {
  repeat(50, () => assert.ok(buildOptions("apple", POOL).includes("apple")));
});

test("never repeats an option", () => {
  repeat(50, () => {
    const options = buildOptions("apple", POOL);
    assert.equal(new Set(options).size, options.length);
  });
});

test("draws its distractors from the pool", () => {
  repeat(50, () => {
    for (const option of buildOptions("apple", POOL)) {
      if (option !== "apple") assert.ok(POOL.includes(option));
    }
  });
});

test("the correct answer does not sit in a fixed position", () => {
  // The security property: position must carry no information. Over 200 builds
  // of a 4-option question the answer has to land somewhere other than first.
  const positions = new Set<number>();
  repeat(200, () => positions.add(buildOptions("apple", POOL).indexOf("apple")));
  assert.ok(positions.size > 1, "answer landed in the same slot every time");
});

// === the duplicate-answer trap ==============================================

test("a pool entry equal to the answer is not offered as a distractor", () => {
  // Two cards in one theme can legitimately share a gloss. Offering it twice
  // would make the question unanswerable and grade a right answer wrong, since
  // the server compares by text.
  repeat(50, () => {
    const options = buildOptions("apple", ["apple", ...POOL]);
    assert.equal(options.filter((o) => o === "apple").length, 1);
  });
});

test("a pool entry differing only in case or space is also excluded", () => {
  repeat(50, () => {
    const options = buildOptions("apple", ["  Apple ", "APPLE", ...POOL]);
    assert.equal(options.filter((o) => normalizeOption(o) === "apple").length, 1);
  });
});

test("two distractors that normalize alike are never offered together", () => {
  // At most one — the pool has four distinct candidates and only three are
  // drawn, so "cherry" legitimately misses some shuffles. Two would be the bug.
  repeat(50, () => {
    const options = buildOptions("apple", ["Cherry", "cherry", "durian", "fig", "banana"]);
    assert.ok(options.filter((o) => normalizeOption(o) === "cherry").length <= 1);
  });
});

test("blank pool entries are skipped", () => {
  repeat(50, () => assert.ok(!buildOptions("apple", ["", "   ", ...POOL]).includes("")));
});

// === small pools ============================================================

test("a pool too small yields a shorter question rather than a broken one", () => {
  const options = buildOptions("apple", ["banana"]);
  assert.deepEqual(new Set(options), new Set(["apple", "banana"]));
});

test("an empty pool still offers the answer", () => {
  assert.deepEqual(buildOptions("apple", []), ["apple"]);
});

// === grading ================================================================

test("grading accepts the answer back verbatim", () => {
  assert.ok(isCorrectChoice("apple", "apple"));
});

test("grading tolerates the whitespace and case a form round-trip can add", () => {
  assert.ok(isCorrectChoice(" Apple ", "apple"));
});

test("grading rejects a distractor", () => {
  assert.ok(!isCorrectChoice("banana", "apple"));
});

test("grading rejects a near miss", () => {
  assert.ok(!isCorrectChoice("apples", "apple"));
});
