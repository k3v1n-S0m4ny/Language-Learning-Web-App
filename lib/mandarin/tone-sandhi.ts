// Derives SPOKEN tones (tone sandhi) from citation pinyin at render time —
// no data change. Consumed by card-back.tsx (whole-phrase) and word-chip.tsx
// (per-word, sliced from the same phrase-level computation so cross-word
// boundaries resolve correctly — see act-like-a-designer-toasty-yao.md,
// "Tone basis" row).
//
// Rules implemented (deliberately scoped to defensible, deterministic
// renderings — see the ⚠ note in the design spec: cross-word-boundary and
// multi-3rd grouping is genuinely prosody-dependent, so we do not guess
// beyond these two well-established, mechanical rules):
//
// 1. Third-tone sandhi: a 3rd-tone syllable immediately followed by another
//    3rd-tone syllable is spoken as 2nd tone. The check is the LITERAL next
//    syllable — neutral tones are never skipped over, so "zǎoshang hǎo"
//    (3rd, NEUTRAL, 3rd) does NOT falsely sandhi (there is no adjacent pair).
//    For a run of 3+ consecutive 3rd tones this rule naturally shifts every
//    syllable except the last (each still sees the next as 3rd).
//
// 2. 一 (yī, citation tone 1): scoped to a STANDALONE one-syllable "一" word
//    (per the deck's word segmentation) immediately followed by another
//    word's first syllable — yì (4th) before 1st/2nd/3rd/neutral, yí (2nd)
//    before a 4th tone. This is scoped to standalone words (not "一" as a
//    digit inside a multi-character numeral like 十一/一百二十二, which is a
//    single word entry with no following syllable in scope, or where 一
//    conventionally keeps its citation tone) — the standard textbook
//    quantifier case (一点, 一遍, ...), not the harder numeral-reading case.
//
// 3. 不 (bù, citation tone 4): same standalone-word scoping — bú (2nd)
//    before a 4th tone, unchanged otherwise.
//
// ⚠ Known residual-risk case (code review, LOW, intentionally left as-is):
// the rule 2 check above only ever looks at the NEXT syllable's CITATION
// tone. For a word like 一个 ("yí ge" — 个/ge is underlyingly 4th tone but
// is written/spoken NEUTRAL in this common word), citation pinyin alone
// can't recover that underlying 4th tone, so this engine defaults 一 to the
// simplified textbook citation-tone-1 "before non-4th" bucket (yì) rather
// than the historically-correct yí. This is a genuine instance of the
// design spec's own "prosody-dependent, don't guess" carve-out — a richer
// data source (not citation pinyin) would be needed to resolve it properly.
import { splitWordPinyin, stripTones, toneOf, type Tone } from "./pinyin-tone";

export interface SandhiWord {
  hanzi: string;
  pinyin: string;
}

export interface SpokenSyllable {
  /** UNCHANGED citation spelling (tone mark as originally written). */
  pinyin: string;
  /** SPOKEN tone — what to colour, per the locked design decision. */
  tone: Tone;
  /** True when `tone` differs from the citation reading — render the
   * subtle dotted-underline cue on these syllables. */
  sandhi: boolean;
}

function hanziLength(hanzi: string): number {
  return Array.from(hanzi).length;
}

type FlatEntry = { pinyin: string; citationTone: Tone; yiBuTag: "yi" | "bu" | null };

// Shared rule application (both entry points below funnel through here, so
// the sandhi rules themselves are never duplicated).
function applyRules(flat: FlatEntry[]): SpokenSyllable[] {
  return flat.map((entry, i) => {
    const next = flat[i + 1];

    // Rule 1: third-tone sandhi (adjacent pair, literal next syllable).
    if (entry.citationTone === 3 && next?.citationTone === 3) {
      return { pinyin: entry.pinyin, tone: 2, sandhi: true };
    }

    // Rules 2/3: standalone 一/不, based on the immediate next syllable.
    if (entry.yiBuTag && next) {
      const beforeFourth = next.citationTone === 4;
      if (entry.yiBuTag === "yi") {
        const spoken: Tone = beforeFourth ? 2 : 4;
        return { pinyin: entry.pinyin, tone: spoken, sandhi: spoken !== entry.citationTone };
      }
      // "bu": only shifts before a 4th tone; otherwise unchanged.
      if (beforeFourth) {
        return { pinyin: entry.pinyin, tone: 2, sandhi: true };
      }
    }

    return { pinyin: entry.pinyin, tone: entry.citationTone, sandhi: false };
  });
}

