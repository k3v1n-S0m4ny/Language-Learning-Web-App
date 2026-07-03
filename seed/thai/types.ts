// Shared shapes for the Read-Thai course content (M11). This file — plus
// items.ts — is the single source of truth for course content: both the
// lesson pages (app/thai/**) and the DB seed script (scripts/seed-thai-db.ts)
// import from here. Drill/progress state lives in the DB (thai_progress,
// thai_attempts), keyed by `id`.
//
// All Thai script, IPA, class assignments, and glosses are taken verbatim from
// seed/thai/research/reading-thai-script.html (gitignored curriculum source) —
// nothing here is invented.

export type ConsonantClass = "mid" | "high" | "low";

export type FinalSound = "k" | "t" | "p" | "m" | "n" | "ŋ" | "j" | "w";

export interface ConsonantItem {
  kind: "consonant";
  id: string; // e.g. "consonant:ก"
  unit: number;
  display: string; // the letter, e.g. "ก"
  initialIpa: string; // initial-position sound, e.g. "k"
  finalIpa: string | null; // final-position sound, or null if it cannot end a syllable
  consonantClass: ConsonantClass;
  drillable: boolean; // false for ฃ and ฅ (obsolete, doc-listed but never quizzed)
  metadata: {
    name: string; // acrophonic name, e.g. "ก ไก่"
    meaning: string; // e.g. "chicken"
    obsolete?: boolean;
  };
}

export interface FinalItem {
  kind: "final";
  id: string; // e.g. "final:k"
  unit: number;
  display: string; // the sound itself, e.g. "k̚"
  initialIpa: string; // the final sound, e.g. "k"
  finalIpa: null;
  consonantClass: null;
  // Lesson-only content — the actual "letter→final sound" / "word→final sound"
  // drills quiz consonant and syllable items directly (they already carry the
  // final sound in `finalIpa` / `metadata.finalSound`); these 8 rows are never
  // drill subjects themselves. Must stay `false` (mirrors the unit-1
  // LessonMarkerItem pattern) — if `true`, they get counted in
  // getUnitSummaries' unit-6 denominator with no way to ever answer them,
  // permanently capping unit 6 below the 90% unlock threshold and blocking
  // units 7-8 forever. Fixed in M11 review round 2 (was a CRITICAL finding).
  drillable: false;
  metadata: {
    letters: string[]; // consonant letters that collapse into this final, e.g. ["ก","ข","ค","ฆ"]
    example: { thai: string; ipa: string; gloss: string };
  };
}

export type VowelCategory = "core" | "diphthong" | "hidden" | "shape-changer";

export interface VowelItem {
  kind: "vowel";
  id: string; // e.g. "vowel:aa-long"
  unit: number;
  display: string; // the written form, e.g. "◌า"
  initialIpa: string; // the sound, e.g. "aː"
  finalIpa: null;
  consonantClass: null;
  drillable: true;
  metadata: {
    category: VowelCategory;
    length: "short" | "long" | null;
    pairId?: string; // links a short/long pair, e.g. "aa"
    note?: string;
  };
}

export interface SyllableItem {
  kind: "syllable";
  id: string; // e.g. "syllable:ปลา"
  unit: number;
  display: string; // the Thai word
  initialIpa: string; // full IPA reading, e.g. "plāː"
  finalIpa: null;
  consonantClass: null;
  // false for words whose metadata.finalSound is null (no final consonant to
  // quiz — they illustrate a vowel form instead). The unit-6 word→final drill
  // is the ONLY drill type that uses word-bank items as subjects, so a word
  // with no final sound has no reachable path to being drilled; leaving it
  // drillable:true would count it in getUnitSummaries' unit-6 denominator
  // with no way to ever master it — the same bug class fixed for the 8
  // FinalItem rows in round 2, found again here in round 3 (M11 review).
  drillable: boolean;
  metadata: {
    gloss: string;
    finalSound: FinalSound | null;
    vowelForm?: string; // the vowel display form this word illustrates, e.g. "◌าย"
    sourceNote?: string; // where in the doc this word came from
  };
}

// Unit 1 has no drillable content (IPA primer + syllable anatomy, lesson-only,
// "complete when read" per the Appendix). This sentinel row gives it something
// to attach a thai_progress row to — masteredAt on this single item stands for
// "learner has read the unit 1 lesson" (lib/thai/actions.ts markUnit1Read).
export interface LessonMarkerItem {
  kind: "lesson-marker";
  id: string; // "lesson-marker:unit-1"
  unit: number;
  display: string;
  initialIpa: null;
  finalIpa: null;
  consonantClass: null;
  drillable: false;
  metadata: Record<string, never>;
}

// The five tones of Standard (Central) Thai (research doc §"tone-diacritics").
// Order matches the doc's own table (mid, low, falling, high, rising) and is
// reused everywhere a tone list needs a stable, doc-consistent order (MC
// options, the confusion matrix axes — see lib/thai/tone.ts TONE_ORDER).
export type Tone = "mid" | "low" | "falling" | "high" | "rising";

// Unit 9 (M12): tone-ear minimal-pair words. Every row is a real, doc-sourced
// or doc-methodology-consistent Thai word/syllable carrying one unambiguous
// tone (verified against the research doc's tone-diacritic table + its own
// worked "minimal set" examples) — see seed/thai/items.ts TONE_WORDS header
// comment for provenance of each family. `family` groups items for the
// lesson's listen-and-repeat tiles (same base syllable, different tone).
export interface ToneWordItem {
  kind: "tone-word";
  id: string; // e.g. "tone-word:คา"
  unit: number; // 9
  display: string; // the Thai word/syllable
  initialIpa: string; // full IPA reading with tone diacritic, e.g. "kʰāː"
  finalIpa: null;
  consonantClass: ConsonantClass | null; // the leading consonant's class, where relevant
  drillable: true;
  metadata: {
    tone: Tone;
    family: string;
    gloss?: string; // omitted for the doc's bare อ-carrier demonstration forms
  };
}

export type ThaiItem =
  | ConsonantItem
  | FinalItem
  | VowelItem
  | SyllableItem
  | LessonMarkerItem
  | ToneWordItem;
