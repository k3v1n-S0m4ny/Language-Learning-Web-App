import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bandPasses,
  computeGate,
  hskLabel,
  isCardEligible,
  isMasteryLog,
  requiredToPass,
  HSK_UNLOCK_THRESHOLD_PERCENT,
  MAX_HSK_BAND,
  type GateCardRow,
} from "./hsk-gate";

// Build a band of `total` cards, `mastered` of them mastered, `seen` introduced.
// Ids are stable and deck-ordered within the band so firstEligibleUnseenId is predictable.
function band(
  b: number | null,
  total: number,
  opts: { mastered?: number; seen?: number } = {},
): GateCardRow[] {
  const mastered = opts.mastered ?? 0;
  const seen = opts.seen ?? mastered; // a mastered card has necessarily been seen
  return Array.from({ length: total }, (_, i) => ({
    id: `b${b ?? "null"}-c${i}`,
    hskLevel: b,
    seen: i < Math.max(seen, mastered),
    mastered: i < mastered,
  }));
}

test("threshold is 80% and band 7 is the merged advanced band", () => {
  assert.equal(HSK_UNLOCK_THRESHOLD_PERCENT, 80);
  assert.equal(MAX_HSK_BAND, 7);
  assert.equal(hskLabel(1), "HSK 1");
  assert.equal(hskLabel(6), "HSK 6");
  assert.equal(hskLabel(7), "HSK 7-9");
});

// === mastery predicate ======================================================
// priorState is ReviewLog.state: New=0, Learning=1, Review=2, Relearning=3.

test("Easy always masters, from any prior state (the escape hatch)", () => {
  for (const priorState of [0, 1, 2, 3]) {
    assert.equal(isMasteryLog(4, priorState), true);
  }
});

test("correct recall on a graduated card masters (Good and Easy)", () => {
  assert.equal(isMasteryLog(3, 2), true);
  assert.equal(isMasteryLog(4, 2), true);
});

test("an honest Good-grader does eventually master — the whole point of the union", () => {
  // Good on first sight does not master (no retention evidence yet)...
  assert.equal(isMasteryLog(3, 0), false);
  // ...nor mid-learning-step...
  assert.equal(isMasteryLog(3, 1), false);
  // ...but Good once the card has graduated does. A Good-only learner is never stuck.
  assert.equal(isMasteryLog(3, 2), true);
});

test("Again never masters, and Hard alone never masters", () => {
  for (const priorState of [0, 1, 2, 3]) {
    assert.equal(isMasteryLog(1, priorState), false);
    assert.equal(isMasteryLog(2, priorState), false);
  }
});

test("a lapsed (relearning) card is not mastered by Good — it must graduate again", () => {
  assert.equal(isMasteryLog(3, 3), false);
});

// === bandPasses =============================================================

test("bandPasses at, above and below the 80% line", () => {
  assert.equal(bandPasses(104, 130), true); // exactly 80%
  assert.equal(bandPasses(103, 130), false);
  assert.equal(bandPasses(130, 130), true);
  assert.equal(bandPasses(0, 130), false);
});

test("an EMPTY band passes — otherwise it is an infinite wall", () => {
  // percentMastered(0, 0) would be 0% and would fail; a band with no cards offers
  // the learner no action that could ever clear it. refresh-seed-db.ts can empty a band.
  assert.equal(bandPasses(0, 0), true);
});

