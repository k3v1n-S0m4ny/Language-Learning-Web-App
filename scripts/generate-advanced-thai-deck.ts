/**
 * Advanced Thai (M16/B2) — the theme extractor.
 *
 * Reads one theme's source markdown and writes the deck JSON the owner reviews
 * before anything is seeded:
 *
 *     npx tsx scripts/generate-advanced-thai-deck.ts <source.md> --slug nak-kosana --dry
 *     npx tsx scripts/generate-advanced-thai-deck.ts <source.md> --slug nak-kosana
 *
 * Output: seed/advanced-thai/themes/<slug>.generated.json, shaped exactly like
 * the hand-extracted seed/advanced-thai/themes/nak-kosana.ts — that file is the
 * reference this must imitate.
 *
 * THE SPLIT OF LABOUR IS THE WHOLE DESIGN. Clause boundaries are NOT asked of the
 * model: they are already in the document, marked by its own spaces, and
 * seed/advanced-thai/split.ts reads them off deterministically. The model is
 * asked only for what cannot be derived — the word segmentation INSIDE a clause
 * (the genuinely hard part in a script with no spaces between words), the
 * glosses, the English context label, and the vocabulary and grammar extraction.
 *
 * SELF-CHECKING. Thai word segmentation is exactly where an LLM will quietly get
 * it wrong, so every batch is verified on return: each phrase's
 * words.join("") must reproduce its clause (modulo punctuation and spaces — see
 * normalizeForCompare). A batch that fails is retried once with the failures fed
 * back; anything still failing is written out anyway and flagged loudly, because
 * the seed script (B3) asserts the same invariant and will refuse to touch the
 * database. The owner sees the problem in review, not in production.
 *
 * PAID GATE: --dry prints the plan — clause count, request count, model, and a
 * cost estimate — and calls no API. The real run only happens after the owner
 * approves that estimate. Resumable: an existing output file is loaded and its
 * phrases are skipped, so a crash (or a rate limit) never loses earlier work.
 */
import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import OpenAI from "openai";
import { normalizeForCompare, readClauses, type RawClause } from "../seed/advanced-thai/split";
import type {
  GrammarPattern,
  PhraseEntry,
  Theme,
  VocabEntry,
} from "../seed/advanced-thai/types";

config({ path: ".env.local" });

// Thai word segmentation is the hardest thing asked of the model here, and the
// one thing the deck cannot be right without — so this defaults to a reasoning
// model rather than to the Mandarin pipeline's gpt-4o (scripts/generate-deck.ts).
// Owner's call, M16/B2. Override with OPENAI_CONTENT_MODEL.
const MODEL = process.env.OPENAI_CONTENT_MODEL ?? "gpt-5.4";

// The GPT-5 and o-series reasoning models accept only the default temperature and
// reject `temperature: 0` outright with a 400. gpt-4o both accepts and needs it.
const IS_REASONING_MODEL = /^(gpt-5|o\d)/.test(MODEL);

// List prices for the --dry estimate. Only models whose price is actually KNOWN
// go in here: an unknown model reports "price unknown" rather than quoting a
// made-up number, because a confidently wrong cost estimate is worse than none —
// it is the one number the owner uses to decide whether to approve the spend.
const PRICES: Record<string, { in: number; out: number }> = {
  "gpt-4o": { in: 2.5, out: 10 },
};
const PRICE: { in: number; out: number } | undefined = PRICES[MODEL];

// Clauses per request. Small enough that one bad batch is cheap to retry, large
// enough that the document's context is not re-sent 118 times.
const BATCH_SIZE = 12;

const MAX_VOCAB = Number(process.env.MAX_VOCAB ?? 40);
const MAX_GRAMMAR = Number(process.env.MAX_GRAMMAR ?? 12);

const DRY_RUN = process.argv.includes("--dry") || process.env.DRY_RUN === "1";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const SOURCE = process.argv[2];
const SLUG = arg("slug");

if (!SOURCE || SOURCE.startsWith("--") || !SLUG) {
  console.error(
    "usage: tsx scripts/generate-advanced-thai-deck.ts <source.md> --slug <slug> [--dry]",
  );
  process.exit(1);
}

