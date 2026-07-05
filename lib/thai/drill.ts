// Builds a round of ~15 MC drill questions for a unit, and scores answers.
// Sampling is weighted toward unmastered + least-recently-seen items (A6);
// distractors are drawn from "confusable" sets (same class / similar IPA /
// same vowel category) rather than uniform-random (A6). ฃ and ฅ are excluded
// by construction — every pool query filters drillable = true, and those two
// letters are the only drillable:false rows (seed/thai/items.ts).
//
// M12: adds audio-letter (units 2-5), audio-form (units 7-8) and audio-tone
// (unit 9) — all three only enter a subject's drillTypes when the item's
// audioUrl is actually populated (A4: audio drills must degrade gracefully,
// sampling nothing, while the M12 paid batch hasn't run yet).
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { thaiItems } from "@/lib/db/schema";
import { ALL_THAI_ITEMS } from "@/seed/thai/items";
import type { Tone } from "@/seed/thai/types";
import { DRILL_ROUND_SIZE } from "./mastery";
import { getProgressByItemIds } from "./queries";
import { allReachableDrillTypesForItem, computeReachableIds, isRequiredTypeMastered } from "./reachability";
import { TONE_LABELS, TONE_ORDER } from "./tone";
import { serializeBoundaries, type DrillOption, type DrillQuestion, type DrillRound, type DrillStep, type DrillType } from "./types";

type ItemRow = typeof thaiItems.$inferSelect;

const FINAL_SOUNDS = ["k", "t", "p", "m", "n", "ŋ", "j", "w"] as const;
const FINAL_GROUPS: Record<string, string[]> = {
  k: ["k", "t", "p"],
  t: ["t", "k", "p"],
  p: ["p", "k", "t"],
  m: ["m", "n", "ŋ"],
  n: ["n", "m", "ŋ"],
  ŋ: ["ŋ", "m", "n"],
  j: ["j", "w"],
  w: ["w", "j"],
};

// Which item kinds a drill type is even allowed to apply to — cross-checked
// in expectedAnswerFor so a drillType/item mismatch (e.g. someone submitting
// "word-final" against a consonant) returns null rather than a bogus answer
// (M11 residual, folded into M12: "expectedAnswerFor doesn't cross-check
// drillType vs item kind").
const VALID_KINDS_FOR_DRILL_TYPE: Record<DrillType, string[]> = {
  "letter-sound": ["consonant"],
  "letter-class": ["consonant"],
  // Unit 2 flashcard: self-graded, so it never flows through expectedAnswerFor
  // (which returns null for it — the switch has no case) nor submitThaiAttempt
  // (KNOWN_DRILL_TYPES excludes it). Listed here only to satisfy the
  // Record<DrillType, …> completeness check.
  "letter-read": ["consonant"],
  "letter-final": ["consonant"],
  "word-final": ["syllable"],
  "form-sound": ["vowel"],
  "audio-letter": ["consonant"],
  "audio-form": ["vowel"],
  "audio-tone": ["tone-word"],
  "audio-word": ["syllable"],
  "tone-assembly": ["syllable"],
  "mark-tone": ["syllable"],
  "word-ipa": ["syllable"],
  // M14/A2.
  "sign-function": ["special-sign"],
  "leader-tone": ["leader-word"],
  "audio-leader": ["leader-word"],
  "numeral-value": ["numeral"],
  "value-numeral": ["numeral"],
  "audio-numeral": ["numeral"],
  "phrase-split": ["phrase"],
};

// M14/A4: curated visually/aurally confusable Thai-digit VALUE groups (not
// glyph pairs) — {3,7}, {6,9}, {4,5}, {1,9} per the content bank's curator
// suggestion. Digits 0, 2, 8 have no curated partner and fall back to the
// general pool, same shape as finalSoundDistractors' FINAL_GROUPS fallback.
const DIGIT_CONFUSABLE_GROUPS: Record<number, number[]> = {
  1: [9],
  3: [7],
  4: [5],
  5: [4],
  6: [9],
  7: [3],
  9: [1, 6],
};
const ALL_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// M13/A3: mechanical mutation of a full IPA reading along exactly one
// dimension — tone, vowel length, or final — for word-ipa distractors. These
// operate on the already-verified IPA strings from seed/thai/items.ts (never
// inventing new Thai/IPA content); they are pure Unicode-combining-mark
// substitutions, matching the exact diacritic convention already used
// throughout the seed content (verified against the corpus: macron U+0304 =
// mid, grave U+0300 = low, circumflex U+0302 = falling, acute U+0301 = high,
// caron U+030C = rising; length marker U+02D0 "ː"; unreleased-final marker
// U+031A "̚" following k/t/p).
const TONE_DIACRITIC: Record<Tone, string> = {
  mid: "̄",
  low: "̀",
  falling: "̂",
  high: "́",
  rising: "̌",
};
const ALL_TONE_DIACRITICS = Object.values(TONE_DIACRITIC);
const FINAL_IPA: Record<string, string> = {
  k: "k̚",
  t: "t̚",
  p: "p̚",
  m: "m",
  n: "n",
  ŋ: "ŋ",
  j: "j",
  w: "w",
};

