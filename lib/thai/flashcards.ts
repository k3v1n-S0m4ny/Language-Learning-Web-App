// Flashcard pilot (now generalized to units 2-4): the deck loader for the
// self-graded "read the letter" flow (front = the glyph, back = its sound +
// acrophonic name + audio). This replaces the multiple-choice round
// (lib/thai/drill.ts) for units 2-4 — unit 5 still builds an MCQ round.
// See app/thai/[unit]/drill/page.tsx for the branch and
// components/thai/drill/flashcard-session.tsx for the UI.
//
// The session mechanic (clear-the-deck-once: wrong cards go to the back, loop
// until every card is cleared) lives entirely in the client component; this
// loader just returns the full deck plus each card's already-read flag, read
// from the DB (audioUrl only exists in thai_items, not the typed seed module).

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { thaiItems, thaiProgress } from "@/lib/db/schema";
import { ALL_THAI_ITEMS } from "@/seed/thai/items";
import type { ConsonantItem } from "@/seed/thai/types";

export const FLASHCARD_UNITS = new Set([2, 3, 4]);

// A fresh shuffle seed for one flashcard session. Kept here (a plain module
// function, not a component) so the page can mint a per-request seed without
// calling an impure primitive during render — the session component then
// shuffles deterministically from it, keeping SSR and hydration in agreement.
export function newShuffleSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

// Name-IPA is reference content, not learner state, so it is read from the
// typed seed module (single source of truth) rather than the DB — this avoids a
// prod re-seed just to surface it. Keyed by item id; "" for any consonant that
// has no `nameIpa` (the UI then simply omits the IPA line). Built from
// ALL_THAI_ITEMS (not just MID_CONSONANTS) so unit-3 and unit-4 cards can
// resolve their own name IPA too, now that HIGH_CONSONANTS and
// LOW_CONSONANTS_A have it authored.
const NAME_IPA_BY_ID = new Map<string, string>(
  ALL_THAI_ITEMS.filter((i): i is ConsonantItem => i.kind === "consonant").map((c) => [
    c.id,
    c.metadata.nameIpa ?? "",
  ]),
);
// The self-graded drill type unit 2's cards are mastered through, plus the
// legacy MCQ type that grandfathers pre-pilot progress (kept in sync with the
// grandfather clause in lib/thai/reachability.ts::unitMasteryStats).
export const FLASHCARD_DRILL_TYPE = "letter-read";
const LEGACY_READ_DRILL_TYPE = "letter-sound";

export interface FlashcardCard {
  itemId: string;
  glyph: string; // the consonant, e.g. "ก"
  sound: string; // initial-position IPA, e.g. "k"
  finalSound: string | null; // final-position IPA, e.g. "t"; null if it can't end a syllable (อ)
  name: string; // acrophonic name, e.g. "ก ไก่"
  nameIpa: string; // full IPA of the name, e.g. "kɔ̄ː kàj"; "" if not authored
  gloss: string; // the name's meaning, e.g. "chicken"
  audioUrl: string | null; // the spoken-name clip, once the audio batch has run
  alreadyRead: boolean; // letter-read (or legacy letter-sound) already mastered
}

// The full ordered deck for the given unit's flashcard session. Returns [] for
// any unit that is not a flashcard unit, so callers can branch on the result
// being empty the same way they would for an MCQ unit with no subjects.
export async function buildFlashcardDeck(
  learnerId: string,
  unit: number,
): Promise<FlashcardCard[]> {
  if (!FLASHCARD_UNITS.has(unit)) return [];

  const items = await db
    .select()
    .from(thaiItems)
    .where(and(eq(thaiItems.unit, unit), eq(thaiItems.drillable, true)))
    // Deterministic base order; the client shuffles once per session so card
    // position can't become a memorisation crutch.
    .orderBy(thaiItems.id);
  const consonants = items.filter((i) => i.kind === "consonant");
  const ids = consonants.map((i) => i.id);

  const progressRows = ids.length
    ? await db
        .select({
          itemId: thaiProgress.itemId,
          drillType: thaiProgress.drillType,
          masteredAt: thaiProgress.masteredAt,
        })
        .from(thaiProgress)
        .where(and(eq(thaiProgress.learnerId, learnerId), inArray(thaiProgress.itemId, ids)))
    : [];
  const readMastered = new Set(
    progressRows
      .filter(
        (r) =>
          r.masteredAt !== null &&
          (r.drillType === FLASHCARD_DRILL_TYPE || r.drillType === LEGACY_READ_DRILL_TYPE),
      )
      .map((r) => r.itemId),
  );

  return consonants.map((i) => {
    const meta = (i.metadata ?? {}) as Record<string, unknown>;
    return {
      itemId: i.id,
      glyph: i.display,
      sound: i.initialIpa ?? "",
      finalSound: i.finalIpa,
      name: (meta.name as string | undefined) ?? i.display,
      nameIpa: NAME_IPA_BY_ID.get(i.id) ?? "",
      gloss: (meta.meaning as string | undefined) ?? "",
      audioUrl: i.audioUrl,
      alreadyRead: readMastered.has(i.id),
    };
  });
}