const OUT = `seed/advanced-thai/themes/${SLUG}.generated.json`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Schemas ----------------------------------------------------------------
// Mirror seed/advanced-thai/types.ts. `strict: true` means the model cannot
// invent a field or omit one; the unions below are enforced by the API itself,
// which is why the seed script's pos/register/fn assertions should never fire on
// generated content — they exist to catch HAND edits.

const PHRASE_BATCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          index: { type: "integer" },
          gloss: { type: "string" },
          context: { type: "string" },
          words: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                thai: { type: "string" },
                gloss: { type: "string" },
              },
              required: ["thai", "gloss"],
            },
          },
        },
        required: ["index", "gloss", "context", "words"],
      },
    },
  },
  required: ["items"],
} as const;

const VOCAB_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    vocab: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          thai: { type: "string" },
          gloss: { type: "string" },
          pos: { type: "string", enum: ["noun", "verb", "adj", "adv", "classifier"] },
          register: { type: "string", enum: ["formal", "colloquial", "technical"] },
          literal: { type: ["string", "null"] },
          morphemes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                form: { type: "string" },
                gloss: { type: "string" },
                role: { type: "string", enum: ["prefix", "root", "suffix"] },
              },
              required: ["form", "gloss", "role"],
            },
          },
        },
        required: ["thai", "gloss", "pos", "register", "literal", "morphemes"],
      },
    },
  },
  required: ["summary", "vocab"],
} as const;

const GRAMMAR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    grammar: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          frame: { type: "string" },
          fn: {
            type: "string",
            enum: [
              "causative",
              "passive",
              "comparative",
              "topic",
              "connector",
              "reciprocal",
            ],
          },
          plainEnglish: { type: "string" },
          examples: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                gloss: { type: "string" },
                segments: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      slot: { type: ["string", "null"] },
                    },
                    required: ["text", "slot"],
                  },
                },
              },
              required: ["segments", "gloss"],
            },
          },
        },
        required: ["frame", "fn", "plainEnglish", "examples"],
      },
    },
  },
  required: ["grammar"],
} as const;

// --- Prompts ----------------------------------------------------------------

const PHRASE_PROMPT = `You are segmenting and glossing Thai clauses for a flashcard deck aimed at an advanced learner.

You are given clauses lifted verbatim from a Thai occupational text, each with the heading it appeared under. For EACH clause return:

- "index": echo the clause's index back, unchanged.
- "words": the clause segmented into WORDS. This is the hard part and the whole point of the card — Thai writes no spaces between words, and learning where they fall is the skill being taught. Rules:
    * Concatenating every word's "thai" MUST reproduce the clause exactly, ignoring punctuation and spaces. Do not drop, add, reorder or re-spell a single character.
    * Punctuation (! ? … ,) is NEVER a word. Leave it out of the words.
    * The repetition mark ๆ belongs to the word it repeats: "ต่าง ๆ" is ONE word, written with its space, not two.
    * Segment into real lexical words, not syllables: "ความสามารถ" is one word, not ความ + สามารถ. "ผู้ว่าจ้าง" is one word.
- "gloss": a natural English translation of the whole clause. Translate what is actually written — do not paraphrase into what a textbook sentence "should" say.
- "context": a SHORT English provenance label for the card's eyebrow, derived from the heading given. Examples of the register wanted: "Step 2 · Market research", "Roles · Production stage", "Opening definition", "Pull-quote · On persuasion", "Section heading". Keep it under about 40 characters.`;

const VOCAB_PROMPT = `You are building the vocabulary cards for an advanced Thai learner, from one occupational text.

First, "summary": translate the text's OWN one-line definition of the occupation — the opening paragraph, before the first section heading — into natural English. Translate what it says; do not summarise the whole document.

Then, choose up to ${MAX_VOCAB} words that are genuinely worth learning from this text — the domain vocabulary and the words whose internal structure teaches something. Skip function words and anything an advanced learner already knows.

Every "thai" MUST appear verbatim in the source text. Do not invent words.

For each word give:
- "pos" and "register" from the allowed values. "technical" is for domain jargon and outright loanwords; "colloquial" is for what someone says when selling, not presenting.
- "morphemes": the word's morpheme-by-morpheme parse. This drives a morphology strip on the card, so it is the reason the card exists. Thai's agent/nominalising prefixes are the richest seam here: นัก- (one whose practice is), ผู้- (the person who), การ- / ความ- (the act / the quality of). A single-morpheme word — a loanword like พรีเซนเตอร์ — correctly gets exactly ONE morpheme; that is not a failure, so do not invent a split for it.
- "literal": the morpheme-by-morpheme reading, ONLY when it differs from what the word actually means (นักโฆษณา parses as "one-who + advertising" but means "advertiser" — worth showing). When the literal parse and the meaning are the same, return null, so the card does not waste a line saying nothing.`;

