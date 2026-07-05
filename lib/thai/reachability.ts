// Pure "is this drillable item reachable as a drill subject" logic — no DB
// import (unlike lib/thai/drill.ts), so it can be safely imported both by
// lib/thai/drill.ts (buildSubjectPool, at request time), by lib/thai/actions.ts
// and lib/thai/queries.ts (strict per-item mastery aggregation, M12), AND by
// scripts/seed-thai-db.ts (a standalone script that must load dotenv's
// .env.local BEFORE anything creates a DB client — importing lib/thai/drill.ts
// directly there would transitively import "@/lib/db" and construct a neon()
// client at module-load time, before config() has run, since ES module
// imports are hoisted above all other top-level statements regardless of
// source order).
//
// This file exists specifically to fix a recurring bug class (M11 review
// rounds 1-2): a thai_items row can be `drillable:true` and counted in a
// unit's getUnitSummaries denominator while never actually being reachable as
// a subject in buildSubjectPool, permanently capping that unit's achievable
// mastery below the unlock threshold. Round 1 fixed one instance (the 8
// kind:"final" rows); round 2 found a second, independent instance (9
// word-bank rows with metadata.finalSound === null). Both instances existed
// because the "is this reachable" filter was implemented by hand in
// buildSubjectPool with no mechanical check that the denominator (drillable
// items) and the reachable set (drill subjects) actually match. Fix (round 3):
// factor the filter into this one function, and have
// scripts/seed-thai-db.ts assert the invariant on every run.
//
// M12 extends this from "is the item reachable at all" to "which drill types
// is the item reachable through" — the granularity STRICT per-item mastery
// (lib/thai/mastery.ts) needs: an item counts as mastered only when EVERY
// drill type reachable for it has its own 3-streak.
//
// M12 round 2 (review CRITICAL 1 + 2 fix): a unit's own `percentMastered`
// (which gates the NEXT unit's unlock, lib/thai/queries.ts::getUnitSummaries)
// must be computed from `reachableDrillTypesForUnit(unit, ...)` — the drill
// types actually offered inside THAT unit's own drill session — never from
// the cross-unit union (`allReachableDrillTypesForItem`). The cross-unit
// union requires e.g. a unit 2-5 consonant's `letter-final` streak (only ever
// offered in unit 6's session) before that consonant's HOME unit's own
// percentage can count it — but unit 6 is locked until the home unit
// unlocks it, a permanent deadlock (round 1 shipped this bug; round 2 fixes
// it). `allReachableDrillTypesForItem` remains correct and useful for
// lifetime/item-level mastery display (badges, stats, `newlyMastered`) —
// it is NOT used for unlock math anymore. See `maxAchievablePercentForUnit`
// below for the seed-time invariant this fix is paired with.

export type DrillTypeId =
  | "letter-sound"
  | "letter-class"
  // Flashcard self-graded recognition (units 2-3) — the ONLY required drill
  // type for those units, replacing the letter-sound/letter-class/audio-letter
  // trio. See the `unit === 2 || unit === 3` branch of
  // reachableDrillTypesForUnit below.
  | "letter-read"
  | "letter-final"
  | "word-final"
  | "form-sound"
  | "audio-letter"
  | "audio-form"
  | "audio-tone"
  // M13/A2-A4: audio-word (unit 6, word-bank listening), tone-assembly and
  // mark-tone (unit 10, tone-rules engine), word-ipa (unit 11, syllable
  // decode). All four are only ever offered from the unit-6 word bank's items
  // (item.unit === 6) inside a LATER unit's session — the exact same
  // cross-unit-sourcing shape unit 6's own letter-final already has for
  // units 2-5 consonants.
  | "audio-word"
  | "tone-assembly"
  | "mark-tone"
  | "word-ipa"
  // M14/A2: unit 12 (special signs & silent leaders), unit 13 (numerals),
  // unit 14 (spaceless-reading tap-split). The FINAL Read-Thai milestone.
  | "sign-function"
  | "leader-tone"
  | "audio-leader"
  | "numeral-value"
  | "value-numeral"
  | "audio-numeral"
  | "phrase-split";

