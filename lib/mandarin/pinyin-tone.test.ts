import { test } from "node:test";
import assert from "node:assert/strict";
import { splitWordPinyin, stripTones, toneOf, tokenizePhrasePinyin } from "./pinyin-tone";

test("toneOf reads the tone from a single-vowel diacritic", () => {
  assert.equal(toneOf("nǐ"), 3);
  assert.equal(toneOf("hǎo"), 3);
  assert.equal(toneOf("wǒ"), 3);
  assert.equal(toneOf("chá"), 2);
  assert.equal(toneOf("hē"), 1);
  assert.equal(toneOf("bù"), 4);
  assert.equal(toneOf("yī"), 1);
});

test("toneOf returns 0 (neutral) for a toneless syllable", () => {
  assert.equal(toneOf("ma"), 0);
  assert.equal(toneOf("de"), 0);
  assert.equal(toneOf("bai"), 0); // the neutral second syllable of "míngbai"
});

test("toneOf reads ü diacritics (folds to the u vowel family)", () => {
  assert.equal(toneOf("lǜ"), 4);
  assert.equal(toneOf("nǚ"), 3);
});

test("stripTones removes diacritics 1:1 (ü folds to u), preserving length", () => {
  assert.equal(stripTones("míngbai"), "mingbai");
  assert.equal(stripTones("yīngwén"), "yingwen");
  assert.equal(stripTones("nǚ"), "nu");
  assert.equal(stripTones("nǐ"), "ni");
});

test("splitWordPinyin returns the input unchanged for a single-syllable word", () => {
  assert.deepEqual(splitWordPinyin("nǐ", 1), ["nǐ"]);
  assert.deepEqual(splitWordPinyin("hǎo", 1), ["hǎo"]);
});

test("splitWordPinyin splits a concatenated two-syllable word (regular initial+final)", () => {
  assert.deepEqual(splitWordPinyin("míngbai", 2), ["míng", "bai"]);
  assert.deepEqual(splitWordPinyin("xǐhuan", 2), ["xǐ", "huan"]);
  assert.deepEqual(splitWordPinyin("zǎoshang", 2), ["zǎo", "shang"]);
  assert.deepEqual(splitWordPinyin("xièxie", 2), ["xiè", "xie"]);
});

test("splitWordPinyin splits a zero-initial (y/w glide) concatenation", () => {
  // 英文 yīngwén — real seed/mandarin/deck.generated.json value.
  assert.deepEqual(splitWordPinyin("yīngwén", 2), ["yīng", "wén"]);
});

test("splitWordPinyin respects an apostrophe as a hard syllable boundary", () => {
  // 一百二十二 (5 hanzi) — real seed/mandarin/deck.generated.json value; the
  // apostrophe disambiguates "shí'èr" from a potential "shie-r" misparse.
  assert.deepEqual(splitWordPinyin("yībǎièrshí'èr", 5), [
    "yī", "bǎi", "èr", "shí", "èr",
  ]);
});

test("tokenizePhrasePinyin splits a whole-phrase string into per-word chunks, then syllables", () => {
  // 我不明白 wǒ bù míngbai — real seed/mandarin/deck.generated.json shape:
  // whitespace between words, concatenated within a multi-syllable word.
  assert.deepEqual(
    tokenizePhrasePinyin("wǒ bù míngbai", [1, 1, 2]),
    ["wǒ", "bù", "míng", "bai"],
  );
});

test("tokenizePhrasePinyin falls back to greedy per-chunk splitting without count hints", () => {
  assert.deepEqual(tokenizePhrasePinyin("nǐ hǎo"), ["nǐ", "hǎo"]);
  assert.deepEqual(tokenizePhrasePinyin("wǒ xǐhuan hē chá"), ["wǒ", "xǐ", "huan", "hē", "chá"]);
});
