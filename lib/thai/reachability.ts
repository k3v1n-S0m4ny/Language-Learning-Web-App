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
  | "letter-final"
  | "word-final"
  | "form-sound"
  | "audio-letter"
  | "audio-form"
  | "audio-tone";

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

// Units with a drill mechanic (unit 1 is lesson-only; 10-14 unbuilt).
export const DRILLED_UNITS = [2, 3, 4, 5, 6, 7, 8, 9] as const;

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
  // Consonants (acrophonic name), syllables (the word itself), and tone-words
  // (the word itself) always have real, sayable text.
  return item.kind === "consonant" || item.kind === "syllable" || item.kind === "tone-word";
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

  if (unit >= 2 && unit <= 5) {
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