export interface ReachabilityItem {
  id: string;
  kind: string;
  unit: number;
  drillable: boolean;
  finalIpa: string | null;
  display: string;
  metadata: unknown;
}

function metadataOf(item: ReachabilityItem): Record<string, unknown> {
  return (item.metadata ?? {}) as Record<string, unknown>;
}

// Units with a drill mechanic (unit 1 is lesson-only). 10 and 11 added in
// M13 — both source their subjects from the unit-6 word bank rather than
// from items tagged unit:10/11 (mirrors unit 6's own cross-unit sourcing of
// units 2-5 consonants for letter-final). 12, 13, 14 added in M14 (the FINAL
// Read-Thai milestone) — all three DO have their own items tagged
// unit:12/13/14 (special-sign+leader-word, numeral, phrase respectively).
export const DRILLED_UNITS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

function addTo(map: Map<string, DrillTypeId[]>, id: string, drillType: DrillTypeId): void {
  const list = map.get(id);
  if (list) list.push(drillType);
  else map.set(id, [drillType]);
}

// Whether an item can EVER have synthesizable audio — a structural, permanent
// property, independent of whether scripts/generate-thai-audio.ts has run yet
// (round 2 CRITICAL 2 fix). Mirrors that script's own `deriveVowelAudioText`
// rule: a vowel form is only sayable if it has a written carrier-circle (◌) to
// attach a consonant to. `vowel:hidden-o` / `vowel:hidden-a` have no written
// form at all ("(unwritten, closed syllable)" / "(unwritten, short word)") —
// there is no text to ever synthesize, not a batch-timing gap — so an
// audio-gated drill type must never be structurally required for them.
function canEverHaveAudio(item: ReachabilityItem): boolean {
  if (item.kind === "vowel") return item.display.includes("◌");
  // M14: special-sign rows have no sayable form of their own (the glyph is a
  // silent modifier, not a word) and phrase rows are never audio-drilled
  // (A2) — both structurally can never have audio, same shape as the two
  // hidden-vowel rows above.
  if (item.kind === "special-sign" || item.kind === "phrase") return false;
  // Consonants (acrophonic name), syllables (the word itself), tone-words
  // (the word itself), leader-words (the word itself), and numerals (the
  // spoken digit name) always have real, sayable text.
  return (
    item.kind === "consonant" ||
    item.kind === "syllable" ||
    item.kind === "tone-word" ||
    item.kind === "leader-word" ||
    item.kind === "numeral"
  );
}

