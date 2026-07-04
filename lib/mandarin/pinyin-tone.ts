// Pure Pinyin utilities: tone detection from diacritics, and syllable
// tokenization of a (possibly multi-syllable, concatenated) Hanyu Pinyin
// string. No data change — every fact here is DERIVED at render time from
// the citation pinyin already stored on a Card/Word (see lib/review/types.ts,
// confirmed against seed/mandarin/deck.generated.json: wholePinyin is
// space-delimited PER WORD, e.g. "wǒ bù míngbai" — multi-syllable words like
// "míngbai" are concatenated with NO space between their own syllables).
//
// tone-sandhi.ts builds on this to derive the SPOKEN tone sequence.

export type Tone = 0 | 1 | 2 | 3 | 4;

// One accented vowel per tone, for the six pinyin vowel letters. ü folds to
// u for matching/splitting purposes — the umlaut only ever follows n/l/j/q/
// x/y in Mandarin and never creates a genuine ambiguity with plain u for our
// purposes (splitting syllable boundaries + reading the tone mark).
const TONE_VOWELS: Record<string, { base: string; tone: Tone }> = {
  ā: { base: "a", tone: 1 }, á: { base: "a", tone: 2 }, ǎ: { base: "a", tone: 3 }, à: { base: "a", tone: 4 },
  ē: { base: "e", tone: 1 }, é: { base: "e", tone: 2 }, ě: { base: "e", tone: 3 }, è: { base: "e", tone: 4 },
  ī: { base: "i", tone: 1 }, í: { base: "i", tone: 2 }, ǐ: { base: "i", tone: 3 }, ì: { base: "i", tone: 4 },
  ō: { base: "o", tone: 1 }, ó: { base: "o", tone: 2 }, ǒ: { base: "o", tone: 3 }, ò: { base: "o", tone: 4 },
  ū: { base: "u", tone: 1 }, ú: { base: "u", tone: 2 }, ǔ: { base: "u", tone: 3 }, ù: { base: "u", tone: 4 },
  ǖ: { base: "u", tone: 1 }, ǘ: { base: "u", tone: 2 }, ǚ: { base: "u", tone: 3 }, ǜ: { base: "u", tone: 4 },
};

/** The tone (1-4) of a single pinyin syllable, read from its diacritic.
 * Toneless syllables (neutral tone — e.g. "de", "ma", the "bai" in
 * "míngbai") return 0. Only the first marked vowel is inspected: standard
 * pinyin never marks more than one vowel per syllable. */
export function toneOf(syllable: string): Tone {
  for (const ch of syllable) {
    const hit = TONE_VOWELS[ch];
    if (hit) return hit.tone;
  }
  return 0;
}

/** Every diacritic replaced by its base vowel (ü folds to u), 1:1 length- and
 * position-preserving with the input. Used to find syllable boundaries
 * independent of which vowel happens to carry the tone mark. */
export function stripTones(pinyin: string): string {
  let out = "";
  for (const ch of pinyin) {
    out += TONE_VOWELS[ch]?.base ?? ch;
  }
  return out;
}

// Regular consonant initials, longest-first (zh/ch/sh before their single-
// letter prefixes would never collide, but keeping this order is cheap and
// correct either way).
const INITIALS = [
  "zh", "ch", "sh",
  "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s",
];

// Finals that follow a regular consonant initial above, longest-first.
const FINALS = [
  "iang", "iong", "uang",
  "ian", "iao", "uai", "uan", "ing", "ang", "eng", "ong", "ue", "ve",
  "ua", "uo", "ui", "iu", "ie", "ia", "ai", "ei", "ao", "ou", "an", "en", "in", "un", "er",
  "a", "o", "e", "i", "u", "v",
];

// Whole zero-initial syllables (the y/w glide spellings, plus bare-vowel
// finals like "ai"/"an") — these do not compose from INITIALS + FINALS,
// longest-first.
const ZERO_INITIAL = [
  "yang", "ying", "yong", "yuan",
  "yao", "you", "yan", "yin", "yue", "yun", "wai", "wei", "wan", "wen", "wang", "weng",
  "ya", "ye", "yi", "yu", "yo", "wa", "wo", "wu",
  "ang", "eng", "ai", "ei", "ao", "ou", "an", "en", "er",
  "a", "o", "e",
];

// All valid syllable lengths starting at `pos` in a diacritic-stripped
// string, longest-first (used for greedy-first / backtracking matches).
function syllableLensAt(flat: string, pos: number): number[] {
  const rest = flat.slice(pos);
  const lens = new Set<number>();
  for (const initial of INITIALS) {
    if (!rest.startsWith(initial)) continue;
    const afterInitial = rest.slice(initial.length);
    for (const final of FINALS) {
      if (afterInitial.startsWith(final)) lens.add(initial.length + final.length);
    }
  }
  for (const zero of ZERO_INITIAL) {
    if (rest.startsWith(zero)) lens.add(zero.length);
  }
  return [...lens].sort((a, b) => b - a);
}

