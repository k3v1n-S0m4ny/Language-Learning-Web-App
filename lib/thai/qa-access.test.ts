import { test } from "node:test";
import assert from "node:assert/strict";
import { THAI_QA_UNLOCK_EMAIL, isThaiQaUnlockEmail } from "./qa-access";

test("exact match returns true", () => {
  assert.equal(isThaiQaUnlockEmail(THAI_QA_UNLOCK_EMAIL), true);
});

test("case-insensitive + surrounding-whitespace match returns true", () => {
  assert.equal(isThaiQaUnlockEmail("  K3v1n@ArisaDesiam.COM  "), true);
});

test("a different allowed-learner-style email returns false", () => {
  assert.equal(isThaiQaUnlockEmail("someoneelse@arisadesiam.com"), false);
});

test("empty string returns false", () => {
  assert.equal(isThaiQaUnlockEmail(""), false);
});

test("null returns false", () => {
  assert.equal(isThaiQaUnlockEmail(null), false);
});

test("undefined returns false", () => {
  assert.equal(isThaiQaUnlockEmail(undefined), false);
});
