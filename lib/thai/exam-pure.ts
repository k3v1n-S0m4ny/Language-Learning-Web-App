// Pure (no DB import, no lib/thai/drill.ts or lib/thai/flashcards.ts import)
// deck-building/scoring engine for the Consonant Review Exam — split out of
// lib/thai/exam.ts for the exact reason lib/thai/reachability.ts's own header
// gives for its own DB-free split: lib/thai/exam.test.ts must be able to
// import this logic directly without transitively constructing a neon()
// client at module-load time (drill.ts and flashcards.ts both import
// "@/lib/db", which throws immediately under `tsx --test` unless
// DATABASE_URL happens to already be set in the test process's environment).
// lib/thai/exam.ts re-exports everything here and adds the DB-backed pieces
// (fetchExamConsonants, hydrateCard) on top. lib/thai/mastery.ts is likewise
// import-free (no "@/lib/db"), so importing it here does not break that
// contract.
//
// Code review fix (2026-07-07, CRITICAL): `isExamClearedSticky` /
// `unitSixUnlocked` below are the single source of truth for "has the exam
// EVER been cleared" and "should unit 6 be unlocked" — factored out here,
// DB-free, specifically so lib/thai/exam.test.ts can exercise (and lock in)
// the permanence property directly. Before this fix, lib/thai/queries.ts
// derived "cleared" from the exam session row's live `status` column, which
// a retake flips back to "in_progress" — re-locking unit 6 mid-retake and
// violating the plan's explicit "first clear unlocks unit 6 PERMANENTLY"
// decision. The fix: gate on `completedAt` (only ever SET, never nulled —
// see lib/thai/exam-actions.ts), which these two functions take as a plain
// value, never as a derivation of `status`.
import { isUnitUnlocked } from "./mastery";

// Owner QA round (5th mode, "letter-final" — the letter's FINAL-position
// sound, e.g. ก -> "k" at the end of a syllable): added alongside the
// original four. See `expectedFinalAnswer`/`NO_FINAL` below for why this mode
// needs its own answer-derivation, distinct from the real DrillType
// "letter-final" that lib/thai/drill.ts already uses for unit 6's own
// (finalIpa-guaranteed-non-null) subjects.
export type ExamMode = "flashcard" | "letter-sound" | "letter-final" | "letter-class" | "audio-letter";

export const EXAM_MODES: ExamMode[] = [
  "flashcard",
  "letter-sound",
  "letter-final",
  "letter-class",
  "audio-letter",
];

// Sentinel value for "this consonant has no final-position sound" (6 of the
// 42: ฉ ผ ฝ ห อ ฮ) — the letter-final mode's own valid, correct answer for
// those cards ("no final sound" is itself the teaching point, not a card to
// skip). Display label kept alongside the value so lib/thai/exam.ts's option
// builder and any future caller render the same human-readable text for it.
export const NO_FINAL = "none";
export const NO_FINAL_LABEL = "no final sound";

// The letter-final mode's answer-derivation — deliberately NOT routed through
// lib/thai/drill.ts's `expectedAnswerFor(item, "letter-final")`, which returns
// `item.finalIpa` as-is (null for the 6 finalless consonants) and is used
// elsewhere (unit 6's own letter-final drill) ONLY for subjects reachability
// has already filtered to `finalIpa !== null` — a null there would be a bug.
// Here, null is a valid, expected case (the card's own correct answer is
// NO_FINAL), so this maps it explicitly rather than reusing a function whose
// contract is "return null when the answer can't be derived."
export function expectedFinalAnswer(finalIpa: string | null): string {
  return finalIpa ?? NO_FINAL;
}

export type StartAction = "resume" | "retake" | "create";