function removeApostrophes(s: string): { clean: string; breaks: Set<number> } {
  const breaks = new Set<number>();
  let clean = "";
  for (const ch of s) {
    if (ch === "'" || ch === "’") {
      breaks.add(clean.length);
    } else {
      clean += ch;
    }
  }
  return { clean, breaks };
}

// Backtracking segmenter: split `flat` into exactly `count` syllables,
// never letting a syllable span a forced break (apostrophe position).
// Memoized on (position, remaining) — cheap given real words are short.
function segmentExact(
  flat: string,
  breaks: Set<number>,
  count: number,
): number[] | null {
  const memo = new Map<string, number[] | null>();
  function rec(pos: number, remaining: number): number[] | null {
    if (remaining === 0) return pos === flat.length ? [] : null;
    if (pos >= flat.length) return null;
    const key = `${pos}:${remaining}`;
    if (memo.has(key)) return memo.get(key) ?? null;
    let cap = flat.length - pos;
    for (const b of breaks) {
      if (b > pos && b - pos < cap) cap = b - pos;
    }
    let result: number[] | null = null;
    for (const len of syllableLensAt(flat, pos)) {
      if (len > cap) continue;
      const tail = rec(pos + len, remaining - 1);
      if (tail) {
        result = [len, ...tail];
        break;
      }
    }
    memo.set(key, result);
    return result;
  }
  return rec(0, count);
}

// Best-effort fallback when no valid decomposition exists (typo / unusual
// spelling) — splits into `count` roughly-equal pieces, respecting forced
// breaks where convenient, so callers never have to handle a thrown error.
function fallbackEvenSplit(clean: string, breaks: Set<number>, count: number): number[] {
  const boundaries = [...breaks].sort((a, b) => a - b);
  if (boundaries.length === count - 1) {
    const lens: number[] = [];
    let prev = 0;
    for (const b of boundaries) {
      lens.push(b - prev);
      prev = b;
    }
    lens.push(clean.length - prev);
    return lens;
  }
  const base = Math.floor(clean.length / count);
  const lens = new Array<number>(count).fill(base);
  lens[count - 1] += clean.length - base * count;
  return lens;
}

/**
 * Split one word's own citation pinyin field (e.g. "míngbai", "yīngwén",
 * "nǐ") into its ordered syllables, using `expectedCount` (Mandarin is ~
 * always one syllable per hanzi character) to resolve concatenation
 * ambiguity. Tone marks are preserved unchanged (citation spelling).
 */
export function splitWordPinyin(pinyin: string, expectedCount: number): string[] {
  const trimmed = pinyin.trim();
  if (expectedCount <= 1 || !trimmed) return [trimmed];
  const { clean, breaks } = removeApostrophes(trimmed);
  const flat = stripTones(clean);
  const lens = segmentExact(flat, breaks, expectedCount) ?? fallbackEvenSplit(clean, breaks, expectedCount);
  const syllables: string[] = [];
  let pos = 0;
  for (const len of lens) {
    syllables.push(clean.slice(pos, pos + len));
    pos += len;
  }
  return syllables;
}

/**
 * Tokenize a whole-phrase pinyin string (e.g. card.wholePinyin, "wǒ bù
 * míngbai") into ordered syllables. Whitespace delimits WORD chunks (per the
 * confirmed data shape); when `wordSyllableCounts` is supplied and its
 * length matches the chunk count, each chunk is further split using
 * splitWordPinyin. Without that hint, multi-syllable concatenated chunks are
 * greedily split into as many valid syllables as they decompose into
 * (best-effort — prefer passing wordSyllableCounts from the card's word
 * segmentation whenever available, which is what tone-sandhi.ts does).
 */
export function tokenizePhrasePinyin(
  wholePinyin: string,
  wordSyllableCounts?: number[],
): string[] {
  const chunks = wholePinyin.trim().split(/\s+/).filter(Boolean);
  if (wordSyllableCounts && wordSyllableCounts.length === chunks.length) {
    return chunks.flatMap((chunk, i) => splitWordPinyin(chunk, wordSyllableCounts[i]));
  }
  return chunks.flatMap((chunk) => greedySplit(chunk));
}

// No syllable-count hint available: repeatedly consume the longest valid
// syllable match until the chunk is exhausted.
function greedySplit(pinyin: string): string[] {
  const { clean, breaks } = removeApostrophes(pinyin.trim());
  if (!clean) return [];
  const flat = stripTones(clean);
  const syllables: string[] = [];
  let pos = 0;
  while (pos < flat.length) {
    let cap = flat.length - pos;
    for (const b of breaks) {
      if (b > pos && b - pos < cap) cap = b - pos;
    }
    const lens = syllableLensAt(flat, pos).filter((len) => len <= cap);
    const len = lens[0] ?? cap; // fall back to consuming to the next break/end
    syllables.push(clean.slice(pos, pos + len));
    pos += len;
  }
  return syllables;
}