// Retone the LAST tone-diacritic occurrence in an IPA string (the main/final
// syllable's — the one seed/thai/items.ts's metadata.tone describes) to a
// different tone. Returns null if the string has no tone diacritic at all.
function retoneIpa(ipa: string, targetTone: string): string | null {
  const nfd = ipa.normalize("NFD");
  let lastIdx = -1;
  for (const d of ALL_TONE_DIACRITICS) {
    const idx = nfd.lastIndexOf(d);
    if (idx > lastIdx) lastIdx = idx;
  }
  if (lastIdx === -1) return null;
  const targetDiacritic = TONE_DIACRITIC[targetTone as Tone];
  if (!targetDiacritic) return null;
  return (nfd.slice(0, lastIdx) + targetDiacritic + nfd.slice(lastIdx + 1)).normalize("NFC");
}

// Mutate vowel length by dropping the first long-vowel marker "ː" — returns
// null if the string has none (nothing to shorten; the fallback pool covers
// this case in ipaDistractors).
function mutateLengthIpa(ipa: string): string | null {
  const idx = ipa.indexOf("ː");
  if (idx === -1) return null;
  return ipa.slice(0, idx) + ipa.slice(idx + 1);
}

// Mutate the final consonant sound using the same confusable groups the
// word-final/letter-final drills already use (finalSoundDistractors below) —
// returns [] if the word has no trailing final in FINAL_IPA form to swap.
function mutateFinalIpa(ipa: string, correctFinal: string): string[] {
  const correctRepr = FINAL_IPA[correctFinal];
  if (!correctRepr || !ipa.endsWith(correctRepr)) return [];
  const base = ipa.slice(0, ipa.length - correctRepr.length);
  const alts = (FINAL_GROUPS[correctFinal] ?? []).filter((f) => f !== correctFinal);
  return alts.map((f) => base + FINAL_IPA[f]).filter((v) => v !== ipa);
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick<T>(arr: T[], n: number): T[] {
  return shuffled(arr).slice(0, n);
}

export function metadataOf(item: ItemRow): Record<string, unknown> {
  return (item.metadata ?? {}) as Record<string, unknown>;
}

// The correct answer for a given item + drill type — the single source of
// truth used both to build a question's options (buildQuestion below) and to
// re-derive/verify an answer server-side in lib/thai/actions.ts::
// submitThaiAttempt, which never trusts a client-supplied "expected" value
// (M11 review round 2, HIGH fix).
export function expectedAnswerFor(item: ItemRow, drillType: DrillType): string | null {
  if (!VALID_KINDS_FOR_DRILL_TYPE[drillType].includes(item.kind)) return null;
  const meta = metadataOf(item);
  switch (drillType) {
    case "letter-sound":
      return item.initialIpa;
    case "letter-class":
      return item.consonantClass;
    case "letter-final":
      return item.finalIpa;
    case "word-final":
      return (meta.finalSound as string | undefined) ?? null;
    case "form-sound":
      // Forward direction only (form shown, learner picks the sound) — see
      // the M11 review round 2 HIGH fix note on why the earlier bidirectional
      // (form<->sound) version was removed: verifying an answer server-side
      // requires a direction that's a pure function of (item, drillType),
      // not a client-supplied "reversed" flag.
      return item.initialIpa;
    case "audio-letter":
      // Hear the letter's name clip, pick the letter (reverse of letter-sound).
      return item.display;
    case "audio-form":
      // Hear the vowel's sound clip, pick the written form (reverse of
      // form-sound — this is also the M11-residual "sound→form reverse vowel
      // drill", which ships as audio rather than a second text direction).
      return item.display;
    case "audio-tone":
      return (meta.tone as string | undefined) ?? null;
    case "audio-word":
      // Hear the word's clip, pick the word (same reverse-of-forward shape as
      // audio-letter/audio-form).
      return item.display;
    case "word-ipa":
      return item.initialIpa;
    case "mark-tone":
    case "tone-assembly":
      // Both resolve to the word's FINAL tone — tone-assembly's per-step
      // branching feedback is client-side only (buildToneAssemblySteps); the
      // server only ever verifies the final answer, same as every other
      // drill type (M13/A2 contract: "One thai_attempts row per completed
      // question ... expected vs chosen FINAL tone").
      return (meta.tone as string | null | undefined) ?? null;
    // M14/A3: sign-function's answer is the sign's own functionKey.
    case "sign-function":
      return (meta.functionKey as string | undefined) ?? null;
    // M14/A3: leader-tone resolves to the leader word's final (post-leader)
    // tone — the whole teaching point of the drill.
    case "leader-tone":
      return (meta.tone as Tone | undefined) ?? null;
    // M14/A3: audio-leader is the reverse-of-forward shape (hear the clip,
    // pick the written spelling) — same pattern as audio-letter/audio-word.
    case "audio-leader":
      return item.display;
    // M14/A4: numeral-value's answer is the Arabic digit value as a string.
    case "numeral-value":
      return meta.value != null ? String(meta.value) : null;
    // M14/A4: value-numeral / audio-numeral both resolve to the Thai numeral
    // glyph itself (reverse-of-forward shape for audio-numeral).
    case "value-numeral":
    case "audio-numeral":
      return item.display;
    // M14/A5: phrase-split's answer is the canonical boundary-index set,
    // serialized identically to how the client serializes its tapped set
    // (serializeBoundaries — the single shared source of truth).
    case "phrase-split": {
      const boundaries = meta.boundaries as number[] | undefined;
      if (!Array.isArray(boundaries) || boundaries.length === 0) return null;
      return serializeBoundaries(boundaries);
    }
    default:
      return null;
  }
}

// Weighted pick **with replacement** from a scored pool — nothing is removed
// from `entries` between iterations, so the same subject can be picked more
// than once in a round (necessary: round size is fixed at ~15 regardless of
// pool size, and some pools, e.g. unit 2's 9 mid-class consonants, are
// smaller than that). The only repeat-avoidance is skipping an exact
// back-to-back repeat of the immediately previous question when the pool
// has more than one entry.
function weightedPick<T>(
  entries: { value: T; weight: number }[],
  previous: T | null,
  isSame: (a: T, b: T) => boolean,
): T {
  const pool = entries.filter(
    (e) => previous === null || !isSame(e.value, previous) || entries.length === 1,
  );
  const usable = pool.length ? pool : entries;
  const total = usable.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * total;
  for (const e of usable) {
    r -= e.weight;
    if (r <= 0) return e.value;
  }
  return usable[usable.length - 1].value;
}

async function fetchUnitItems(unit: number): Promise<ItemRow[]> {
  return db
    .select()
    .from(thaiItems)
    .where(and(eq(thaiItems.unit, unit), eq(thaiItems.drillable, true)));
}

async function fetchConsonantsWithFinal(): Promise<ItemRow[]> {
  const rows = await db
    .select()
    .from(thaiItems)
    .where(and(eq(thaiItems.kind, "consonant"), eq(thaiItems.drillable, true)));
  return rows.filter((r) => r.finalIpa !== null);
}

// The full word bank (kind "syllable", all tagged unit:6) — the shared
// subject source for unit 6's own session AND units 10/11 (M13), which
// source their subjects from this same set rather than from items tagged
// unit:10/unit:11 (no such items exist; mirrors unit 6's own cross-unit
// sourcing of units 2-5 consonants for letter-final).
async function fetchWordBankItems(): Promise<ItemRow[]> {
  return db
    .select()
    .from(thaiItems)
    .where(and(eq(thaiItems.kind, "syllable"), eq(thaiItems.drillable, true)));
}

interface Subject {
  item: ItemRow;
  drillTypes: DrillType[];
}

// Subject selection is driven entirely by computeReachableIds (lib/thai/
// reachability.ts) — there is no second, hand-written "is this reachable"
// filter here to drift out of sync with it (M11 review round 3: this is
// exactly the class of bug that shipped twice — a thai_items row counted in
// a unit's denominator with no actual path to becoming a drill subject).
//
// Audio drill types are appended per-item, gated on that item's audioUrl
// actually being populated — a subject with zero available drillTypes (e.g. a
// unit-9 tone word before the paid audio batch has run) is dropped entirely
// so it can never be picked into a round with nothing to ask about (A4).
async function buildSubjectPool(unit: number): Promise<Subject[]> {
  // Units 2-3 are flashcard units (self-graded, no MCQ round) — their decks
  // are built by lib/thai/flashcards.ts::buildFlashcardDeck, not here. Only
  // units 4-5 use this MCQ letter-sound/letter-class/audio-letter pool.
  if (unit >= 4 && unit <= 5) {
    const items = await fetchUnitItems(unit);
    const reachable = computeReachableIds(unit, items);
    return items
      .filter((item) => reachable.has(item.id))
      .map((item) => ({
        item,
        drillTypes: [
          "letter-sound",
          "letter-class",
          ...(item.audioUrl ? (["audio-letter"] as const) : []),
        ] as DrillType[],
      }));
  }
  if (unit === 6) {
    const [unit6Items, consonantsWithFinal] = await Promise.all([
      fetchUnitItems(6),
      fetchConsonantsWithFinal(),
    ]);
    const reachable = computeReachableIds(6, [...unit6Items, ...consonantsWithFinal]);
    const words = unit6Items.filter((i) => i.kind === "syllable" && reachable.has(i.id));
    const consonants = consonantsWithFinal.filter((i) => reachable.has(i.id));
    return [
      ...consonants.map((item) => ({ item, drillTypes: ["letter-final"] as DrillType[] })),
      // M13/A4: each word's drillTypes are built per-item — word-final only
      // when finalSound is real, audio-word only when the clip has actually
      // landed (gated on audioUrl, same pattern as audio-letter/audio-form/
      // audio-tone). A word with neither degrades to an empty array and is
      // dropped, same as any other unit-9-before-the-batch subject (A4).
      ...words
        .map((item) => {
          const meta = metadataOf(item);
          const drillTypes: DrillType[] = [];
          if (meta.finalSound !== null && meta.finalSound !== undefined) drillTypes.push("word-final");
          if (item.audioUrl) drillTypes.push("audio-word");
          return { item, drillTypes };
        })
        .filter((s) => s.drillTypes.length > 0),
    ];
  }
  if (unit === 10) {
    const items = await fetchWordBankItems();
    const reachable = computeReachableIds(10, items);
    return items
      .filter((item) => reachable.has(item.id))
      .map((item) => {
        const meta = metadataOf(item);
        const drillTypes: DrillType[] = [];
        if (meta.asmEligible === true) drillTypes.push("tone-assembly");
        if (meta.toneMark != null) drillTypes.push("mark-tone");
        return { item, drillTypes };
      })
      .filter((s) => s.drillTypes.length > 0);
  }
  if (unit === 11) {
    const items = await fetchWordBankItems();
    const reachable = computeReachableIds(11, items);
    return items
      .filter((item) => reachable.has(item.id))
      .map((item) => ({ item, drillTypes: ["word-ipa"] as DrillType[] }));
  }
  if (unit === 7 || unit === 8) {
    const items = await fetchUnitItems(unit);
    const reachable = computeReachableIds(unit, items);
    return items
      .filter((item) => reachable.has(item.id))
      .map((item) => ({
        item,
        drillTypes: [
          "form-sound",
          ...(item.audioUrl ? (["audio-form"] as const) : []),
        ] as DrillType[],
      }));
  }
  if (unit === 9) {
    const items = await fetchUnitItems(9);
    const reachable = computeReachableIds(9, items);
    return items
      .filter((item) => reachable.has(item.id) && item.audioUrl)
      .map((item) => ({ item, drillTypes: ["audio-tone"] as DrillType[] }));
  }
  // M14/A3: unit 12 sources BOTH its own kinds — special-sign
  // (sign-function) and leader-word (leader-tone, + audio-leader once a clip
  // exists). Unlike units 10/11, these rows are tagged unit:12 directly.
  if (unit === 12) {
    const items = await fetchUnitItems(12);
    const reachable = computeReachableIds(12, items);
    return items
      .filter((item) => reachable.has(item.id))
      .map((item) => {
        const drillTypes: DrillType[] = [];
        if (item.kind === "special-sign") drillTypes.push("sign-function");
        if (item.kind === "leader-word") {
          drillTypes.push("leader-tone");
          if (item.audioUrl) drillTypes.push("audio-leader");
        }
        return { item, drillTypes };
      })
      .filter((s) => s.drillTypes.length > 0);
  }
  // M14/A4: unit 13 — every numeral is drillable both directions plus audio
  // once a clip exists.
  if (unit === 13) {
    const items = await fetchUnitItems(13);
    const reachable = computeReachableIds(13, items);
    return items
      .filter((item) => reachable.has(item.id))
      .map((item) => {
        const drillTypes: DrillType[] = ["numeral-value", "value-numeral"];
        if (item.audioUrl) drillTypes.push("audio-numeral");
        return { item, drillTypes };
      });
  }
  // M14/A5: unit 14 — every phrase is a phrase-split subject (never
  // audio-gated).
  if (unit === 14) {
    const items = await fetchUnitItems(14);
    const reachable = computeReachableIds(14, items);
    return items
      .filter((item) => reachable.has(item.id))
      .map((item) => ({ item, drillTypes: ["phrase-split"] as DrillType[] }));
  }
  return [];
}

function consonantDistractors(
  pool: ItemRow[],
  correct: ItemRow,
  field: "initialIpa" | "display",
): DrillOption[] {
  const sameClass = pool.filter(
    (p) => p.id !== correct.id && p.consonantClass === correct.consonantClass && p[field],
  );
  const others = pool.filter((p) => p.id !== correct.id && p[field]);
  const seen = new Set([correct[field]]);
  const options: DrillOption[] = [];
  for (const candidate of [...pick(sameClass, 6), ...pick(others, 10)]) {
    const value = candidate[field] as string;
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: value });
    if (options.length >= 3) break;
  }
  return options;
}