/**
 * Compute the spoken-tone sequence for a whole phrase, given its word
 * segmentation (StudyCard["words"], or a single-entry array for a
 * non-phrase card — both shapes already carry {hanzi, pinyin} for every
 * word). Returns one entry per syllable, in phrase order.
 */
export function computeSandhi(words: SandhiWord[]): SpokenSyllable[] {
  const flat: FlatEntry[] = [];

  for (const word of words) {
    const count = hanziLength(word.hanzi);
    const syllables = splitWordPinyin(word.pinyin, count);
    const isStandalone = count === 1 && syllables.length === 1;
    for (const syllable of syllables) {
      const tone = toneOf(syllable);
      let tag: "yi" | "bu" | null = null;
      if (isStandalone) {
        const base = stripTones(syllable);
        if (base === "yi" && tone === 1) tag = "yi";
        else if (base === "bu" && tone === 4) tag = "bu";
      }
      flat.push({ pinyin: syllable, citationTone: tone, yiBuTag: tag });
    }
  }

  return applyRules(flat);
}

/**
 * Slice an already-computed phrase-level result into one array per word (in
 * word order) — exactly what word-chip.tsx needs: each chip's pinyin is a
 * slice of the SAME phrase-level computation, so e.g. 我 renders as spoken
 * tone-2 in the context of "我喜欢喝茶" even though 我 alone is citation
 * tone-3. Takes the flat result as a parameter (rather than recomputing it)
 * so callers who already have `computeSandhi`'s output — e.g. card-back.tsx,
 * which needs both the flat phrase-level colouring AND the per-word slices
 * — don't pay for the computation twice.
 */
export function sliceSandhiByWord(
  flatResult: SpokenSyllable[],
  words: SandhiWord[],
): SpokenSyllable[][] {
  const result: SpokenSyllable[][] = [];
  let pos = 0;
  for (const word of words) {
    const count = hanziLength(word.hanzi);
    result.push(flatResult.slice(pos, pos + count));
    pos += count;
  }
  return result;
}

/**
 * Convenience one-shot version of `sliceSandhiByWord` for callers that only
 * need the per-word slices (not the flat phrase-level result too).
 */
export function computeSandhiByWord(words: SandhiWord[]): SpokenSyllable[][] {
  return sliceSandhiByWord(computeSandhi(words), words);
}

/**
 * Fallback entry point for when real word segmentation isn't available (the
 * seed data confirms `card.words` always has at least one entry, even for a
 * non-phrase card — this path only guards against that invariant ever being
 * violated). Takes an ALREADY-TOKENIZED syllable list (e.g. from
 * lib/mandarin/pinyin-tone's `tokenizePhrasePinyin`, which is whitespace-
 * (word-)boundary-aware) and applies ONLY the third-tone sandhi rule, which
 * is word-boundary-independent. The 一/不 rules are deliberately skipped
 * here: they require knowing which syllable is a STANDALONE one-character
 * word, and without real word segmentation that can't be determined —
 * guessing would risk the exact wrong-boundary garbling this fallback
 * exists to avoid, so 一/不 simply keep their citation tone in this path.
 */
export function computeSandhiFromSyllables(citationSyllables: string[]): SpokenSyllable[] {
  const flat: FlatEntry[] = citationSyllables.map((pinyin) => ({
    pinyin,
    citationTone: toneOf(pinyin),
    yiBuTag: null,
  }));
  return applyRules(flat);
}
