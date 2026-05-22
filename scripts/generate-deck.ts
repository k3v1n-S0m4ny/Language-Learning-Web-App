/**
 * Step 1 of the seed pipeline.
 *
 * Reads seed/reborn-chinese-system.csv (Chinese,English), and for every row uses
 * OpenAI to add what the CSV lacks: whole-headword pinyin, a phrase/word flag, and a
 * word-by-word breakdown (hanzi + gloss + pinyin). The CSV's English is kept as the
 * authoritative whole-phrase gloss. Output: seed/deck.generated.json (review/edit it).
 *
 * Tags (per the deck's two sections):
 *   rows 1-57  -> "languages difficulties"
 *   rows 58+   -> "numbers & amounts"
 *
 * Re-runnable: rows already present in the output are skipped (resume after a crash,
 * or delete the file to regenerate). Set LIMIT=3 to process only the first N rows.
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import OpenAI from "openai";
import type { DeckCard } from "./deck-types";

config({ path: ".env.local" });

const MODEL = process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o";
const SOURCE = path.join("seed", "reborn-chinese-system.csv");
const OUT = path.join("seed", "deck.generated.json");
const TAG_LANGUAGE = "languages difficulties";
const TAG_NUMBERS = "numbers & amounts";
const LANGUAGE_ROW_CUTOFF = 57; // rows 1..57 are the language section
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `You are a Mandarin Chinese teaching assistant. Given a Chinese headword and its English meaning, return JSON describing it for a flashcard:
- wholePinyin: Hanyu Pinyin with tone marks for the entire headword (omit punctuation).
- isPhrase: true if the headword is more than one word (a sentence or multi-word expression), false if it is a single word.
- words: the headword segmented into individual Chinese words, in order. For each word give: hanzi (its characters, no punctuation), gloss (a concise English meaning of that word as used here), pinyin (Hanyu Pinyin with tone marks). For a single-word headword return exactly one entry equal to the whole word. Never output punctuation marks as words.`;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    wholePinyin: { type: "string" },
    isPhrase: { type: "boolean" },
    words: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          hanzi: { type: "string" },
          gloss: { type: "string" },
          pinyin: { type: "string" },
        },
        required: ["hanzi", "gloss", "pinyin"],
      },
    },
  },
  required: ["wholePinyin", "isPhrase", "words"],
} as const;

interface GeneratedFields {
  wholePinyin: string;
  isPhrase: boolean;
  words: { hanzi: string; gloss: string; pinyin: string }[];
}

async function generateCard(
  hanzi: string,
  english: string,
  tag: string,
): Promise<DeckCard> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: JSON.stringify({ chinese: hanzi, english }) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "flashcard", strict: true, schema: responseSchema },
    },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const fields = JSON.parse(raw) as GeneratedFields;

  return {
    headword: hanzi,
    isPhrase: fields.isPhrase,
    wholeGloss: english,
    wholePinyin: fields.wholePinyin,
    tags: [tag],
    words: fields.words.map((w, i) => ({
      position: i,
      hanzi: w.hanzi,
      gloss: w.gloss,
      pinyin: w.pinyin,
    })),
  };
}

async function main() {
  const csv = readFileSync(SOURCE, "utf8");
  const rows = parse(csv, {
    relax_quotes: true,
    skip_empty_lines: true,
  }) as string[][];

  const existing: DeckCard[] = existsSync(OUT)
    ? (JSON.parse(readFileSync(OUT, "utf8")) as DeckCard[])
    : [];
  const byHeadword = new Map(existing.map((c) => [c.headword, c]));

  let processed = 0;
  for (let i = 0; i < rows.length && processed < LIMIT; i++) {
    const [hanziRaw, englishRaw] = rows[i];
    const hanzi = (hanziRaw ?? "").trim();
    const english = (englishRaw ?? "").trim();
    if (!hanzi) continue;

    const tag = i < LANGUAGE_ROW_CUTOFF ? TAG_LANGUAGE : TAG_NUMBERS;

    if (byHeadword.has(hanzi)) {
      console.log(`[skip] ${hanzi} (cached)`);
      processed++;
      continue;
    }

    process.stdout.write(`[gen ] (${i + 1}/${rows.length}) ${hanzi} ... `);
    const card = await generateCard(hanzi, english, tag);
    byHeadword.set(hanzi, card);
    console.log(`${card.isPhrase ? "phrase" : "word"}, ${card.words.length} word(s)`);

    // Persist incrementally so a crash never loses earlier work.
    writeFileSync(OUT, JSON.stringify([...byHeadword.values()], null, 2), "utf8");
    processed++;
  }

  console.log(`\nDone. ${byHeadword.size} cards in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