// Independent structural check — "could this (item, drillType) pair EVER
// produce a scoreable question, anywhere" — used only by the seed-time
// invariant below, deliberately NOT shared code with the branches that build
// `reachableDrillTypesForUnit` (round 2, point 3: an invariant that reuses the
// exact function it is meant to audit can't catch a regression in that same
// function). If a future edit reintroduces a drill type here that this
// predicate disagrees with, the seed script fails loudly.
function canDrillTypeScore(item: ReachabilityItem, drillType: DrillTypeId): boolean {
  const meta = metadataOf(item);
  switch (drillType) {
    case "letter-sound":
    case "letter-class":
    // letter-read (units 2-3 flashcards) is answerable for any consonant — it
    // is pure self-graded recognition of the glyph, needing no other content.
    case "letter-read":
      return item.kind === "consonant";
    case "audio-letter":
      return item.kind === "consonant" && canEverHaveAudio(item);
    case "letter-final":
      return item.kind === "consonant" && item.finalIpa !== null;
    case "word-final":
      return item.kind === "syllable" && meta.finalSound !== null && meta.finalSound !== undefined;
    case "form-sound":
      return item.kind === "vowel";
    case "audio-form":
      return item.kind === "vowel" && canEverHaveAudio(item);
    case "audio-tone":
      return item.kind === "tone-word" && canEverHaveAudio(item);
    // M13/A4: audio-word is structurally required for every unit-6 word-bank
    // item — canEverHaveAudio already returns true unconditionally for kind
    // "syllable" (real, sayable text always exists), so this can never
    // deadlock the way the two hidden-vowel rows once did for audio-form.
    case "audio-word":
      return item.kind === "syllable" && canEverHaveAudio(item);
    // M13/A2: tone-assembly only ever applies to asm-eligible words (the
    // artifact's "asm" column) that resolve to a real class + tone — the
    // seed-time invariant (assertEveryUnitCanReach100Percent) fails loudly if
    // reachableDrillTypesForUnit(10, ...) below ever offers it for anything
    // else.
    case "tone-assembly":
      return (
        item.kind === "syllable" &&
        metadataOf(item).asmEligible === true &&
        metadataOf(item).tone != null &&
        metadataOf(item).initialClass != null
      );
    // M13/A2: mark-tone only ever applies to marked words with a resolved tone.
    case "mark-tone":
      return (
        item.kind === "syllable" && metadataOf(item).toneMark != null && metadataOf(item).tone != null
      );
    // M13/A3: word-ipa is structurally answerable for every word-bank row —
    // every SyllableItem carries a full IPA reading (initialIpa) regardless
    // of finalSound/asmEligible/toneMark, and the drill's distractor pool
    // (100 words) is always large enough for a fallback mutation or pool pick
    // (see lib/thai/drill.ts's ipaDistractors).
    case "word-ipa":
      return item.kind === "syllable";
    // M14/A2: sign-function is structurally answerable for every special-sign
    // row (each has its own functionKey — no gap possible, only 4 rows exist).
    case "sign-function":
      return item.kind === "special-sign";
    // leader-tone requires a resolved tone (every leader-word row has one —
    // mirrors mark-tone's defense-in-depth double-check above).
    case "leader-tone":
      return item.kind === "leader-word" && meta.tone != null;
    case "audio-leader":
      return item.kind === "leader-word" && canEverHaveAudio(item);
    case "numeral-value":
    case "value-numeral":
      return item.kind === "numeral";
    case "audio-numeral":
      return item.kind === "numeral" && canEverHaveAudio(item);
    // phrase-split requires a non-empty boundaries array (the seed-time
    // assertPhraseBoundariesValid check in scripts/seed-thai-db.ts further
    // verifies every boundaries array is well-formed and re-splits correctly).
    case "phrase-split":
      return item.kind === "phrase" && Array.isArray(meta.boundaries) && (meta.boundaries as unknown[]).length > 0;
    default:
      return false;
  }
}