function finalSoundDistractors(correct: string): DrillOption[] {
  const group = FINAL_GROUPS[correct] ?? [...FINAL_SOUNDS];
  const preferred = group.filter((s) => s !== correct);
  const rest = FINAL_SOUNDS.filter((s) => s !== correct && !preferred.includes(s));
  const chosen: string[] = [];
  for (const s of [...pick(preferred, preferred.length), ...pick(rest, rest.length)]) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(s)) chosen.push(s);
  }
  return chosen.map((v) => ({ value: v, label: v }));
}

function vowelDistractors(pool: ItemRow[], correct: ItemRow, byForm: boolean): DrillOption[] {
  const correctValue = byForm ? correct.display : correct.initialIpa!;
  const correctMeta = metadataOf(correct);
  const sameCategory = pool.filter((p) => {
    if (p.id === correct.id) return false;
    const m = metadataOf(p);
    return m.category === correctMeta.category;
  });
  const others = pool.filter((p) => p.id !== correct.id);
  const seen = new Set([correctValue]);
  const options: DrillOption[] = [];
  for (const candidate of [...pick(sameCategory, 6), ...pick(others, 10)]) {
    const value = byForm ? candidate.display : candidate.initialIpa;
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: value });
    if (options.length >= 3) break;
  }
  return options;
}

