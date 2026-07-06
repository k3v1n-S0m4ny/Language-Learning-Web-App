import { test } from "node:test";
import assert from "node:assert/strict";
import {
  type ReachabilityItem,
  isRequiredTypeMastered,
  maxAchievablePercentForUnit,
  reachableDrillTypesForUnit,
  unitMasteryStats,
} from "./reachability";

// Minimal synthetic content: one unit-2, one unit-3, and one unit-4 consonant
// (all now flashcards, generalized from the unit-2-only pilot), plus one unit-5
// consonant (unchanged MCQ) — all four with a final sound so they are also
// reachable via the cross-unit letter-final in unit 6.
const ITEMS: ReachabilityItem[] = [
  { id: "consonant:u2", kind: "consonant", unit: 2, drillable: true, finalIpa: "k", display: "ก", metadata: {} },
  { id: "consonant:u3", kind: "consonant", unit: 3, drillable: true, finalIpa: "t", display: "ข", metadata: {} },
  { id: "consonant:u4", kind: "consonant", unit: 4, drillable: true, finalIpa: "k", display: "ค", metadata: {} },
  { id: "consonant:u5", kind: "consonant", unit: 5, drillable: true, finalIpa: "p", display: "พ", metadata: {} },
];

test("unit 2 is reachable through letter-read ONLY (not the MCQ trio)", () => {
  const map = reachableDrillTypesForUnit(2, ITEMS);
  assert.deepEqual(map.get("consonant:u2"), ["letter-read"]);
});

test("unit 3 is reachable through letter-read ONLY (generalized from the unit-2 pilot)", () => {
  const map = reachableDrillTypesForUnit(3, ITEMS);
  assert.deepEqual(map.get("consonant:u3"), ["letter-read"]);
});

test("unit 4 is reachable through letter-read ONLY (generalized from the unit-2 pilot)", () => {
  const map = reachableDrillTypesForUnit(4, ITEMS);
  assert.deepEqual(map.get("consonant:u4"), ["letter-read"]);
});

test("unit 5 keeps the original letter-sound/letter-class/audio-letter MCQ trio", () => {
  const map = reachableDrillTypesForUnit(5, ITEMS);
  assert.deepEqual(map.get("consonant:u5"), ["letter-sound", "letter-class", "audio-letter"]);
});

test("unit 2 counts a card mastered via the new letter-read type", () => {
  const mastered = new Map([["consonant:u2", new Set(["letter-read"])]]);
  const { total, mastered: count } = unitMasteryStats(2, mastered, ITEMS);
  assert.equal(total, 1);
  assert.equal(count, 1);
});

test("unit 3 counts a card mastered via the new letter-read type", () => {
  const mastered = new Map([["consonant:u3", new Set(["letter-read"])]]);
  const { total, mastered: count } = unitMasteryStats(3, mastered, ITEMS);
  assert.equal(total, 1);
  assert.equal(count, 1);
});

test("unit 4 counts a card mastered via the new letter-read type", () => {
  const mastered = new Map([["consonant:u4", new Set(["letter-read"])]]);
  const { total, mastered: count } = unitMasteryStats(4, mastered, ITEMS);
  assert.equal(total, 1);
  assert.equal(count, 1);
});

test("unit 2 grandfathers legacy letter-sound mastery (no re-lock)", () => {
  const mastered = new Map([["consonant:u2", new Set(["letter-sound"])]]);
  const { mastered: count } = unitMasteryStats(2, mastered, ITEMS);
  assert.equal(count, 1);
});

test("unit 3 grandfathers legacy letter-sound mastery (no re-lock)", () => {
  const mastered = new Map([["consonant:u3", new Set(["letter-sound"])]]);
  const { mastered: count } = unitMasteryStats(3, mastered, ITEMS);
  assert.equal(count, 1);
});

test("unit 4 grandfathers legacy letter-sound mastery (no re-lock)", () => {
  const mastered = new Map([["consonant:u4", new Set(["letter-sound"])]]);
  const { mastered: count } = unitMasteryStats(4, mastered, ITEMS);
  assert.equal(count, 1);
});

test("unit 2 does NOT count a cross-unit-only letter-final streak", () => {
  const mastered = new Map([["consonant:u2", new Set(["letter-final"])]]);
  const { mastered: count } = unitMasteryStats(2, mastered, ITEMS);
  assert.equal(count, 0);
});

test("unit 3 does NOT count a cross-unit-only letter-final streak", () => {
  const mastered = new Map([["consonant:u3", new Set(["letter-final"])]]);
  const { mastered: count } = unitMasteryStats(3, mastered, ITEMS);
  assert.equal(count, 0);
});

test("unit 4 does NOT count a cross-unit-only letter-final streak", () => {
  const mastered = new Map([["consonant:u4", new Set(["letter-final"])]]);
  const { mastered: count } = unitMasteryStats(4, mastered, ITEMS);
  assert.equal(count, 0);
});

test("unit 2 is fully achievable (letter-read is scoreable for every card)", () => {
  assert.equal(maxAchievablePercentForUnit(2, ITEMS), 100);
});

test("unit 3 is fully achievable (letter-read is scoreable for every card)", () => {
  assert.equal(maxAchievablePercentForUnit(3, ITEMS), 100);
});

test("unit 4 is fully achievable (letter-read is scoreable for every card)", () => {
  assert.equal(maxAchievablePercentForUnit(4, ITEMS), 100);
});

// The shared grandfather definition every item-level mastery check routes
// through (unitMasteryStats, buildDrillRound sampling, submitThaiAttempt badge).
test("isRequiredTypeMastered: legacy letter-sound satisfies letter-read, nothing else does", () => {
  assert.equal(isRequiredTypeMastered(new Set(["letter-read"]), "letter-read"), true);
  assert.equal(isRequiredTypeMastered(new Set(["letter-sound"]), "letter-read"), true);
  assert.equal(isRequiredTypeMastered(new Set(["letter-final"]), "letter-read"), false);
  // The alias is one-directional: letter-sound is NOT satisfied by letter-read,
  // and other required types never accept the alias.
  assert.equal(isRequiredTypeMastered(new Set(["letter-read"]), "letter-sound"), false);
  assert.equal(isRequiredTypeMastered(new Set(["letter-sound"]), "letter-final"), false);
});