// Given the full set of thai_items rows (any unit/kind — unit 6 pulls
// consonants taught in units 2-5), returns a map of itemId -> the drill types
// that item is reachable through for `unit`. This must be the ONLY
// implementation of this filter — lib/thai/drill.ts's buildSubjectPool calls
// it directly rather than re-deriving the same logic, and
// scripts/seed-thai-db.ts's invariant check imports it too.
export function reachableDrillTypesForUnit(
  unit: number,
  allItems: ReachabilityItem[],
): Map<string, DrillTypeId[]> {
  const map = new Map<string, DrillTypeId[]>();

  // Units 2-3 (flashcards): the mid-class and high-class consonants are
  // drilled as self-graded "read the letter" flashcards, not multiple-choice.
  // A card is reachable through exactly one drill type — letter-read — so
  // clearing the deck once (one "knew it" per card, see
  // lib/thai/actions.ts::submitFlashcardGrade) takes the unit to 100% and
  // unlocks the next unit. Units 4-5 keep the original
  // letter-sound/letter-class/audio-letter MCQ trio.
  if (unit === 2 || unit === 3) {
    for (const i of allItems) {
      if (i.unit === unit && i.drillable) addTo(map, i.id, "letter-read");
    }
    return map;
  }

  if (unit >= 4 && unit <= 5) {
    for (const i of allItems) {
      if (i.unit === unit && i.drillable) {
        addTo(map, i.id, "letter-sound");
        addTo(map, i.id, "letter-class");
        if (canEverHaveAudio(i)) addTo(map, i.id, "audio-letter");
      }
    }
    return map;
  }

  if (unit === 6) {
    // letter→final subjects: any drillable consonant with a final-position
    // sound, regardless of which unit (2-5) taught the letter.
    for (const i of allItems) {
      if (i.kind === "consonant" && i.drillable && i.finalIpa !== null) {
        addTo(map, i.id, "letter-final");
      }
    }
    // word→final subjects: unit-6 word-bank rows whose metadata.finalSound is
    // a real value (words illustrating a vowel form with no final consonant
    // have finalSound: null and are NOT reachable through this drill type).
    for (const i of allItems) {
      if (i.kind !== "syllable" || i.unit !== 6 || !i.drillable) continue;
      const finalSound = metadataOf(i).finalSound;
      if (finalSound !== null && finalSound !== undefined) addTo(map, i.id, "word-final");
    }
    // audio-word subjects (M13/A4): every unit-6 word-bank row, regardless of
    // finalSound — this is what makes the M11-era finalSound-gated 9 rows
    // (ปลา, ดี, มือ, คา, ขา, ข่า, นา, มา, ไป) reachable again once drillable
    // flipped to true for them in M13 (previously they had NO reachable path
    // in unit 6 at all). Adding this requirement can legitimately re-lock a
    // learner's existing unit-6 percentage until the new audio clips are
    // synthesized and they re-drill (A4, M12 precedent for this exact shape).
    for (const i of allItems) {
      if (i.kind === "syllable" && i.unit === 6 && i.drillable) addTo(map, i.id, "audio-word");
    }
    return map;
  }

  if (unit === 7 || unit === 8) {
    for (const i of allItems) {
      if (i.unit === unit && i.drillable) {
        addTo(map, i.id, "form-sound");
        // Round 2 CRITICAL 2 fix: the two hidden-vowel rows (unit 8) have no
        // written form and can never have audio synthesized — audio-form must
        // not be required for them, or unit 8 can never reach 100%.
        if (canEverHaveAudio(i)) addTo(map, i.id, "audio-form");
      }
    }
    return map;
  }

  if (unit === 9) {
    for (const i of allItems) {
      if (i.kind === "tone-word" && i.unit === 9 && i.drillable) {
        addTo(map, i.id, "audio-tone");
      }
    }
    return map;
  }

  // M13/A2: unit 10's session sources its subjects from the unit-6 word
  // bank (same cross-unit-sourcing shape as unit 6's own letter-final for
  // units 2-5 consonants) — no item is tagged unit:10.
  if (unit === 10) {
    for (const i of allItems) {
      if (i.kind !== "syllable" || i.unit !== 6 || !i.drillable) continue;
      const meta = metadataOf(i);
      if (meta.asmEligible === true) addTo(map, i.id, "tone-assembly");
      // Review round-1 LOW fix (defense in depth): mirror canDrillTypeScore's
      // "mark-tone" predicate exactly (toneMark != null AND tone != null) —
      // previously this only checked toneMark, so a future word-bank row
      // shipping a mark without a resolved tone would have silently dropped
      // out of maxAchievablePercentForUnit's 100% check instead of failing
      // loudly at the offending row. Currently a no-op against real data (0
      // rows have toneMark set without tone set), but keeps the two
      // independently-written cross-checks actually in agreement.
      if (meta.toneMark != null && meta.tone != null) addTo(map, i.id, "mark-tone");
    }
    return map;
  }

  // M13/A3: unit 11's session likewise sources word-ipa subjects from the
  // full unit-6 word bank — every drillable syllable row is eligible.
  if (unit === 11) {
    for (const i of allItems) {
      if (i.kind === "syllable" && i.unit === 6 && i.drillable) addTo(map, i.id, "word-ipa");
    }
    return map;
  }

  // M14/A2: unit 12 sources BOTH its own kinds — special-sign (sign-function)
  // and leader-word (leader-tone, + audio-leader once a clip exists). Unlike
  // units 10/11, these items ARE tagged unit:12 (not cross-unit-sourced).
  if (unit === 12) {
    for (const i of allItems) {
      if (i.unit !== 12 || !i.drillable) continue;
      if (i.kind === "special-sign") addTo(map, i.id, "sign-function");
      if (i.kind === "leader-word") {
        addTo(map, i.id, "leader-tone");
        if (canEverHaveAudio(i)) addTo(map, i.id, "audio-leader");
      }
    }
    return map;
  }

  // M14/A2: unit 13 — every numeral is drillable both directions plus audio
  // (once a clip exists).
  if (unit === 13) {
    for (const i of allItems) {
      if (i.kind !== "numeral" || i.unit !== 13 || !i.drillable) continue;
      addTo(map, i.id, "numeral-value");
      addTo(map, i.id, "value-numeral");
      if (canEverHaveAudio(i)) addTo(map, i.id, "audio-numeral");
    }
    return map;
  }

  // M14/A2: unit 14 — every phrase is a phrase-split subject (never
  // audio-gated — canEverHaveAudio is false for kind "phrase").
  if (unit === 14) {
    for (const i of allItems) {
      if (i.kind === "phrase" && i.unit === 14 && i.drillable) addTo(map, i.id, "phrase-split");
    }
    return map;
  }

  return map;
}