// Which branch lib/thai/exam-actions.ts::startOrResumeExam should take, given
// the existing thai_exam_sessions row's status (or `null` if no row exists at
// all yet). Factored out here, pure and DB-free, so lib/thai/exam.test.ts can
// lock in the three-way routing contract directly.
//
// This is the decision logic the 2026-07-08 idempotent-create fix depends on:
// two concurrent requests racing against a not-yet-persisted first-ever row
// (Next dev renders a server component more than once per request —
// streaming/prefetch — which is exactly how this surfaced) both see
// `existingStatus === null` and MUST deterministically route to the same
// branch ("create") — which is precisely why that branch's actual INSERT
// then has to be idempotent (`onConflictDoNothing` + re-SELECT) rather than
// assuming it's the only writer. This function only proves the ROUTING is
// deterministic/pure; it can't exercise the database-level race itself
// (that needs a real unique-constraint-enforcing Postgres, not a DB-free
// unit test — see this codebase's existing "no DB in tests" contract,
// lib/thai/reachability.ts's own header).
export function decideStartAction(existingStatus: "in_progress" | "completed" | null): StartAction {
  if (existingStatus === "in_progress") return "resume";
  if (existingStatus === "completed") return "retake";
  return "create";
}

export interface ExamCard {
  itemId: string;
  mode: ExamMode;
}

export interface ExamModeStats {
  seen: number;
  correct: number;
}

export interface ExamState {
  seed: number;
  total: number;
  clearedCount: number;
  queue: ExamCard[];
  // "${itemId}:${mode}" for every card already answered at least once — used
  // to compute first-try stats (a card requeued and cleared later must NOT
  // count as a first-try correct).
  seenKeys: string[];
  firstTry: {
    overall: ExamModeStats;
    perMode: Record<ExamMode, ExamModeStats>;
  };
  slips: number;
}

function cardKey(card: ExamCard): string {
  return `${card.itemId}:${card.mode}`;
}

