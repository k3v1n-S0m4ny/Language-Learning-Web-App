/**
 * Step 1 of the seed pipeline.
 *
 * Reads <lang>.sourceCsv (e.g. seed/mandarin/source.csv) (Chinese,English), and for
 * every row uses OpenAI to add what the CSV lacks: whole-headword pinyin, a
 * phrase/word flag, and a word-by-word breakdown (hanzi + gloss + pinyin). The CSV's
 * English is kept as the authoritative whole-phrase gloss. Output: <lang>.deckJson
 * (e.g. seed/mandarin/deck.generated.json — review/edit it).
 *
 * Tags are derived from section-header rows in the CSV. When a row's headword exactly
 * matches a key in lang.sectionTags, currentTag is updated and all subsequent rows
 * carry that tag until the next section header. Rows before any section header fall
 * back to lang.defaultTag. See seed/languages.ts for the Mandarin section tag map.
 *
 * Language is selected via SEED_LANG (defaults to "mandarin" — see seed/languages.ts).
 *
 * Re-runnable: rows already present in the output are skipped (resume after a crash,
 * or delete the file to regenerate). Set LIMIT=3 to process only the first N rows.
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parse } from "csv-parse/sync";
import OpenAI from "openai";
import type { DeckCard } from "./deck-types";
import { resolveLanguage } from "../seed/languages";

config({ path: ".env.local" });

const lang = resolveLanguage();
const MODEL = process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o";
const SOURCE = lang.sourceCsv;
const OUT = lang.deckJson;
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      { role: "system", content: lang.systemPrompt },
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
  let currentTag = lang.defaultTag;
  for (let i = 0; i < rows.length && processed < LIMIT; i++) {
    const [hanziRaw, englishRaw] = rows[i];
    const hanzi = (hanziRaw ?? "").trim();
    const english = (englishRaw ?? "").trim();
    if (!hanzi) continue;

    // Update the running tag whenever a top-level section header is encountered.
    // A header is structure, not vocabulary: it names the section, so it must not
    // itself become a Card. (Before this `continue`, the three original headers fell
    // through and were generated as cards — 数字与数量, 时间与日期 and 金钱 are still
    // in the deck and the DB because generate-deck skips headwords it has cached.)
    if (Object.prototype.hasOwnProperty.call(lang.sectionTags, hanzi)) {
      currentTag = lang.sectionTags[hanzi];
      continue;
    }
    const tag = currentTag;

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
