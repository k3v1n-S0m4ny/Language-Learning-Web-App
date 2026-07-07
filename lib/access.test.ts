import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isRestrictedLearner,
  restrictedUnitOpen,
  RESTRICTED_THAI_MAX_UNIT,
} from "./access";

test("both listed restricted emails are restricted", () => {
  assert.equal(isRestrictedLearner("prancer@gmail.com"), true);
  assert.equal(isRestrictedLearner("goonerrafat@gmail.com"), true);
});

test("case-insensitive + surrounding-whitespace match returns true", () => {
  assert.equal(isRestrictedLearner("  Prancer@Gmail.COM "), true);
});

test("the owner account is NOT restricted", () => {
  assert.equal(isRestrictedLearner("k3v1n@arisadesiam.com"), false);
});

test("an unlisted email is not restricted", () => {
  assert.equal(isRestrictedLearner("someoneelse@gmail.com"), false);
});

test("empty string / null / undefined are not restricted", () => {
  assert.equal(isRestrictedLearner(""), false);
  assert.equal(isRestrictedLearner(null), false);
  assert.equal(isRestrictedLearner(undefined), false);
});

test("Thai always-open ceiling is unit 4", () => {
  assert.equal(RESTRICTED_THAI_MAX_UNIT, 4);
});

test("units 1-4 are always open to a restricted tester (locked or not)", () => {
  assert.equal(restrictedUnitOpen(1, false), true);
  assert.equal(restrictedUnitOpen(2, false), true);
  assert.equal(restrictedUnitOpen(3, false), true);
  assert.equal(restrictedUnitOpen(4, false), true);
});

test("unit 5 opens for a tester only once it is unlocked (unit 4 finished)", () => {
  assert.equal(restrictedUnitOpen(5, false), false);
  assert.equal(restrictedUnitOpen(5, true), true);
});

test("units 6+ stay closed to a tester regardless of unlock", () => {
  assert.equal(restrictedUnitOpen(6, true), false);
  assert.equal(restrictedUnitOpen(7, true), false);
});