// Deterministic PRNG (mulberry32) — the exact implementation reused verbatim
// from components/thai/drill/flashcard-session.tsx, so a persisted seed
// reproduces the identical shuffle if the deck ever needs to be rebuilt from
// scratch (not currently required — the live queue itself is persisted — but
// keeps the seed meaningful, matching the plan's "deterministic for a given
// seed" requirement).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Build the full up-to-210-card deck (42 consonants x up to 5 modes each —
// flashcard/letter-sound/letter-final/letter-class are unconditional for
// EVERY consonant, including the 6 with no final sound at all (their
// letter-final card's correct answer is NO_FINAL, the teaching point itself,
// not something to skip); audio-letter only when the consonant's audioUrl is
// populated, A4-style graceful degradation) and interleave it with a seeded
// shuffle that never places two cards for the same consonant back-to-back.
//
// Adjacency repair: after the seeded shuffle, a single forward pass swaps any
// same-itemId-adjacent pair with a later card that doesn't itself border a
// same-itemId conflict. This is the standard "task scheduler" rearrangement
// and is always solvable here — no consonant contributes more than 5 of the
// up to 210 cards, far under the ~half-the-deck ceiling the greedy swap
// needs to guarantee a fix exists.
export function interleaveDeck(
  consonants: { id: string; audioUrl: string | null }[],
  seed: number,
): ExamCard[] {
  const cards: ExamCard[] = [];
  for (const c of consonants) {
    cards.push({ itemId: c.id, mode: "flashcard" });
    cards.push({ itemId: c.id, mode: "letter-sound" });
    cards.push({ itemId: c.id, mode: "letter-final" });
    cards.push({ itemId: c.id, mode: "letter-class" });
    if (c.audioUrl) cards.push({ itemId: c.id, mode: "audio-letter" });
  }

  const deck = seededShuffle(cards, seed);

  for (let i = 1; i < deck.length; i++) {
    if (deck[i].itemId !== deck[i - 1].itemId) continue;
    let j = i + 1;
    while (j < deck.length && deck[j].itemId === deck[i - 1].itemId) j++;
    if (j < deck.length) {
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // If no swap target exists (defensive — should not happen given the
    // multiplicity ceiling above), the adjacency is left as-is rather than
    // throwing; a single unavoidable repeat is a cosmetic wrinkle, not a
    // correctness bug.
  }

  return deck;
}

// Re-insert an answered-wrong card 10 positions ahead of the (already
// front-removed) remaining queue, or at the end if fewer than 10 cards
// remain.
export function requeue(remaining: ExamCard[], card: ExamCard): ExamCard[] {
  if (remaining.length < 10) return [...remaining, card];
  const next = [...remaining];
  next.splice(10, 0, card);
  return next;
}

export function initialExamState(seed: number, queue: ExamCard[]): ExamState {
  return {
    seed,
    total: queue.length,
    clearedCount: 0,
    queue,
    seenKeys: [],
    firstTry: {
      overall: { seen: 0, correct: 0 },
      perMode: {
        flashcard: { seen: 0, correct: 0 },
        "letter-sound": { seen: 0, correct: 0 },
        "letter-final": { seen: 0, correct: 0 },
        "letter-class": { seen: 0, correct: 0 },
        "audio-letter": { seen: 0, correct: 0 },
      },
    },
    slips: 0,
  };
}

// Apply one answer to `state`, assuming `card` is (still) `state.queue[0]` —
// callers (submitExamAnswer) verify that server-side before calling this.
// First-try stats are recorded only the first time a (itemId, mode) key is
// ever seen; a card that slips and is cleared on a later pass never counts
// as a first-try correct.
export function applyAnswer(state: ExamState, card: ExamCard, correct: boolean): ExamState {
  const key = cardKey(card);
  const alreadySeen = state.seenKeys.includes(key);
  const seenKeys = alreadySeen ? state.seenKeys : [...state.seenKeys, key];

  const firstTry = alreadySeen
    ? state.firstTry
    : {
        overall: {
          seen: state.firstTry.overall.seen + 1,
          correct: state.firstTry.overall.correct + (correct ? 1 : 0),
        },
        perMode: {
          ...state.firstTry.perMode,
          [card.mode]: {
            seen: state.firstTry.perMode[card.mode].seen + 1,
            correct: state.firstTry.perMode[card.mode].correct + (correct ? 1 : 0),
          },
        },
      };

  const remaining = state.queue.slice(1);
  const queue = correct ? remaining : requeue(remaining, card);

  return {
    ...state,
    seenKeys,
    firstTry,
    clearedCount: state.clearedCount + (correct ? 1 : 0),
    slips: state.slips + (correct ? 0 : 1),
    queue,
  };
}

// Plain (non-seeded) shuffle for MCQ option ordering — mirrors lib/thai/
// drill.ts's own unexported `shuffled` helper. Option order is rendering-only
// and never persisted, so it doesn't need to be seed-reproducible. Exported
// so lib/thai/exam.ts's (DB-backed) MCQ card builders can reuse it without
// duplicating the implementation.
export function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Whether the Consonant Review Exam has EVER been fully cleared — sticky,
// permanent, derived solely from `completedAt` (a `thai_exam_sessions` row's
// timestamp column that is only ever set once and never nulled again, even
// when a later retake resets the row's `status` back to "in_progress"). This
// must be the ONLY place that derives "cleared" for gating purposes — never
// re-derive it from the row's live `status` column (that was the exact
// CRITICAL regression the 2026-07-07 code review caught: `status ===
// "completed"` flips false the instant a retake starts, re-locking unit 6
// mid-retake). Accepts the driver's possible string representation of a
// timestamptz too (raw `db.execute` results are not schema-mapped — see the
// same caveat in lib/thai/actions.ts::submitThaiAttempt), though callers that
// go through the schema-mapped `db.select()` API will always pass a real
// `Date | null`.
export function isExamClearedSticky(completedAt: Date | string | null | undefined): boolean {
  return completedAt != null;
}

// Whether unit 6 should be unlocked, given unit 5's own already-computed
// `unlocked` flag + `percentMastered`, and the exam's sticky-cleared signal.
// Pure and DB-free specifically so lib/thai/exam.test.ts can assert the
// PERMANENCE property in isolation (unit 6 must stay unlocked across a
// retake) without touching a database — mirrors why reachability.ts's own
// unlock-math guard (`assertUnitMasteryScopingGuard`) is DB-free too. Takes
// no `status` argument at all: that is intentional and load-bearing — it is
// structurally impossible for a retake's live, resettable `status` to feed
// back into this derivation and re-lock unit 6, which is exactly the
// invariant the CRITICAL fix restores.
export function unitSixUnlocked(
  unit5Unlocked: boolean,
  unit5PercentMastered: number,
  examCompletedAt: Date | string | null | undefined,
): boolean {
  return unit5Unlocked && isUnitUnlocked(unit5PercentMastered) && isExamClearedSticky(examCompletedAt);
}
