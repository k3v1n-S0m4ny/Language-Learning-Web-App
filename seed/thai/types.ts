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

// The four written tone marks (research doc §6 "The four tone marks"),
// identified by their Thai names' romanization rather than their glyphs so
// they're usable as object keys / discriminants. `null` = unmarked.
export type ToneMark = "mai-ek" | "mai-tho" | "mai-tri" | "mai-chattawa";

export interface SyllableItem {
  kind: "syllable";
  id: string; // e.g. "syllable:ปลา"
  unit: number;
  display: string; // the Thai word
  initialIpa: string; // full IPA reading, e.g. "plāː"
  finalIpa: null;
  consonantClass: null;
  // M13/A1: every word-bank row is now drillable — the M11-era rule ("false
  // when metadata.finalSound is null, since word-final was the only drill
  // type reachable through word-bank items") no longer holds now that
  // word-ipa (unit 11) and audio-word (unit 6) are reachable for every
  // syllable item regardless of finalSound, and tone-assembly/mark-tone
  // (unit 10) are reachable for every item with asmEligible/toneMark set.
  // See lib/thai/reachability.ts for the current reachability rules.
  drillable: boolean;
  metadata: {
    gloss: string;
    finalSound: FinalSound | null;
    vowelForm?: string; // the vowel display form this word illustrates, e.g. "◌าย"
    sourceNote?: string; // where in the doc this word came from
    // --- M13/A1: tone-derivation fields for units 10 (tone-assembly,
    // mark-tone) and 11 (word-ipa). Every value below is taken verbatim from
    // `.claude/plans/m13-word-bank.md`'s per-word derivation columns (class,
    // mark, live, len, tone, asm — each independently Wiktionary-verified for
    // the 70 new words, and computed from the research doc's own tone grid
    // for the 30 M11 words). `null` fields are the artifact's own "—" cells,
    // used only for the one multi-syllable word (สบาย, no single governing
    // class/mark/live/length/tone) and for open-syllable words with no
    // vowel-length-relevant branch reached (see asmEligible below). ---
    initialClass: ConsonantClass | null; // the tone-determining initial consonant's class
    toneMark: ToneMark | null; // the written tone mark, or null if unmarked
    live: "live" | "dead" | null; // live/dead (doc §2/§6); null for marked syllables (mark wins — length/live-dead steps are skipped) and for สบาย
    vowelLength: "short" | "long" | null; // phonetic vowel length; null where the branching drill never needs it (marked syllables with no clear single length, or สบาย)
    tone: Tone | null; // the resulting tone from the doc's own grid; null only for สบาย (multi-syllable — no single governing tone)
    // Eligible as a `tone-assembly` drill subject (artifact "asm" column).
    // `false` for multi-syllable/irregular-spelling words (สบาย, พร, ทราย)
    // where the branching flowchart's steps would mislead — they remain
    // eligible for word-ipa (and mark-tone, if marked) instead.
    asmEligible: boolean;
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
