import { test } from "node:test";
import assert from "node:assert/strict";
import { type RoundCandidate, orderRound, pickNext } from "./round";

const NOW = new Date("2026-07-29T03:00:00.000Z");

function card(cardId: string, deckOrder: number, servedMsAgo: number | null): RoundCandidate {
  return {
    cardId,
    deckOrder,
    lastReview: servedMsAgo === null ? null : new Date(NOW.getTime() - servedMsAgo),
  };
}

test("an empty batch means the round is complete", () => {
  assert.equal(pickNext([]), undefined);
});

test("never-served cards come first, in deck order", () => {
  const batch = [card("c", 3, null), card("a", 1, null), card("b", 2, null)];
  assert.deepEqual(
    orderRound(batch).map((c) => c.cardId),
    ["a", "b", "c"],
  );
});

test("a new card outranks a card already served this round", () => {
  const batch = [card("served", 1, 5_000), card("new", 9, null)];
  assert.equal(pickNext(batch), "new");
});

test("among served cards the oldest goes first", () => {
  const batch = [card("recent", 1, 1_000), card("stale", 2, 60_000)];
  assert.equal(pickNext(batch), "stale");
});

test("ties on last_review fall back to deck order", () => {
  // A db.batch write can stamp several rows in the same millisecond; the
  // sequence still has to be deterministic.
  const batch = [card("b", 2, 4_000), card("a", 1, 4_000)];
  assert.equal(pickNext(batch), "a");
});

test("orderRound does not mutate its input", () => {
  const batch = [card("b", 2, null), card("a", 1, null)];
  orderRound(batch);
  assert.equal(batch[0].cardId, "b");
});

// === the property that replaces pickFutureToday =============================

test("the card just answered is served last, never handed straight back", () => {
  // This is the whole reason the three-tier queue and its just-rated grace
  // window are gone: stamping last_review puts the answered card at the back of
  // the line by construction.
  const batch = [card("a", 1, 0), card("b", 2, 30_000), card("c", 3, 20_000)];
  assert.equal(pickNext(batch), "b");
  assert.equal(orderRound(batch).at(-1)!.cardId, "a");
});

test("a lone unfinished card is re-served, unlike the old Tier 3 rule", () => {
  // pickFutureToday deliberately returned undefined here to avoid re-serving a
  // just-rated FSRS card. In a round that behaviour would end the session with
  // work still owed, so the ladder must hand the card straight back.
  assert.equal(pickNext([card("a", 1, 0)]), "a");
});

// === full-cycle ordering ====================================================

test("a full pass serves every card once before any repeats", () => {
  // Simulate the batch: each answer stamps last_review, and no card finishes.
  let clock = NOW.getTime();
  const state = new Map<string, RoundCandidate>(
    ["a", "b", "c", "d"].map((id, i) => [id, card(id, i, null)]),
  );

  const served: string[] = [];
  for (let i = 0; i < 8; i++) {
    const next = pickNext([...state.values()])!;
    served.push(next);
    clock += 1_000;
    state.set(next, { ...state.get(next)!, lastReview: new Date(clock) });
  }

  assert.deepEqual(served.slice(0, 4), ["a", "b", "c", "d"]);
  assert.deepEqual(served.slice(4), ["a", "b", "c", "d"]);
});

test("a finished card leaving the batch does not disturb the cycle", () => {
  // Finishing schedules a card >= 1 day out, so it simply stops being a
  // candidate. The remaining cards keep their round-robin order.
  let clock = NOW.getTime();
  const state = new Map<string, RoundCandidate>(
    ["a", "b", "c"].map((id, i) => [id, card(id, i, null)]),
  );

  const served: string[] = [];
  for (let i = 0; i < 5; i++) {
    const next = pickNext([...state.values()])!;
    served.push(next);
    clock += 1_000;
    if (next === "b") state.delete("b");
    else state.set(next, { ...state.get(next)!, lastReview: new Date(clock) });
  }

  assert.deepEqual(served, ["a", "b", "c", "a", "c"]);
});
