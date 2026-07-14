/**
 * Applies the HSK 3.0 band of each Card to the deck file.
 *
 * Two inputs, deliberately separate:
 *   - seed/mandarin/hsk30-wordlist.json — the official HSK 3.0 list (11,092 entries,
 *     OCR'ed from the MoE PDF). Gives every Word an authoritative band.
 *   - seed/mandarin/hsk-verdicts.json  — the per-Card adjudication. A Card is not a
 *     Word, and HSK publishes no band for a sentence, so the band of a Card is the
 *     band of its hardest Word, raised when the grammar outruns the vocabulary. That
 *     judgement (and its rationale) is committed rather than recomputed.
 *
 * This script joins the two, re-derives the vocabulary floor from the wordlist, and
 * refuses to write a deck where any Card sits below its own hardest Word — so a bad
 * edit to the verdicts file fails loudly instead of silently mislabelling the deck.
 *
 * Band 7 means the merged "HSK 7-9" advanced band, which HSK does not subdivide;
 * 8 and 9 are never produced.
 *
 *   npx tsx scripts/level-hsk.ts [--check]
 *
 * --check validates and prints the histogram without writing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { DeckCard } from "./deck-types";

const DECK = "seed/mandarin/deck.generated.json";
const WORDLIST = "seed/mandarin/hsk30-wordlist.json";
const VERDICTS = "seed/mandarin/hsk-verdicts.json";

interface Verdict {
  headword: string;
  hsk: number;
  confidence: string;
  rationale: string;
  correctedFrom?: number;
}

const checkOnly = process.argv.includes("--check");

const deck = JSON.parse(readFileSync(DECK, "utf8")) as DeckCard[];
const bands = (
  JSON.parse(readFileSync(WORDLIST, "utf8")) as { words: Record<string, number> }
).words;
const verdicts = (
  JSON.parse(readFileSync(VERDICTS, "utf8")) as { cards: Verdict[] }
).cards;

const verdictByHeadword = new Map(verdicts.map((v) => [v.headword, v]));

const errors: string[] = [];
const histogram = new Map<number, number>();

for (const card of deck) {
  const verdict = verdictByHeadword.get(card.headword);
  if (!verdict) {
    errors.push(`no verdict for "${card.headword}"`);
    continue;
  }
  if (!Number.isInteger(verdict.hsk) || verdict.hsk < 1 || verdict.hsk > 7) {
    errors.push(`"${card.headword}": band ${verdict.hsk} outside 1-7`);
    continue;
  }

  // The vocabulary floor: a Card cannot be easier than the hardest Word it contains.
  const wordBands = card.words
    .map((w) => bands[w.hanzi])
    .filter((b): b is number => b !== undefined);
  const floor = wordBands.length ? Math.max(...wordBands) : 0;
  if (verdict.hsk < floor) {
    errors.push(
      `"${card.headword}": band ${verdict.hsk} is below its hardest word (HSK ${floor})`,
    );
    continue;
  }

  card.hsk = verdict.hsk;
  histogram.set(verdict.hsk, (histogram.get(verdict.hsk) ?? 0) + 1);
}

if (errors.length) {
  console.error(`FAILED — ${errors.length} problem(s), deck not written:\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

const label = (b: number) => (b === 7 ? "HSK 7-9" : `HSK ${b}`);
for (const band of [...histogram.keys()].sort((a, b) => a - b)) {
  console.log(`  ${label(band).padEnd(8)} ${histogram.get(band)}`);
}
const corrected = verdicts.filter((v) => v.correctedFrom !== undefined).length;
console.log(
  `\n${deck.length} card(s) levelled, ${corrected} corrected by the consistency sweep.`,
);

if (checkOnly) {
  console.log("--check: deck not written.");
} else {
  writeFileSync(DECK, JSON.stringify(deck, null, 2), "utf8");
  console.log(`Wrote ${DECK}`);
}
