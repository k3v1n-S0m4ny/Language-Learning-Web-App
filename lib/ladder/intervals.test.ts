import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTERVAL_RUNG_DAYS,
  MAX_RUNG,
  dueFromRung,
  intervalDaysForRung,
  nextRung,
} from "./intervals";

const NOW = new Date("2026-07-29T03:00:00.000Z");

test("rungs grow 3x and cap at two years", () => {
  assert.deepEqual([...INTERVAL_RUNG_DAYS], [1, 3, 9, 27, 81, 243, 729]);
  for (let i = 1; i < INTERVAL_RUNG_DAYS.length; i++) {
    assert.equal(INTERVAL_RUNG_DAYS[i], INTERVAL_RUNG_DAYS[i - 1] * 3);
  }
});

test("rung saturates rather than running off the table", () => {
  assert.equal(nextRung(MAX_RUNG), MAX_RUNG);
  assert.equal(nextRung(MAX_RUNG + 50), MAX_RUNG);
  assert.equal(intervalDaysForRung(MAX_RUNG + 50), 729);
});

test("a negative or corrupt rung clamps to the bottom", () => {
  // Nothing should write a negative rung, but a clamp here is cheaper than a
  // NaN interval reaching the due column.
  assert.equal(intervalDaysForRung(-3), 1);
});

test("dueFromRung adds whole days", () => {
  assert.equal(dueFromRung(NOW, 0).toISOString(), "2026-07-30T03:00:00.000Z");
  assert.equal(dueFromRung(NOW, 2).toISOString(), "2026-08-07T03:00:00.000Z");
});
