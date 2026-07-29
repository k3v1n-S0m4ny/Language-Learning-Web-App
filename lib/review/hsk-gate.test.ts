import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bandPasses,
  computeGate,
  hskLabel,
  isCardEligible,
  isMastered,
  requiredToPass,
  HSK_UNLOCK_THRESHOLD_PERCENT,
  MAX_HSK_BAND,
  type GateCardRow,
} from "./hsk-gate";

const TOP = 3; // Mandarin ladder: recognise-mc -> recognise-card -> produce-card

// Build a band of `total` cards. `mastered` of them sit at the top step, and a
// further `seen - mastered` have been introduced but are still climbing. Ids are
// stable and deck-ordered within the band so eligibleUnseenIds is predictable.
function band(
  b: number | null,
  total: number,
  opts: { mastered?: number; seen?: number } = {},
): GateCardRow[] {
  const mastered = opts.mastered ?? 0;
  const seen = Math.max(opts.seen ?? mastered, mastered);
  return Array.from({ length: total }, (_, i) => ({
    id: `b${b ?? "null"}-c${i}`,
    hskLevel: b,
    step: i < mastered ? TOP : i < seen ? 1 : null,
  }));
}

test("threshold is 100% and band 7 is the merged advanced band", () => {
  assert.equal(HSK_UNLOCK_THRESHOLD_PERCENT, 100);
  assert.equal(MAX_HSK_BAND, 7);
  assert.equal(hskLabel(1), "HSK 1");
  assert.equal(hskLabel(6), "HSK 6");
  assert.equal(hskLabel(7), "HSK 7-9");
});

// === mastery predicate ======================================================

test("mastery is reaching the top step, and nothing below it counts", () => {
  assert.equal(isMastered(null), false); // never introduced
  assert.equal(isMastered(1), false);
  assert.equal(isMastered(2), false);
  assert.equal(isMastered(TOP), true);
});

test("a step above the top still counts as mastered", () => {
  // Defensive: a stored step can only exceed the top if a ladder shrinks under
  // existing data. That must read as mastered, not as un-mastered.
  assert.equal(isMastered(TOP + 1), true);
});

// === bandPasses =============================================================

test("bandPasses needs every card in the band", () => {
  assert.equal(bandPasses(130, 130), true);
  assert.equal(bandPasses(129, 130), false);
  assert.equal(bandPasses(0, 130), false);
});

test("an EMPTY band passes — otherwise it is an infinite wall", () => {
  // A band with no cards offers the learner no action that could ever clear it,
  // and refresh-seed-db.ts can empty a band.
  assert.equal(bandPasses(0, 0), true);
});

test("requiredToPass is the whole band", () => {
  assert.equal(requiredToPass(159), 159);
  assert.equal(requiredToPass(17), 17);
  assert.equal(requiredToPass(0), 0);
});

// === eligibility ============================================================

test("an unlevelled (null band) card is always eligible and can never be stranded", () => {
  assert.equal(isCardEligible(null, 1), true);
  assert.equal(isCardEligible(null, 7), true);
});

test("a card is eligible iff its band is at or below the unlocked band", () => {
  assert.equal(isCardEligible(1, 1), true);
  assert.equal(isCardEligible(2, 1), false);
  assert.equal(isCardEligible(2, 2), true);
  assert.equal(isCardEligible(7, 6), false);
});

// === the ladder =============================================================

test("a fresh learner is unlocked to band 1 only, and is served band-1 cards", () => {
  const gate = computeGate([...band(1, 10), ...band(2, 10), ...band(3, 10)]);
  assert.equal(gate.unlockedBand, 1);
  assert.equal(gate.nextBand, 2);
  assert.equal(gate.eligibleUnseenIds[0], "b1-c0");
  assert.equal(gate.eligibleUnseenIds.length, 10); // band 1 only, not all 30
});