const GRAMMAR_PROMPT = `You are extracting the grammar patterns an advanced Thai learner should take from one occupational text.

Find up to ${MAX_GRAMMAR} patterns that the text actually USES (not patterns it merely could have used). For each:
- "frame": the abstract shape, e.g. "ทำให้ + N + V". The slot names you use here (N, V, A, B, Clause, Adj, Agent …) MUST be exactly the slot names you use in the examples below — the card paints a slot and its real-world realisation in one colour, and that only works if they match.
- "fn": what the pattern DOES, from the allowed values.
- "plainEnglish": one line, no grammatical metalanguage.
- "examples": REAL sentences from the text, each with:
    * "gloss": a natural ENGLISH translation of that sentence. IN ENGLISH. Do NOT simply repeat the Thai sentence back — the gloss is what an English-speaking learner reads to understand what the Thai says.
    * "segments": the sentence split into ordered segments whose "text" values concatenate back to it exactly.
    * Give the pattern word itself (ทำให้, แข่งกัน, เพื่อ, โดย …) the slot "marker".
    * Give each slot's realisation the slot's own name.
    * Ordinary surrounding context gets slot: null.
  Segments are used instead of character offsets on purpose: Thai stacks vowels and tone marks, so an offset pair is neither hand-authorable nor reviewable.`;

// --- Generation --------------------------------------------------------------

interface BatchItem {
  index: number;
  gloss: string;
  context: string;
  words: { thai: string; gloss: string }[];
}

let inputTokens = 0;
let outputTokens = 0;

async function callJson<T>(
  system: string,
  user: string,
  schema: Record<string, unknown>,
  name: string,
): Promise<T> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    // Reasoning models reject an explicit temperature (400); gpt-4o wants 0 so the
    // segmentation is deterministic across re-runs.
    ...(IS_REASONING_MODEL ? {} : { temperature: 0 }),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name, strict: true, schema },
    },
  });

  inputTokens += completion.usage?.prompt_tokens ?? 0;
  outputTokens += completion.usage?.completion_tokens ?? 0;

  return JSON.parse(completion.choices[0]?.message?.content ?? "{}") as T;
}

/** The clauses in document order, keeping only the FIRST occurrence of each. */
function uniqueByThai(clauses: RawClause[]): RawClause[] {
  const seen = new Set<string>();
  return clauses.filter((c) => {
    if (seen.has(c.thai)) return false;
    seen.add(c.thai);
    return true;
  });
}

/** Which of a batch's returned items have a word split that does not rebuild its clause. */
function badSplits(
  batch: RawClause[],
  offset: number,
  items: BatchItem[],
): { clause: RawClause; item: BatchItem }[] {
  const bad: { clause: RawClause; item: BatchItem }[] = [];
  for (const item of items) {
    const clause = batch[item.index - offset];
    if (!clause) continue;
    const rebuilt = normalizeForCompare(item.words.map((w) => w.thai).join(""));
    if (rebuilt !== normalizeForCompare(clause.thai)) bad.push({ clause, item });
  }
  return bad;
}