export function computeReachableIds(unit: number, allItems: ReachabilityItem[]): Set<string> {
  return new Set(reachableDrillTypesForUnit(unit, allItems).keys());
}

// The full, structural set of drill types an item is reachable through across
// EVERY drilled unit (e.g. a consonant is reachable via letter-sound/
// letter-class/audio-letter in its home unit 2-5 AND via letter-final in unit
// 6). This is what STRICT per-item mastery checks against — deliberately
// structural (not gated on whether audioUrl currently exists), so an item
// with a not-yet-generated audio clip stays genuinely unmasterable rather
// than silently counting as mastered because the audio drill type was never
// considered reachable at all (M12 Validation Contract A1: units may
// legitimately re-lock once audio drill types are added — that only works if
// this function keeps counting the audio drill type as required regardless
// of whether the clip has landed yet).
export function allReachableDrillTypesForItem(
  itemId: string,
  allItems: ReachabilityItem[],
): DrillTypeId[] {
  const seen = new Set<DrillTypeId>();
  for (const unit of DRILLED_UNITS) {
    const types = reachableDrillTypesForUnit(unit, allItems).get(itemId);
    if (types) for (const t of types) seen.add(t);
  }
  return [...seen];
}

// The mechanical invariant itself: for `unit`, every item this unit's
// denominator counts (drillable:true, item.unit === unit) must be reachable.
// Returns the orphaned ids (empty array = invariant holds).
export function findUnreachableDrillableIds(
  unit: number,
  allItems: ReachabilityItem[],
): string[] {
  const denominatorIds = allItems
    .filter((i) => i.unit === unit && i.drillable)
    .map((i) => i.id);
  const reachable = computeReachableIds(unit, allItems);
  return denominatorIds.filter((id) => !reachable.has(id));
}

// Which unit's drill SESSION offers this (item, drillType) pair — e.g. a
// unit 2-5 consonant's `letter-final` is only ever offered inside unit 6's
// session, even though the consonant's own home unit (item.unit) is 2-5.
// Used by lib/thai/actions.ts::submitThaiAttempt (round 2 HIGH fix) to
// re-derive, server-side, which unit's unlock state actually gates a given
// attempt — never trust the client on this either. Returns null if no
// drilled unit's session offers this pair (defensive; expectedAnswerFor
// should already have rejected the combination before this is called).
export function unitOfferingDrillType(
  itemId: string,
  drillType: DrillTypeId,
  allItems: ReachabilityItem[],
): number | null {
  for (const unit of DRILLED_UNITS) {
    const types = reachableDrillTypesForUnit(unit, allItems).get(itemId);
    if (types?.includes(drillType)) return unit;
  }
  return null;
}

