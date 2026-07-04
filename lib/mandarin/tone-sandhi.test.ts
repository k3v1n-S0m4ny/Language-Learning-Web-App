import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenizePhrasePinyin } from "./pinyin-tone";
import {
  computeSandhi,
  computeSandhiByWord,
  computeSandhiFromSyllables,
  sliceSandhiByWord,
} from "./tone-sandhi";

test("你好 — adjacent 3rd-tone pair: 你 sandhis to 2nd, 好 stays 3rd", () => {
  const result = computeSandhi([
    { hanzi: "你", pinyin: "nǐ" },
    { hanzi: "好", pinyin: "hǎo" },
  ]);
  assert.deepEqual(result, [
    { pinyin: "nǐ", tone: 2, sandhi: true },
    { pinyin: "hǎo", tone: 3, sandhi: false },
  ]);
});

test("我喜欢喝茶 — 我 sandhis to 2nd (before 喜's 3rd), 喜 stays 3rd (喜欢's 欢 is neutral, not 3rd)", () => {
  const words = [
    { hanzi: "我", pinyin: "wǒ" },
    { hanzi: "喜欢", pinyin: "xǐhuan" },
    { hanzi: "喝", pinyin: "hē" },
    { hanzi: "茶", pinyin: "chá" },
  ];
  const result = computeSandhi(words);
  assert.deepEqual(result, [
    { pinyin: "wǒ", tone: 2, sandhi: true }, // 我 — sandhi'd (next is 喜, citation 3rd)
    { pinyin: "xǐ", tone: 3, sandhi: false }, // 喜 — NOT sandhi'd (next, 欢/huan, is neutral)
    { pinyin: "huan", tone: 0, sandhi: false }, // 欢 — neutral, unaffected
    { pinyin: "hē", tone: 1, sandhi: false },
    { pinyin: "chá", tone: 2, sandhi: false },
  ]);
});

test("早上好 — neutral tone in the middle prevents a false 3rd-tone sandhi", () => {
  // 早上 (zǎoshang: zǎo 3rd, shang NEUTRAL) 好 (hǎo 3rd). A rule that skipped
  // over the neutral syllable would incorrectly sandhi zǎo; it must not.
  const words = [
    { hanzi: "早上", pinyin: "zǎoshang" },
    { hanzi: "好", pinyin: "hǎo" },
  ];
  const result = computeSandhi(words);
  assert.deepEqual(result, [
    { pinyin: "zǎo", tone: 3, sandhi: false },
    { pinyin: "shang", tone: 0, sandhi: false },
    { pinyin: "hǎo", tone: 3, sandhi: false },
  ]);
});

test("一 sandhi: yī -> yì (4th) before a 1st/2nd/3rd-tone syllable", () => {
  // 一点 "a little" — 一(yī) + 点(diǎn, 3rd) -> spoken yì.
  const result = computeSandhi([
    { hanzi: "一", pinyin: "yī" },
    { hanzi: "点", pinyin: "diǎn" },
  ]);
  assert.deepEqual(result, [
    { pinyin: "yī", tone: 4, sandhi: true },
    { pinyin: "diǎn", tone: 3, sandhi: false },
  ]);
});

test("一 sandhi: yī -> yí (2nd) before a 4th-tone syllable", () => {
  // 一遍 "one time (through)" — matches the real deck's own "yí biàn".
  const result = computeSandhi([
    { hanzi: "一", pinyin: "yī" },
    { hanzi: "遍", pinyin: "biàn" },
  ]);
  assert.deepEqual(result, [
    { pinyin: "yī", tone: 2, sandhi: true },
    { pinyin: "biàn", tone: 4, sandhi: false },
  ]);
});

test("一 does not sandhi when standalone (no following syllable)", () => {
  const result = computeSandhi([{ hanzi: "一", pinyin: "yī" }]);
  assert.deepEqual(result, [{ pinyin: "yī", tone: 1, sandhi: false }]);
});

test("一 inside a multi-character numeral (not a standalone word) is left unchanged", () => {
  // 十一 "eleven" is segmented as ONE word (十一/shíyī) — 一 here is not a
  // standalone word, so the quantifier-sandhi rule is correctly scoped out.
  const result = computeSandhi([{ hanzi: "十一", pinyin: "shíyī" }]);
  assert.deepEqual(result, [
    { pinyin: "shí", tone: 2, sandhi: false },
    { pinyin: "yī", tone: 1, sandhi: false },
  ]);
});

test("不 sandhi: bù -> bú (2nd) before a 4th-tone syllable", () => {
  // 不对 "incorrect" — 不(bù) + 对(duì, 4th) -> spoken bú.
  const result = computeSandhi([
    { hanzi: "不", pinyin: "bù" },
    { hanzi: "对", pinyin: "duì" },
  ]);
  assert.deepEqual(result, [
    { pinyin: "bù", tone: 2, sandhi: true },
    { pinyin: "duì", tone: 4, sandhi: false },
  ]);
});