async function generatePhrases(clauses: RawClause[], done: Set<string>): Promise<PhraseEntry[]> {
  // A clause that occurs twice in the document is ONE card, not two. เช่น ("for
  // example") appears three times in นักโฆษณา, ที่เหมาะสม twice — and three
  // identical flashcards would be a bug, not thoroughness. Deduplicating here also
  // means the repeats are never sent to the model twice.
  const todo = uniqueByThai(clauses).filter((c) => !done.has(c.thai));
  const out: PhraseEntry[] = [];
  let unresolved = 0;

  for (let start = 0; start < todo.length; start += BATCH_SIZE) {
    const batch = todo.slice(start, start + BATCH_SIZE);
    const payload = batch.map((c, i) => ({
      index: start + i,
      thai: c.thai,
      heading: c.provenance,
    }));

    process.stdout.write(
      `[phrases] ${start + 1}-${start + batch.length} / ${todo.length} ... `,
    );

    let { items } = await callJson<{ items: BatchItem[] }>(
      PHRASE_PROMPT,
      JSON.stringify(payload),
      PHRASE_BATCH_SCHEMA,
      "phrase_batch",
    );

    // Re-ask ONLY for the clauses whose split does not rebuild — feeding the
    // model its own wrong answer is what makes the retry worth making.
    let bad = badSplits(batch, start, items);
    if (bad.length > 0) {
      process.stdout.write(`${bad.length} bad split(s), retrying ... `);
      const retryPayload = bad.map(({ clause, item }) => ({
        index: item.index,
        thai: clause.thai,
        heading: clause.provenance,
        yourPreviousSplit: item.words.map((w) => w.thai),
        problem:
          "Concatenating your words does not reproduce this clause. Re-segment it so it does.",
      }));
      const retry = await callJson<{ items: BatchItem[] }>(
        PHRASE_PROMPT,
        JSON.stringify(retryPayload),
        PHRASE_BATCH_SCHEMA,
        "phrase_batch",
      );
      const fixedByIndex = new Map(retry.items.map((it) => [it.index, it]));
      items = items.map((it) => fixedByIndex.get(it.index) ?? it);
      bad = badSplits(batch, start, items);
    }

    if (bad.length > 0) {
      unresolved += bad.length;
      for (const { clause } of bad) {
        console.log(`\n  ⚠ UNRESOLVED SPLIT: ${clause.thai}`);
      }
    }

    for (const item of items.sort((a, b) => a.index - b.index)) {
      const clause = batch[item.index - start];
      if (!clause) continue;
      out.push({
        thai: clause.thai,
        gloss: item.gloss,
        words: item.words,
        source: clause.source,
        context: item.context,
      });
    }

    console.log(`ok (${out.length} total)`);
  }

  if (unresolved > 0) {
    console.log(
      `\n⚠ ${unresolved} phrase(s) still have a word split that does not rebuild the clause.`,
    );
    console.log(
      "  They ARE written to the JSON so you can see and fix them, but the seed",
    );
    console.log("  script will REFUSE to run until they are correct.");
  }

  return out;
}

// --- Main --------------------------------------------------------------------