function toneDistractors(correct: string): DrillOption[] {
  return TONE_ORDER.filter((t) => t !== correct).map((t) => ({ value: t, label: TONE_LABELS[t] }));
}

// M13/A4: audio-word distractors — prefer other words sharing the correct
// word's final sound (adversarial, per A4's "adversarial distractors" ask),
// falling back to the general pool.
function wordDistractors(pool: ItemRow[], correct: ItemRow): DrillOption[] {
  const correctMeta = metadataOf(correct);
  const sameFinal = pool.filter((p) => {
    if (p.id === correct.id) return false;
    const finalSound = correctMeta.finalSound;
    return finalSound != null && metadataOf(p).finalSound === finalSound;
  });
  const others = pool.filter((p) => p.id !== correct.id);
  const seen = new Set([correct.display]);
  const options: DrillOption[] = [];
  for (const candidate of [...pick(sameFinal, 6), ...pick(others, 20)]) {
    const value = candidate.display;
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: value });
    if (options.length >= 3) break;
  }
  return options;
}

// M14/A3: sign-function distractors — the other three special-sign rows'
// own (functionKey, functionLabel) pairs. Only 4 rows exist total, so this
// always yields exactly 3 distractors when `pool` is the full unit-12 pool.
function signFunctionDistractors(pool: ItemRow[], correct: ItemRow): DrillOption[] {
  return pool
    .filter((p) => p.kind === "special-sign" && p.id !== correct.id)
    .map((p) => {
      const m = metadataOf(p);
      return { value: m.functionKey as string, label: m.functionLabel as string };
    });
}