test("不 stays bù (unchanged) before a non-4th-tone syllable", () => {
  // 我不明白 "I don't understand" — real seed/mandarin/deck.generated.json
  // value: 不(bù) + 明白(míngbai, 明=2nd) -> bù is unaffected (matches the
  // deck's own citation, which never rewrites it here).
  const words = [
    { hanzi: "我", pinyin: "wǒ" },
    { hanzi: "不", pinyin: "bù" },
    { hanzi: "明白", pinyin: "míngbai" },
  ];
  const result = computeSandhi(words);
  assert.deepEqual(result, [
    { pinyin: "wǒ", tone: 3, sandhi: false },
    { pinyin: "bù", tone: 4, sandhi: false },
    { pinyin: "míng", tone: 2, sandhi: false },
    { pinyin: "bai", tone: 0, sandhi: false },
  ]);
});

test("computeSandhiByWord slices the phrase-level computation per word (cross-word context preserved)", () => {
  const words = [
    { hanzi: "我", pinyin: "wǒ" },
    { hanzi: "喜欢", pinyin: "xǐhuan" },
    { hanzi: "喝", pinyin: "hē" },
    { hanzi: "茶", pinyin: "chá" },
  ];
  const byWord = computeSandhiByWord(words);
  assert.equal(byWord.length, 4);
  // 我 shows spoken tone-2 IN CONTEXT — sliced, not recomputed standalone
  // (我 alone, with no following syllable, would stay citation tone-3).
  assert.deepEqual(byWord[0], [{ pinyin: "wǒ", tone: 2, sandhi: true }]);
  assert.deepEqual(byWord[1], [
    { pinyin: "xǐ", tone: 3, sandhi: false },
    { pinyin: "huan", tone: 0, sandhi: false },
  ]);
  assert.deepEqual(byWord[2], [{ pinyin: "hē", tone: 1, sandhi: false }]);
  assert.deepEqual(byWord[3], [{ pinyin: "chá", tone: 2, sandhi: false }]);
});

test("我 alone (no phrase context) does NOT sandhi — demonstrates context-dependence", () => {
  const result = computeSandhi([{ hanzi: "我", pinyin: "wǒ" }]);
  assert.deepEqual(result, [{ pinyin: "wǒ", tone: 3, sandhi: false }]);
});

test("sliceSandhiByWord slices an ALREADY-COMPUTED flat result (no recomputation)", () => {
  // Same expectation as the computeSandhiByWord test above, but exercising
  // the lower-level entry point that card-back.tsx uses to avoid calling
  // computeSandhi twice on the same input (code-review LOW fix).
  const words = [
    { hanzi: "我", pinyin: "wǒ" },
    { hanzi: "喜欢", pinyin: "xǐhuan" },
    { hanzi: "喝", pinyin: "hē" },
    { hanzi: "茶", pinyin: "chá" },
  ];
  const flat = computeSandhi(words);
  const byWord = sliceSandhiByWord(flat, words);
  assert.equal(byWord.length, 4);
  assert.deepEqual(byWord[0], [{ pinyin: "wǒ", tone: 2, sandhi: true }]);
  assert.deepEqual(byWord[1], [
    { pinyin: "xǐ", tone: 3, sandhi: false },
    { pinyin: "huan", tone: 0, sandhi: false },
  ]);
});

test("computeSandhiFromSyllables (the empty-card.words fallback path) correctly tokenizes a multi-word phrase via tokenizePhrasePinyin", () => {
  // Regression test for the HIGH code-review finding: card-back.tsx's
  // fallback (when card.words is unexpectedly empty) must whitespace-
  // tokenize card.wholePinyin BEFORE segmenting, not feed the whole
  // multi-word string through the single-word segmenter (which garbled
  // "wǒ xǐhuan hē chá" into ["wǒ ", "xǐh", "uan", " hē", " chá"]).
  const syllables = tokenizePhrasePinyin("wǒ xǐhuan hē chá");
  assert.deepEqual(syllables, ["wǒ", "xǐ", "huan", "hē", "chá"]);

  const result = computeSandhiFromSyllables(syllables);
  assert.deepEqual(result, [
    { pinyin: "wǒ", tone: 2, sandhi: true }, // 3rd-tone sandhi still applies (word-boundary-independent)
    { pinyin: "xǐ", tone: 3, sandhi: false },
    { pinyin: "huan", tone: 0, sandhi: false },
    { pinyin: "hē", tone: 1, sandhi: false },
    { pinyin: "chá", tone: 2, sandhi: false },
  ]);
});

test("computeSandhiFromSyllables does NOT apply 一/不 sandhi (no word-boundary data to scope it safely)", () => {
  // Without real word segmentation we can't tell a standalone 一/不 from one
  // embedded in a longer numeral/word, so this path deliberately leaves
  // both citation tones untouched rather than guessing.
  const result = computeSandhiFromSyllables(["yī", "diǎn"]);
  assert.deepEqual(result, [
    { pinyin: "yī", tone: 1, sandhi: false },
    { pinyin: "diǎn", tone: 3, sandhi: false },
  ]);
});