async function main() {
  const markdown = readFileSync(SOURCE!, "utf8");
  const clauses = readClauses(markdown);

  // Title and summary come from the document itself, not the model: the first h1
  // is the title (with its English in parentheses) and the first prose paragraph
  // is the text's own one-line definition of the occupation.
  const titleLine = /^#\s+(.*)$/m.exec(markdown)?.[1]?.trim() ?? SLUG!;
  const titleThai = titleLine.replace(/\s*\(.*\)\s*$/, "").trim();
  const titleEnglish = /\(([^)]*)\)/.exec(titleLine)?.[1]?.trim() ?? "";

  if (DRY_RUN) {
    const phraseRequests = Math.ceil(clauses.length / BATCH_SIZE);
    const requests = phraseRequests + 2; // + vocab + grammar
    // Rough: each phrase request re-sends the prompt (~450 tok) plus its batch;
    // output dominates, at roughly 90 tokens per phrase.
    const estIn = requests * 700 + markdown.length / 2;
    const estOut = clauses.length * 90 + MAX_VOCAB * 120 + MAX_GRAMMAR * 220;

    console.log("--- DRY RUN — no API call made, nothing spent ---\n");
    console.log(`source        : ${SOURCE}`);
    console.log(`slug          : ${SLUG}`);
    console.log(`title         : ${titleThai} (${titleEnglish})`);
    console.log(`model         : ${MODEL}`);
    console.log(`clauses       : ${clauses.length}  → ${phraseRequests} phrase request(s)`);
    console.log(`vocab target  : up to ${MAX_VOCAB}   (1 request)`);
    console.log(`grammar target: up to ${MAX_GRAMMAR}   (1 request)`);
    console.log(`total requests: ${requests}`);
    console.log(
      `est. tokens   : ~${Math.round(estIn / 1000)}k in, ~${Math.round(estOut / 1000)}k out`,
    );
    if (PRICE) {
      const estUsd = (estIn / 1e6) * PRICE.in + (estOut / 1e6) * PRICE.out;
      console.log(`EST. COST     : ~$${estUsd.toFixed(2)}  (${MODEL} list price)`);
    } else {
      console.log(
        `EST. COST     : UNKNOWN — no list price on file for "${MODEL}".`,
      );
      console.log(
        "                The token estimate above is real; the dollar figure is not",
      );
      console.log(
        "                quoted rather than guessed. The run prints its ACTUAL token",
      );
      console.log("                usage on completion.");
    }
    console.log(`\noutput would be: ${OUT}`);
    console.log("\nRe-run without --dry to generate.");
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set — refusing to run.");
    process.exit(1);
  }

  // Resume: reuse whatever a previous run already produced.
  const previous: Theme | null = existsSync(OUT)
    ? (JSON.parse(readFileSync(OUT, "utf8")) as Theme)
    : null;
  const donePhrases = previous?.phrases ?? [];
  const done = new Set(donePhrases.map((p) => p.thai));
  if (done.size > 0) {
    console.log(`[resume] ${done.size} phrase(s) already generated — skipping them.\n`);
  }

  const fresh = await generatePhrases(clauses, done);

  // Keep the document's own order rather than "resumed first, new after" — and one
  // entry per DISTINCT clause, so a phrase the document happens to repeat does not
  // become two identical cards.
  const byThai = new Map<string, PhraseEntry>(
    [...donePhrases, ...fresh].map((p) => [p.thai, p]),
  );
  const phrases: PhraseEntry[] = uniqueByThai(clauses)
    .map((c) => byThai.get(c.thai))
    .filter((p): p is PhraseEntry => Boolean(p));

  let vocab: VocabEntry[] = previous?.vocab ?? [];
  let summary = previous?.summary ?? "";
  if (vocab.length === 0) {
    process.stdout.write("[vocab  ] generating ... ");
    const res = await callJson<{
      summary: string;
      vocab: (VocabEntry & { literal: string | null })[];
    }>(VOCAB_PROMPT, markdown, VOCAB_SCHEMA, "vocab");
    summary = res.summary;
    // The schema requires `literal`, so absence is expressed as null. The contract
    // type makes it optional instead — drop the nulls rather than store them.
    vocab = res.vocab.map(({ literal, ...rest }) => ({
      ...rest,
      ...(literal ? { literal } : {}),
    }));
    console.log(`${vocab.length} entries`);
  } else {
    console.log(`[vocab  ] ${vocab.length} already present — skipping.`);
  }

  let grammar: GrammarPattern[] = previous?.grammar ?? [];
  if (grammar.length === 0) {
    process.stdout.write("[grammar] generating ... ");
    const res = await callJson<{
      grammar: (Omit<GrammarPattern, "examples"> & {
        examples: { gloss: string; segments: { text: string; slot: string | null }[] }[];
      })[];
    }>(GRAMMAR_PROMPT, markdown, GRAMMAR_SCHEMA, "grammar");
    grammar = res.grammar.map((p) => ({
      ...p,
      examples: p.examples.map((e) => ({
        gloss: e.gloss,
        segments: e.segments.map(({ text, slot }) => ({
          text,
          ...(slot ? { slot } : {}),
        })),
      })),
    }));
    console.log(`${grammar.length} patterns`);
  } else {
    console.log(`[grammar] ${grammar.length} already present — skipping.`);
  }

  const theme: Theme = {
    slug: SLUG!,
    titleThai,
    titleEnglish,
    summary,
    vocab,
    grammar,
    phrases,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(theme, null, 2), "utf8");

  console.log(`\nWrote ${OUT}`);
  console.log(
    `  ${phrases.length} phrases, ${vocab.length} vocab, ${grammar.length} grammar patterns`,
  );
  const cost = PRICE
    ? ` — ~$${((inputTokens / 1e6) * PRICE.in + (outputTokens / 1e6) * PRICE.out).toFixed(2)}`
    : " (no list price on file for this model — tokens are the honest figure)";
  console.log(
    `  model ${MODEL} — tokens: ${inputTokens} in / ${outputTokens} out${cost}`,
  );
  console.log("\nReview and edit the JSON, then seed it.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