// M14/A3: audio-leader spelling distractors — prefer the adversarial
// "leaderless base" spelling (drop the leading leaderChar codepoint, e.g.
// หมา -> มา) per A3's own worked example, falling back to other leader
// words' spellings (same-family confusable).
function leaderSpellingDistractors(pool: ItemRow[], correct: ItemRow): DrillOption[] {
  const leaders = pool.filter((p) => p.kind === "leader-word");
  const seen = new Set([correct.display]);
  const options: DrillOption[] = [];

  const leaderless = [...correct.display].slice(1).join("");
  if (leaderless && !seen.has(leaderless)) {
    options.push({ value: leaderless, label: leaderless });
    seen.add(leaderless);
  }

  const others = leaders.filter((p) => p.id !== correct.id && p.display && !seen.has(p.display));
  for (const candidate of pick(others, others.length)) {
    if (options.length >= 3) break;
    if (seen.has(candidate.display)) continue;
    seen.add(candidate.display);
    options.push({ value: candidate.display, label: candidate.display });
  }
  return options;
}

// M14/A4: Thai-digit VALUE distractors (0-9), biased toward the curated
// DIGIT_CONFUSABLE_GROUPS, falling back to the remaining digits — same shape
// as finalSoundDistractors' FINAL_GROUPS fallback.
function digitValueDistractors(correctValue: number): number[] {
  const preferred = (DIGIT_CONFUSABLE_GROUPS[correctValue] ?? []).filter((v) => v !== correctValue);
  const rest = ALL_DIGITS.filter((v) => v !== correctValue && !preferred.includes(v));
  const chosen: number[] = [];
  for (const v of [...pick(preferred, preferred.length), ...pick(rest, rest.length)]) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(v)) chosen.push(v);
  }
  return chosen;
}