// Seed-time invariant (round 2, point 3): for every drilled unit, assume
// every item counted in that unit's OWN session (reachableDrillTypesForUnit)
// has every one of its required-in-this-unit drill types actually satisfied
// — i.e. the max achievable percentMastered for that unit, given a perfect
// learner, must be 100. This is deliberately computed via `canDrillTypeScore`
// rather than by re-deriving `reachableDrillTypesForUnit` itself, so it fails
// loudly on exactly the two CRITICAL bug classes round 2 fixed, if either
// ever recurs:
//   - CRITICAL 1's shape (a drill type required for an item that is only
//     ever offered in a DIFFERENT unit's session) cannot literally recur
//     inside this function's own inputs (reachableDrillTypesForUnit is
//     already unit-scoped) — the durable guard against that regression is
//     architectural: lib/thai/queries.ts::getUnitSummaries MUST compute a
//     unit's percentMastered from `reachableDrillTypesForUnit(unit, ...)`
//     directly, never from `allReachableDrillTypesForItem`'s cross-unit
//     union. This function's 100%-per-unit assertion is the mechanical
//     backstop for that contract: if a future edit reintroduces a
//     structurally-unscoreable requirement (e.g. a hidden vowel needing
//     audio-form again, or a letter-final-shaped drill type added back into
//     the 2-5 branch for a same-unit item that can't answer it), the number
//     drops below 100 and this throws.
export function maxAchievablePercentForUnit(unit: number, allItems: ReachabilityItem[]): number {
  const reachable = reachableDrillTypesForUnit(unit, allItems);
  if (reachable.size === 0) return 100;
  const byId = new Map(allItems.map((i) => [i.id, i]));
  let achievable = 0;
  for (const [itemId, types] of reachable) {
    const item = byId.get(itemId);
    if (item && types.every((dt) => canDrillTypeScore(item, dt))) achievable++;
  }
  return Math.round((achievable / reachable.size) * 100);
}

// Flashcard grandfather (units 2-3; owner-approved 2026-07-05): the legacy MCQ
// `letter-sound` streak satisfies the new `letter-read` requirement — both
// measure the same competency (recognising a consonant's sound), so a learner
// who cleared unit 2 (or unit 3, once generalized) under the old rule is
// never re-locked, re-sampled, or stripped of a "mastered" badge. This is the
// SINGLE definition of that equivalence; every place that checks a required
// drill type against a learner's mastered set (unitMasteryStats for the
// unlock gate, buildDrillRound sampling weight, and submitThaiAttempt's
// item-level newlyMastered) routes through it so the grandfather can never
// drift out of sync between call sites.
export function isRequiredTypeMastered(
  masteredSet: Set<string>,
  requiredType: DrillTypeId,
): boolean {
  if (masteredSet.has(requiredType)) return true;
  if (requiredType === "letter-read" && masteredSet.has("letter-sound")) return true;
  return false;
}

// STRICT per-UNIT mastery stats (M11/A1; moved here from lib/thai/queries.ts
// in M13/A6 residual #2). Purely a function of `reachableDrillTypesForUnit`
// (never the cross-unit `allReachableDrillTypesForItem` union — see this
// file's header, CRITICAL 1) and a learner's already-fetched mastered-set
// map, so it has zero DB dependency and can be called from
// scripts/seed-thai-db.ts (which must never import anything that
// transitively pulls in "@/lib/db" — see this file's header) as well as from
// lib/thai/queries.ts::getUnitSummaries.
export function unitMasteryStats(
  unit: number,
  masteredByItem: Map<string, Set<string>>,
  allItems: ReachabilityItem[],
): { total: number; mastered: number } {
  const reachable = reachableDrillTypesForUnit(unit, allItems);
  let mastered = 0;
  for (const [itemId, requiredTypes] of reachable) {
    const masteredSet = masteredByItem.get(itemId);
    if (!masteredSet) continue;
    // isRequiredTypeMastered carries the units 2-3 letter-read/letter-sound
    // grandfather; for every other unit it is a plain masteredSet.has(dt).
    if (requiredTypes.every((dt) => isRequiredTypeMastered(masteredSet, dt))) mastered++;
  }
  return { total: reachable.size, mastered };
}

