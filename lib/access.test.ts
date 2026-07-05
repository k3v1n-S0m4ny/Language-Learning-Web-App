import { test } from "node:test";
import assert from "node:assert/strict";
import { isRestrictedLearner, RESTRICTED_THAI_MAX_UNIT } from "./access";

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

test("Thai access is capped at unit 2", () => {
  assert.equal(RESTRICTED_THAI_MAX_UNIT, 2);
});