test("90% of band 1 is no longer enough — the bar is every card", () => {
  const gate = computeGate([...band(1, 10, { mastered: 9 }), ...band(2, 10)]);
  assert.equal(gate.unlockedBand, 1);
  assert.equal(gate.blockingBand?.band, 1);
  assert.equal(gate.blockingBand?.required, 10);
  assert.deepEqual(gate.bandsToPersist, []);
});

test("clearing band 1 in full unlocks band 2 — and only band 2", () => {
  const gate = computeGate([
    ...band(1, 10, { mastered: 10 }),
    ...band(2, 10),
    ...band(3, 10),
  ]);
  assert.equal(gate.unlockedBand, 2);
  assert.equal(gate.nextBand, 3);
  assert.equal(gate.eligibleUnseenIds.length, 10); // band 2's ten, band 3 locked
});

test("the unlocked set is a PREFIX: a gap low down locks everything above it", () => {
  const gate = computeGate([
    ...band(1, 10, { mastered: 5 }),
    ...band(2, 10, { mastered: 10 }),
    ...band(3, 10),
  ]);
  assert.equal(gate.unlockedBand, 1);
  assert.equal(gate.blockingBand?.band, 1);
  assert.equal(gate.bands.find((b) => b.band === 2)?.unlocked, false);
  assert.equal(gate.bands.find((b) => b.band === 3)?.unlocked, false);
});

test("mastering every band unlocks the top of the ladder and reports no next band", () => {
  const gate = computeGate([
    ...band(1, 10, { mastered: 10 }),
    ...band(2, 10, { mastered: 10 }),
    ...band(7, 10, { mastered: 10 }),
  ]);
  assert.equal(gate.unlockedBand, MAX_HSK_BAND);
  assert.equal(gate.nextBand, null);
  assert.equal(gate.blockingBand, null);
});

test("an empty band does not wall off the bands above it", () => {
  const gate = computeGate([...band(1, 10, { mastered: 10 }), ...band(3, 10)]);
  assert.equal(gate.unlockedBand >= 3, true);
  assert.equal(gate.bands.some((b) => b.band === 2), false); // not reported: no cards
});

test("null-band cards are served even to a band-1 learner, and never counted in a band", () => {
  const gate = computeGate([...band(1, 10), ...band(null, 3)]);
  assert.equal(gate.eligibleUnseenIds.length, 13);
  assert.equal(gate.bands.every((b) => b.total === 10), true);
});

// === persistent unlocks =====================================================
//
// The reason the bar can be 100% at all. A live computation at that bar re-locks a
// cleared band the moment a single card is seeded into it, which would halt study
// every time the deck grows.

test("clearing a band marks the next one for persisting", () => {
  const gate = computeGate([...band(1, 10, { mastered: 10 }), ...band(2, 10)]);
  assert.deepEqual(gate.bandsToPersist, [2]);
});

test("an already-stored band is not offered for persisting again", () => {
  const gate = computeGate([...band(1, 10, { mastered: 10 }), ...band(2, 10)], [2]);
  assert.equal(gate.unlockedBand, 2);
  assert.deepEqual(gate.bandsToPersist, []);
});

test("SEEDING A NEW CARD INTO A CLEARED BAND DOES NOT RE-LOCK THE BAND ABOVE", () => {
  // Learner cleared band 1 (10/10) and band 2 was recorded.
  const before = computeGate([...band(1, 10, { mastered: 10 }), ...band(2, 10)]);
  assert.deepEqual(before.bandsToPersist, [2]);

  // 20 fresh band-1 cards are seeded. Band 1 is 10/30 live — but band 2 is a
  // stored fact, so it stays open and study continues.
  const after = computeGate(
    [...band(1, 30, { mastered: 10 }), ...band(2, 10, { seen: 3 })],
    [2],
  );
  assert.equal(after.unlockedBand, 2);
  assert.equal(after.bands.find((b) => b.band === 2)?.unlocked, true);
  // The new band-1 cards are servable, so the live count can be repaired.
  assert.equal(after.eligibleUnseenIds.length > 0, true);
});