// M13/A6 residual #2 — mechanical regression guard against the exact
// CRITICAL 1 bug class from the M12 review (this file's header): a crafted,
// DB-free synthetic fixture proves `unitMasteryStats` requires a unit's OWN
// reachable drill types, not a cross-unit-only one. Run from
// scripts/seed-thai-db.ts on every seed refresh, so a future edit that
// reintroduces `allReachableDrillTypesForItem`'s cross-unit union into
// getUnitSummaries' per-unit percentage (the architecture-shape regression
// the M12 review flagged as only documentation-guarded, not mechanically
// checked) gets caught the next time the seed script runs.
//
// Factored into a per-unit helper so the exact same invariant can be asserted
// for both flashcard units (2 and 3) rather than only unit 2 — a future
// regression specific to unit 3's unlock math (e.g. from the units 2-3
// generalization) is caught the same way unit 2's already is.
function assertUnitMasteryScopingGuardForUnit(unit: number, allItems: ReachabilityItem[]): void {
  // A real consonant in this unit that also has a final sound, so it is
  // reachable via letter-final — but ONLY from unit 6's own session, never
  // this unit's.
  const sample = allItems.find(
    (i) => i.kind === "consonant" && i.unit === unit && i.drillable && i.finalIpa !== null,
  );
  if (!sample) {
    throw new Error(
      `Unlock-math regression guard could not run: no unit-${unit} consonant with a final ` +
        "sound was found in the seed content to build the synthetic fixture against.",
    );
  }

  // Negative fixture: this item is "mastered" ONLY for letter-final (the
  // cross-unit-only type) — its own unit's required type (letter-read, and its
  // grandfathered legacy proxy letter-sound) is deliberately left unmastered.
  const crossUnitOnly = new Map<string, Set<string>>([[sample.id, new Set(["letter-final"])]]);
  const { mastered: crossUnitMastered } = unitMasteryStats(unit, crossUnitOnly, allItems);
  if (crossUnitMastered !== 0) {
    throw new Error(
      `Unlock-math regression guard FAILED: unitMasteryStats(${unit}, ...) counted an item as ` +
        "mastered using only a cross-unit drill type (letter-final, reachable exclusively " +
        `from unit 6's own session), instead of requiring unit ${unit}'s own reachable type ` +
        "(letter-read). This is the exact M12 review CRITICAL 1 deadlock bug " +
        "class (see this file's header) — lib/thai/queries.ts::getUnitSummaries must derive " +
        "percentMastered from reachableDrillTypesForUnit(unit, ...) directly, never from the " +
        "cross-unit allReachableDrillTypesForItem union.",
    );
  }

  // Positive control: mastering EVERY one of this unit's own required types
  // for this item (letter-read — derived from reachableDrillTypesForUnit
  // itself, not hardcoded, so this stays correct regardless of which drill
  // types this unit's own session offers) — but NOT the cross-unit
  // letter-final — must count the item as mastered for this unit's own
  // percentage. Proves the guard isn't trivially "always return 0".
  const ownUnitRequiredTypes = reachableDrillTypesForUnit(unit, allItems).get(sample.id) ?? [];
  const ownUnitOnly = new Map<string, Set<string>>([[sample.id, new Set(ownUnitRequiredTypes)]]);
  const { mastered: ownUnitMastered } = unitMasteryStats(unit, ownUnitOnly, allItems);
  if (ownUnitMastered !== 1) {
    throw new Error(
      `Unlock-math regression guard FAILED (positive control): unitMasteryStats(${unit}, ...) ` +
        `did not count an item mastered via its own unit-${unit} required types ` +
        `(${ownUnitRequiredTypes.join(", ")}) as mastered.`,
    );
  }

  console.log(
    `[reachability] OK — unitMasteryStats correctly scopes unit ${unit}'s own percentage to ` +
      "its own reachable drill types (M13/A6 unlock-math regression guard).",
  );
}

export function assertUnitMasteryScopingGuard(allItems: ReachabilityItem[]): void {
  assertUnitMasteryScopingGuardForUnit(2, allItems);
  assertUnitMasteryScopingGuardForUnit(3, allItems);
}
