/**
 * One-off normalizer (re-runnable). For cards whose headword is entirely Chinese
 * number characters (零一二三四五六七八九十百千万亿两 ...), collapse the word-by-word
 * breakdown to a single word equal to the whole number, so numbers are treated as one
 * lexical unit. Non-numeric vocab in the "numbers & amounts" section (数字与数量, 基数,
 * 序数) is left untouched.
 *
 * Mandarin-only: pinned to seed/mandarin (not SEED_LANG-parameterized) because Han
 * numerals are Mandarin-specific; do not run this for other languages' decks.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DeckCard } from "./deck-types";

const DECK = path.join("seed", "mandarin", "deck.generated.json");
const NUMERIC = new Set("零〇一二三四五六七八九十百千万亿兆两".split(""));

function isNumber(headword: string): boolean {
  const chars = [...headword];
  return chars.length > 0 && chars.every((c) => NUMERIC.has(c));
}

const deck = JSON.parse(readFileSync(DECK, "utf8")) as DeckCard[];
let changed = 0;
for (const card of deck) {
  if (!isNumber(card.headword)) continue;
  const collapsed =
    card.words.length !== 1 || card.words[0].hanzi !== card.headword;
  card.isPhrase = false;
  card.words = [
    {
      position: 0,
      hanzi: card.headword,
      gloss: card.wholeGloss,
      pinyin: card.wholePinyin,
    },
  ];
  if (collapsed) changed++;
}
writeFileSync(DECK, JSON.stringify(deck, null, 2), "utf8");
console.log(`Normalized ${changed} number card(s) to a single word.`);