// M14/A4: renders digitValueDistractors as Thai-numeral-glyph options (for
// value-numeral / audio-numeral, whose options are numeral glyphs rather
// than Arabic digit strings) — looked up from the unit-13 pool by value.
function numeralGlyphDistractors(pool: ItemRow[], correctValue: number): DrillOption[] {
  const byValue = new Map(
    pool.filter((p) => p.kind === "numeral").map((p) => [metadataOf(p).value as number, p]),
  );
  const options: DrillOption[] = [];
  for (const v of digitValueDistractors(correctValue)) {
    const item = byValue.get(v);
    if (item) options.push({ value: item.display, label: item.display });
  }
  return options;
}

// M13/A3: word-ipa distractors — each mutates exactly one dimension of the
// correct full IPA (tone / vowel length / final), falling back to other
// words' full IPA from the pool when a word doesn't have enough single-
// dimension mutations available (e.g. an open-syllable word has no final to
// mutate; a word already at its shortest phonetic length has no "ː" to drop).
function ipaDistractors(item: ItemRow, pool: ItemRow[]): DrillOption[] {
  const meta = metadataOf(item);
  const correct = item.initialIpa;
  if (!correct) return [];

  const candidates = new Set<string>();
  for (const t of TONE_ORDER) {
    const mutated = retoneIpa(correct, t);
    if (mutated && mutated !== correct) candidates.add(mutated);
  }
  const lengthMutated = mutateLengthIpa(correct);
  if (lengthMutated && lengthMutated !== correct) candidates.add(lengthMutated);
  const finalSound = meta.finalSound as string | null | undefined;
  if (finalSound) {
    for (const alt of mutateFinalIpa(correct, finalSound)) candidates.add(alt);
  }

  const seen = new Set([correct]);
  const options: DrillOption[] = [];
  for (const c of shuffled([...candidates])) {
    if (seen.has(c)) continue;
    seen.add(c);
    options.push({ value: c, label: c });
    if (options.length >= 3) break;
  }
  if (options.length < 3) {
    const others = pool.filter((p) => p.id !== item.id && p.initialIpa && !seen.has(p.initialIpa));
    for (const candidate of pick(others, others.length)) {
      const value = candidate.initialIpa as string;
      if (seen.has(value)) continue;
      seen.add(value);
      options.push({ value, label: value });
      if (options.length >= 3) break;
    }
  }
  return options;
}

// M13/A2: builds the branching `tone-assembly` steps for one word, per the
// research doc's own flowchart (§6): class -> mark present? -> [marked:
// mark+class tone] / [unmarked: live/dead -> (dead:) vowel length -> tone].
// Returns null if the item's metadata can't support a full branch (defensive
// — buildSubjectPool/canDrillTypeScore already gate on asmEligible+tone+
// initialClass, so this should not happen for a real subject).
function buildToneAssemblySteps(meta: Record<string, unknown>): DrillStep[] | null {
  const cls = meta.initialClass as string | null | undefined;
  const tone = meta.tone as string | null | undefined;
  const toneMark = meta.toneMark as string | null | undefined;
  const live = meta.live as string | null | undefined;
  const vowelLength = meta.vowelLength as string | null | undefined;
  if (!cls || !tone) return null;

  const toneStep = (key: string): DrillStep => ({
    key,
    prompt: "What tone results?",
    correct: tone,
    options: shuffled(TONE_ORDER.map((t) => ({ value: t, label: TONE_LABELS[t] }))),
  });

  const steps: DrillStep[] = [
    {
      key: "class",
      prompt: "What class is the initial consonant?",
      correct: cls,
      options: shuffled((["mid", "high", "low"] as const).map((c) => ({ value: c, label: c }))),
    },
    {
      key: "markPresent",
      prompt: "Is there a tone mark written?",
      correct: toneMark ? "yes" : "no",
      options: shuffled([
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ]),
    },
  ];

  if (toneMark) {
    steps.push({ ...toneStep("markTone"), prompt: "Given the mark and class, what tone results?" });
    return steps;
  }

  if (!live) return null;
  steps.push({
    key: "liveDead",
    prompt: "Live or dead syllable?",
    correct: live,
    options: shuffled([
      { value: "live", label: "Live" },
      { value: "dead", label: "Dead" },
    ]),
  });

  if (live === "live") {
    steps.push(toneStep("tone"));
    return steps;
  }

  // live === "dead" here. Per the research doc (§6: "④ Dead: how long is the
  // vowel? (length only matters for the Low class)" — worked example: "Mid +
  // dead → low (for Mid class, length makes no difference)") and
  // lib/thai/tone.ts's own TONE_GRID_ROWS (Mid/High resolve to `low` for BOTH
  // "dead, short" and "dead, long"), the vowel-length step is only meaningful
  // for the Low class — Mid/High class dead syllables go straight from
  // live/dead to the tone step. Review round-1 HIGH fix: this step was
  // previously asked unconditionally, teaching an incorrect mental model for
  // the 20/100 word-bank rows that are unmarked+dead+mid/high class.
  if (cls === "low") {
    if (!vowelLength) return null;
    steps.push({
      key: "vowelLength",
      prompt: "Short or long vowel?",
      correct: vowelLength,
      options: shuffled([
        { value: "short", label: "Short" },
        { value: "long", label: "Long" },
      ]),
    });
  }
  steps.push(toneStep("tone"));
  return steps;
}

