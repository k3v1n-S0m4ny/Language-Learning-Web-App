// Pure "is this drillable item reachable as a drill subject" logic — no DB
// import (unlike lib/thai/drill.ts), so it can be safely imported both by
// lib/thai/drill.ts (buildSubjectPool, at request time) AND by
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

export interface ReachabilityItem {
  id: string;
  kind: string;
  unit: number;
  drillable: boolean;
  finalIpa: string | null;
  metadata: unknown;
}

function metadataOf(item: ReachabilityItem): Record<string, unknown> {
  return (item.metadata ?? {}) as Record<string, unknown>;
}

// Units with a drill mechanic in M11 (unit 1 is lesson-only; 9-14 unbuilt).
export const DRILLED_UNITS = [2, 3, 4, 5, 6, 7, 8] as const;

// Given the full set of thai_items rows (any unit/kind — unit 6 pulls
// consonants taught in units 2-5), returns the ids of items that actually
// become a drill subject for `unit`. This must be the ONLY implementation of
// this filter — lib/thai/drill.ts's buildSubjectPool calls it directly rather
// than re-deriving the same logic, and scripts/seed-thai-db.ts's invariant
// check imports it too.
export function computeReachableIds(unit: number, allItems: ReachabilityItem[]): Set<string> {
  if (unit >= 2 && unit <= 5) {
    return new Set(
      allItems.filter((i) => i.unit === unit && i.drillable).map((i) => i.id),
    );
  }

  if (unit === 6) {
    // letter→final subjects: any drillable consonant with a final-position
    // sound, regardless of which unit (2-5) taught the letter.
    const consonantsWithFinal = allItems.filter(
      (i) => i.kind === "consonant" && i.drillable && i.finalIpa !== null,
    );
    // word→final subjects: unit-6 word-bank rows whose metadata.finalSound is
    // a real value (words illustrating a vowel form with no final consonant
    // have finalSound: null and are NOT reachable through this drill type).
    const words = allItems.filter((i) => {
      if (i.kind !== "syllable" || i.unit !== 6 || !i.drillable) return false;
      const finalSound = metadataOf(i).finalSound;
      return finalSound !== null && finalSound !== undefined;
    });
    return new Set([...consonantsWithFinal, ...words].map((i) => i.id));
  }

  if (unit === 7 || unit === 8) {
    return new Set(
      allItems.filter((i) => i.unit === unit && i.drillable).map((i) => i.id),
    );
  }

  return new Set();
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