test("a demotion out of the top step lowers the count but cannot close the door", () => {
  // Mastery is a LIVE read of `step`, so this card genuinely stops counting...
  const gate = computeGate([...band(1, 10, { mastered: 9 }), ...band(2, 10)], [2]);
  assert.equal(gate.bands.find((b) => b.band === 1)?.mastered, 9);
  // ...but band 2 was already earned and recorded.
  assert.equal(gate.unlockedBand, 2);
});

test("a stored unlock opens exactly its own band, not the ladder above it", () => {
  const gate = computeGate([...band(1, 10), ...band(2, 10), ...band(3, 10)], [2]);
  assert.equal(gate.unlockedBand, 2);
  assert.equal(gate.bands.find((b) => b.band === 3)?.unlocked, false);
});

test("an unlock earned only from an EMPTY band below is never written down", () => {
  // Band 2 has no cards, so band 3 opens live. Persisting that would mean seeding
  // band 2 later could never gate anything — the door would already be nailed open.
  const gate = computeGate([...band(1, 10, { mastered: 10 }), ...band(3, 10)]);
  assert.equal(gate.unlockedBand >= 3, true);
  assert.deepEqual(gate.bandsToPersist, [2]); // band 2 was earned off band 1; band 3 was not
});

// === no grandfather =========================================================
//
// Having ALREADY BEEN SERVED a high-band card must NOT unlock that band. The deck is
// not band-ordered (an HSK 7-9 card sits at deck position 63), so ordinary study had
// already shown the owner cards from bands 2/3/4/6/7 — an earlier "highest band seen"
// high-water mark read that as band 7 unlocked and, the ladder being a prefix, handed
// them the whole deck.

test("being SERVED a high-band card does not unlock that band", () => {
  const gate = computeGate([
    ...band(1, 130, { seen: 20 }),
    ...band(6, 7, { seen: 1 }), // one band-6 card already introduced, still at step 1
  ]);
  assert.equal(gate.unlockedBand, 1);
  assert.equal(gate.blockingBand?.band, 1);
  assert.equal(gate.bands.find((b) => b.band === 6)?.unlocked, false);
});

test("only reaching the TOP STEP unlocks — climbing every card halfway is not enough", () => {
  const gate = computeGate([
    ...band(1, 10, { mastered: 0, seen: 10 }),
    ...band(2, 10),
  ]);
  assert.equal(gate.unlockedBand, 1);
  assert.equal(gate.bands.find((b) => b.band === 2)?.unlocked, false);
});

// === counts / queue contract ================================================

test("eligibleUnseenIds never promises a card the gate would refuse to serve", () => {
  const rows = [...band(1, 10, { mastered: 10 }), ...band(3, 5)];
  const gate = computeGate(rows);
  const servable = rows.filter(
    (r) => r.step === null && isCardEligible(r.hskLevel, gate.unlockedBand),
  ).length;
  assert.equal(gate.eligibleUnseenIds.length, servable);
});

test("eligibleUnseenIds respects deck order, not band order", () => {
  // Rows arrive in deck order. A band-2 card sitting earlier in the deck must not be
  // served ahead of a band-1 card while band 2 is locked.
  const rows: GateCardRow[] = [
    { id: "early-b2", hskLevel: 2, step: null },
    { id: "later-b1", hskLevel: 1, step: null },
  ];
  const gate = computeGate(rows);
  assert.equal(gate.unlockedBand, 1);
  assert.deepEqual(gate.eligibleUnseenIds, ["later-b1"]);
});

test("no eligible unseen cards left reports an empty list, not a locked card", () => {
  const gate = computeGate([
    ...band(1, 10, { mastered: 5, seen: 10 }), // all seen, only half at the top
    ...band(2, 10), // locked
  ]);
  assert.equal(gate.unlockedBand, 1);
  assert.deepEqual(gate.eligibleUnseenIds, []);
});