function buildQuestion(subject: Subject, drillType: DrillType, pool: ItemRow[]): DrillQuestion | null {
  const item = subject.item;
  const meta = metadataOf(item);
  const correct = expectedAnswerFor(item, drillType);
  if (correct === null) return null;
  const audioUrl = item.audioUrl ?? undefined;

  if (drillType === "letter-sound") {
    const distractors = consonantDistractors(pool, item, "initialIpa");
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "consonant",
      audioUrl,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "letter-class") {
    const allClasses = ["mid", "high", "low"];
    const distractors = allClasses
      .filter((c) => c !== correct)
      .map((c) => ({ value: c, label: c }));
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "consonant",
      audioUrl,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "letter-final") {
    const distractors = finalSoundDistractors(correct);
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "consonant",
      audioUrl,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "word-final") {
    const distractors = finalSoundDistractors(correct);
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "syllable",
      gloss: meta.gloss as string,
      audioUrl,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "form-sound") {
    // Forward direction only — prompt is the Thai vowel form, options are IPA
    // sounds. See expectedAnswerFor's comment for why bidirectionality was
    // dropped (M11 review round 2, HIGH fix).
    const distractors = vowelDistractors(pool, item, false);
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "vowel",
      audioUrl,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "audio-letter") {
    if (!audioUrl) return null;
    const distractors = consonantDistractors(pool, item, "display");
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: "",
      promptKind: "audio",
      audioUrl,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "audio-form") {
    if (!audioUrl) return null;
    const distractors = vowelDistractors(pool, item, true);
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: "",
      promptKind: "audio",
      audioUrl,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "audio-tone") {
    if (!audioUrl) return null;
    const distractors = toneDistractors(correct);
    if (distractors.length < 4) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: "",
      promptKind: "audio",
      audioUrl,
      correct,
      options: shuffled([
        { value: correct, label: TONE_LABELS[correct as Tone] },
        ...distractors,
      ]),
    };
  }

  if (drillType === "audio-word") {
    if (!audioUrl) return null;
    const distractors = wordDistractors(pool, item);
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: "",
      promptKind: "audio",
      gloss: meta.gloss as string,
      audioUrl,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "word-ipa") {
    const distractors = ipaDistractors(item, pool);
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "syllable",
      gloss: meta.gloss as string,
      audioUrl,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "mark-tone") {
    const distractors = toneDistractors(correct);
    if (distractors.length < 4) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "syllable",
      gloss: meta.gloss as string,
      audioUrl,
      correct,
      options: shuffled([
        { value: correct, label: TONE_LABELS[correct as Tone] },
        ...distractors,
      ]),
    };
  }

  if (drillType === "tone-assembly") {
    const steps = buildToneAssemblySteps(meta);
    if (!steps) return null;
    const finalStep = steps[steps.length - 1];
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "syllable",
      gloss: meta.gloss as string,
      audioUrl,
      correct: finalStep.correct,
      options: finalStep.options,
      steps,
    };
  }

  // M14/A3: sign-function — glyph shown big (promptKind "consonant" reuses
  // the same single-glyph font-thai-5xl styling as a letter), 4 options =
  // the four function labels.
  if (drillType === "sign-function") {
    const distractors = signFunctionDistractors(pool, item);
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "consonant",
      correct,
      options: shuffled([{ value: correct, label: meta.functionLabel as string }, ...distractors]),
    };
  }

  // M14/A3: leader-tone — 5-way MC over every tone (toneDistractors already
  // returns all 4 OTHER tones, so combined with `correct` every one of the
  // five tones is an option — this structurally guarantees the "tone the
  // word would have WITHOUT the leader" adversarial distractor A3 asks for
  // is always present, since there is nowhere else for it to hide among 5
  // total tones). Reveal shows the derivation string + gloss (A3) via the
  // `gloss` field.
  if (drillType === "leader-tone") {
    const distractors = toneDistractors(correct);
    if (distractors.length < 4) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "syllable",
      gloss: `${meta.gloss as string} — ${meta.derivation as string}`,
      correct,
      options: shuffled([
        { value: correct, label: TONE_LABELS[correct as Tone] },
        ...distractors,
      ]),
    };
  }

  // M14/A3: audio-leader — hear the clip, pick the spelling; degrades
  // gracefully (returns null, sampling nothing) until the clip lands (A2/A4
  // contract).
  if (drillType === "audio-leader") {
    if (!audioUrl) return null;
    const distractors = leaderSpellingDistractors(pool, item);
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: "",
      promptKind: "audio",
      gloss: meta.gloss as string,
      audioUrl,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  // M14/A4: numeral-value — Thai numeral glyph shown big, options = Arabic
  // digit strings.
  if (drillType === "numeral-value") {
    const value = meta.value as number;
    const distractors = digitValueDistractors(value).map((v) => ({ value: String(v), label: String(v) }));
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "consonant",
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  // M14/A4: value-numeral — Arabic digit shown, options = Thai numeral
  // glyphs.
  if (drillType === "value-numeral") {
    const value = meta.value as number;
    const distractors = numeralGlyphDistractors(pool, value);
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: String(value),
      // "vowel" is reused purely for its styling bucket (mono font, not
      // font-thai) — the prompt is a bare Arabic digit string, not a vowel.
      promptKind: "vowel",
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  // M14/A4: audio-numeral — hear the spoken digit name, pick the numeral
  // glyph; degrades gracefully until the clip lands.
  if (drillType === "audio-numeral") {
    if (!audioUrl) return null;
    const value = meta.value as number;
    const distractors = numeralGlyphDistractors(pool, value);
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: "",
      promptKind: "audio",
      audioUrl,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  // M14/A5: phrase-split — not MC; the widget itself is the question. Carries
  // `phrase` (chars + syllables) for components/thai/drill/
  // phrase-split-question.tsx to render; `options` is unused (empty) for
  // this drill type.
  if (drillType === "phrase-split") {
    const boundaries = meta.boundaries as number[] | undefined;
    const syllables = meta.syllables as { thai: string; ipa: string; gloss: string }[] | undefined;
    if (!boundaries?.length || !syllables?.length) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "syllable",
      gloss: meta.gloss as string,
      correct,
      options: [],
      phrase: { chars: [...item.display], syllables },
    };
  }

  return null;
}

export async function buildDrillRound(learnerId: string, unit: number): Promise<DrillRound> {
  const subjects = await buildSubjectPool(unit);
  if (!subjects.length) return { unit, questions: [] };

  const itemIds = subjects.map((s) => s.item.id);
  const progress = await getProgressByItemIds(learnerId, itemIds);
  const now = Date.now();

  // STRICT per-item mastery (A1, owner-approved 2026-07-03): an item is only
  // "mastered" for sampling-weight purposes when EVERY drill type it is
  // structurally reachable through (allReachableDrillTypesForItem — the full
  // cross-unit set, e.g. a consonant's letter-sound + letter-class +
  // audio-letter + letter-final) has its own 3-streak. This is deliberately
  // computed from the static seed content, not gated on whether audioUrl
  // currently exists, so an item can never look "done" purely because an
  // audio drill type hasn't shipped audio yet.
  const scored: { value: Subject; weight: number }[] = subjects.map((s) => {
    const rows = progress.get(s.item.id) ?? [];
    const masteredSet = new Set(rows.filter((r) => r.masteredAt != null).map((r) => r.drillType));
    const required = allReachableDrillTypesForItem(s.item.id, ALL_THAI_ITEMS);
    const fullyMastered =
      required.length > 0 && required.every((dt) => isRequiredTypeMastered(masteredSet, dt));
    const lastSeenMs = rows.reduce(
      (max, r) => Math.max(max, r.lastSeen ? r.lastSeen.getTime() : 0),
      0,
    );
    const ageMs = now - lastSeenMs;
    const ageBonus = Math.min(ageMs / (24 * 60 * 60 * 1000), 14); // cap at 14 "days"
    const weight = (fullyMastered ? 0.3 : 1.5) + ageBonus * 0.15 + 0.05;
    return { value: s, weight };
  });

  const pool = subjects.map((s) => s.item);
  const questions: DrillQuestion[] = [];
  let previous: Subject | null = null;

  let guard = 0;
  while (questions.length < DRILL_ROUND_SIZE && guard < DRILL_ROUND_SIZE * 8) {
    guard++;
    const subject: Subject = weightedPick<Subject>(
      scored,
      previous,
      (a, b) => a.item.id === b.item.id,
    );
    const drillType = subject.drillTypes[Math.floor(Math.random() * subject.drillTypes.length)];
    const question = buildQuestion(subject, drillType, pool);
    if (!question) continue;
    questions.push(question);
    previous = subject;
  }

  return { unit, questions };
}