test("requiredToPass rounds up", () => {
  assert.equal(requiredToPass(159), 128); // band 1 after the transport seed
  assert.equal(requiredToPass(130), 104);
  assert.equal(requiredToPass(32), 26);
  assert.equal(requiredToPass(17), 14);
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

test("a fresh learner is unlocked to band 1 only, and is served a band-1 card", () => {
  const gate = computeGate([...band(1, 10), ...band(2, 10), ...band(3, 10)]);
  assert.equal(gate.unlockedBand, 1);
  assert.equal(gate.nextBand, 2);
  assert.equal(gate.firstEligibleUnseenId, "b1-c0");
  assert.equal(gate.eligibleUnseenCount, 10); // band 1 only, not all 30
});

test("clearing 80% of band 1 unlocks band 2 — and only band 2", () => {
  const gate = computeGate([
    ...band(1, 10, { mastered: 9 }),
    ...band(2, 10),
    ...band(3, 10),
  ]);
  assert.equal(gate.unlockedBand, 2);
  assert.equal(gate.nextBand, 3);
  assert.equal(gate.eligibleUnseenCount, 11); // 1 unseen in band 1 + 10 in band 2
});

test("the unlocked set is a PREFIX: a gap low down locks everything above it", () => {
  // Band 2 is fully mastered, but band 1 is not — bands 2 AND 3 stay locked anyway.
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
  // No band-2 cards exist at all. Band 3 must still be reachable.
  const gate = computeGate([...band(1, 10, { mastered: 10 }), ...band(3, 10)]);
  assert.equal(gate.unlockedBand >= 3, true);
  assert.equal(gate.bands.some((b) => b.band === 2), false); // not reported: no cards
});

test("null-band cards are served even to a band-1 learner, and never counted in a band", () => {
  const gate = computeGate([...band(1, 10), ...band(null, 3)]);
  assert.equal(gate.eligibleUnseenCount, 13);
  assert.equal(gate.bands.every((b) => b.total === 10), true);
});

// === no grandfather =========================================================
//
// Having ALREADY BEEN SERVED a high-band card must NOT unlock that band. The deck is
// not band-ordered (an HSK 7-9 card sits at deck position 63), so ordinary study had
// already shown the owner cards from bands 2/3/4/6/7 — an earlier "highest band seen"
// high-water mark read that as band 7 unlocked and, the ladder being a prefix, handed
// them the whole deck. The gate was switched off for the only active learner.
//
// Nothing is stranded by this: the gate filters UNSEEN cards only, so those
// already-introduced high-band cards keep coming due through the queue's tier 1/3.

test("being SERVED a high-band card does not unlock that band", () => {
  const gate = computeGate([
    ...band(1, 130, { mastered: 0, seen: 20 }),
    ...band(6, 7, { mastered: 0, seen: 1 }), // one band-6 card already introduced
  ]);
  assert.equal(gate.unlockedBand, 1);
  assert.equal(gate.blockingBand?.band, 1);
  assert.equal(gate.bands.find((b) => b.band === 6)?.unlocked, false);
});

test("only MASTERY unlocks a band — seeing every card in it is not enough", () => {
  // Every band-1 card seen, but only half mastered: band 2 stays shut.
  const gate = computeGate([
    ...band(1, 10, { mastered: 5, seen: 10 }),
    ...band(2, 10),
  ]);
  assert.equal(gate.unlockedBand, 1);
  assert.equal(gate.bands.find((b) => b.band === 2)?.unlocked, false);
});

test("a mastered card is never un-mastered, so a lapse cannot re-lock a band", () => {
  // Mastery reads append-only review_logs, so a lapse cannot remove it. Modelled here
  // as: the mastered count is what it is, regardless of current FSRS state.
  const gate = computeGate([...band(1, 10, { mastered: 9 }), ...band(2, 10)]);
  assert.equal(gate.unlockedBand, 2);
});

test("seeding new band-1 cards can re-lock band 2 for new intake — but strands nothing", () => {
  // Learner cleared band 1 (9/10) and is working through band 2.
  const before = computeGate([
    ...band(1, 10, { mastered: 9 }),
    ...band(2, 10, { seen: 3 }),
  ]);
  assert.equal(before.unlockedBand, 2);

  // 20 fresh band-1 cards are seeded. Band 1 drops to 9/30 = 30%, so band 2 closes to
  // NEW cards again. That is correct: the learner has genuinely not mastered 80% of
  // band 1 any more. Their 3 in-progress band-2 cards are untouched — the gate never
  // filters seen cards — and the fresh band-1 cards are servable, so there is a way back.
  const after = computeGate([
    ...band(1, 30, { mastered: 9 }),
    ...band(2, 10, { seen: 3 }),
  ]);
  assert.equal(after.unlockedBand, 1);
  assert.equal(after.blockingBand?.band, 1);
  assert.equal(after.eligibleUnseenCount > 0, true);
});

// === counts / queue contract ================================================

test("eligibleUnseenCount never promises a card the gate would refuse to serve", () => {
  // The header count must match what the queue actually serves (the A6 invariant).
  const rows = [...band(1, 10, { mastered: 10 }), ...band(3, 5)];
  const gate = computeGate(rows);
  const servable = rows.filter(
    (r) => !r.seen && isCardEligible(r.hskLevel, gate.unlockedBand),
  ).length;
  assert.equal(gate.eligibleUnseenCount, servable);
});

test("firstEligibleUnseenId respects deck order, not band order", () => {
  // Rows arrive in deck order. A band-2 card sitting earlier in the deck must not be
  // served ahead of a band-1 card while band 2 is locked.
  const rows: GateCardRow[] = [
    { id: "early-b2", hskLevel: 2, seen: false, mastered: false },
    { id: "later-b1", hskLevel: 1, seen: false, mastered: false },
  ];
  const gate = computeGate(rows);
  assert.equal(gate.unlockedBand, 1);
  assert.equal(gate.firstEligibleUnseenId, "later-b1");
});

test("no eligible unseen cards left reports null, not a locked card", () => {
  const gate = computeGate([
    ...band(1, 10, { mastered: 5, seen: 10 }), // all seen, only half mastered
    ...band(2, 10), // locked
  ]);
  assert.equal(gate.unlockedBand, 1);
  assert.equal(gate.firstEligibleUnseenId, null);
  assert.equal(gate.eligibleUnseenCount, 0);
});
