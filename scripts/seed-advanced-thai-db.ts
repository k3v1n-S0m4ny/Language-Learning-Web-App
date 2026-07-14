/**
 * Advanced Thai (M16/B3) — idempotent seed of at_themes / at_cards from a
 * reviewed theme JSON.
 *
 *   npx tsx scripts/seed-advanced-thai-db.ts --theme nak-kosana --dry
 *   npx tsx scripts/seed-advanced-thai-db.ts --theme nak-kosana
 *   npx tsx scripts/seed-advanced-thai-db.ts --theme nak-kosana --prune
 *
 * Reads seed/advanced-thai/themes/<slug>.generated.json — the file the extractor
 * writes and THE OWNER THEN EDITS. That editing is exactly why this script leads
 * with assertions rather than trusting its input.
 *
 * THE ASSERTIONS RUN BEFORE THE DATABASE IS TOUCHED, AND ABORT THE WHOLE RUN.
 * Thai word segmentation is the genuinely hard part of this deck and an LLM will
 * get some of it wrong; so will a hand edit. A phrase card whose word chips do
 * not reassemble into the phrase on its own front face is not a card with a small
 * blemish — it is a card that teaches the learner something false about where
 * Thai words begin and end, which is the single skill the card exists to teach.
 * So: check everything, and if anything fails, write nothing. Follows the
 * assertPhraseBoundariesValid precedent in scripts/seed-thai-db.ts.
 *
 * CARD IDS ARE CONTENT-DERIVED, WHICH IS WHAT MAKES RE-SEEDING SAFE.
 * at_review_states.card_id cascades ON DELETE, so if ids were random this
 * script could only refresh a theme by deleting its cards — silently destroying
 * every FSRS interval built up on them. Hashing the card's own identity instead
 * means a re-seed is an UPSERT: fix a gloss or a word split and the review
 * history stays attached, because it is still the same card. Only genuinely
 * different content gets a genuinely different id.
 *
 * Consequently ORPHANS ARE NOT DELETED BY DEFAULT. A card in the DB but no longer
 * in the JSON is reported and left alone unless --prune is passed, because the
 * most likely cause of a card vanishing from the JSON is an editing slip, and the
 * cost of guessing wrong is permanent loss of review history.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray, notInArray, and } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { normalizeForCompare } from "../seed/advanced-thai/split";
import type {
  GrammarPattern,
  PartOfSpeech,
  PatternFunction,
  PhraseEntry,
  PhraseSource,
  Register,
  Theme,
  VocabEntry,
} from "../seed/advanced-thai/types";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const SLUG = arg("theme");
const DRY_RUN = process.argv.includes("--dry");
const PRUNE = process.argv.includes("--prune");

if (!SLUG) {
  console.error(
    "usage: tsx scripts/seed-advanced-thai-db.ts --theme <slug> [--dry] [--prune]",
  );
  process.exit(1);
}

const SOURCE = `seed/advanced-thai/themes/${SLUG}.generated.json`;

// --- The unions, as runtime values -------------------------------------------
// The TypeScript unions in seed/advanced-thai/types.ts vanish at runtime, and the
// JSON being read has never been through the compiler — it came from a model, and
// then from a human editor. These are the only things standing between a typo and
// a card that renders with no colour because its `pos` matched no token.

const PARTS_OF_SPEECH: readonly PartOfSpeech[] = [
  "noun",
  "verb",
  "adj",
  "adv",
  "classifier",
];
const REGISTERS: readonly Register[] = ["formal", "colloquial", "technical"];
const PATTERN_FUNCTIONS: readonly PatternFunction[] = [
  "causative",
  "passive",
  "comparative",
  "topic",
  "connector",
  "reciprocal",
];
const PHRASE_SOURCES: readonly PhraseSource[] = [
  "heading",
  "prose",
  "table",
  "quote",
  "label",
];

// --- Gloss sanity -------------------------------------------------------------

const THAI_CHAR = /[฀-๿]/;

/**
 * A gloss is what the ENGLISH-speaking side of the card says, so it must not be
 * Thai. This looks like a check too obvious to need writing, and it is in the
 * deck precisely because it was not: the first extractor run returned all 29
 * grammar example glosses as the Thai sentence repeated back (the prompt asked
 * for a "gloss" without saying "in English", and the model restated the source).
 * Vocab and phrase glosses were fine, so nothing else caught it — the cards
 * rendered perfectly, with the Thai sentence sitting where its translation
 * belonged. Only a human reading the card would have noticed. Now the seed does.
 */
function assertEnglish(
  value: string,
  where: string,
  problems: string[],
): void {
  if (THAI_CHAR.test(value)) {
    problems.push(`${where}: gloss is in Thai, not English — "${value.slice(0, 50)}"`);
  }
}

// --- Card identity ------------------------------------------------------------

/**
 * A card's stable id: theme, kind, and a hash of the card's OWN identity — the
 * Thai for a vocab or phrase card, the frame for a grammar card. Deliberately NOT
 * a hash of the whole payload: if it were, correcting a gloss would mint a new id
 * and orphan the review history, which is the precise failure this is designed to
 * prevent.
 */
function cardIdFor(kind: "vocab" | "grammar" | "phrase", identity: string): string {
  const hash = createHash("sha1")
    .update(normalizeForCompare(identity))
    .digest("hex")
    .slice(0, 10);
  return `${SLUG}:${kind}:${hash}`;
}

// --- Assertions ---------------------------------------------------------------

function assertThemeValid(theme: Theme): void {
  const problems: string[] = [];

  if (theme.slug !== SLUG) {
    problems.push(`slug mismatch: file says "${theme.slug}", --theme says "${SLUG}"`);
  }
  for (const [field, value] of Object.entries({
    titleThai: theme.titleThai,
    titleEnglish: theme.titleEnglish,
    summary: theme.summary,
  })) {
    if (!value?.trim()) problems.push(`theme.${field} is empty`);
  }

  // --- Phrases: the load-bearing check ---------------------------------------
  theme.phrases.forEach((p: PhraseEntry, i) => {
    const at = `phrase[${i}] "${p.thai}"`;
    if (!p.thai?.trim()) problems.push(`${at}: thai is empty`);
    if (!p.gloss?.trim()) problems.push(`${at}: gloss is empty`);
    else assertEnglish(p.gloss, at, problems);
    if (!PHRASE_SOURCES.includes(p.source)) {
      problems.push(`${at}: source "${p.source}" is not one of ${PHRASE_SOURCES.join("|")}`);
    }
    if (!p.words?.length) {
      problems.push(`${at}: has no words`);
      return;
    }
    for (const w of p.words) {
      if (!w.thai?.trim()) problems.push(`${at}: a word has empty thai`);
      if (!w.gloss?.trim()) problems.push(`${at}: word "${w.thai}" has no gloss`);
      else assertEnglish(w.gloss, `${at} word "${w.thai}"`, problems);
    }

    // The invariant this whole script exists for.
    const rebuilt = normalizeForCompare(p.words.map((w) => w.thai).join(""));
    const expected = normalizeForCompare(p.thai);
    if (rebuilt !== expected) {
      problems.push(
        `${at}: word split does not rebuild the phrase\n` +
          `      words   : ${p.words.map((w) => w.thai).join(" | ")}\n` +
          `      rebuilt : ${rebuilt}\n` +
          `      expected: ${expected}`,
      );
    }
  });

  // --- Vocab ------------------------------------------------------------------
  theme.vocab.forEach((v: VocabEntry, i) => {
    const at = `vocab[${i}] "${v.thai}"`;
    if (!v.thai?.trim()) problems.push(`${at}: thai is empty`);
    if (!v.gloss?.trim()) problems.push(`${at}: gloss is empty`);
    else assertEnglish(v.gloss, at, problems);
    if (v.literal) assertEnglish(v.literal, `${at} literal`, problems);
    if (!PARTS_OF_SPEECH.includes(v.pos)) {
      problems.push(`${at}: pos "${v.pos}" is not one of ${PARTS_OF_SPEECH.join("|")}`);
    }
    if (!REGISTERS.includes(v.register)) {
      problems.push(`${at}: register "${v.register}" is not one of ${REGISTERS.join("|")}`);
    }
    if (!v.morphemes?.length) {
      problems.push(`${at}: has no morphemes (a single-morpheme word needs exactly one)`);
      return;
    }
    for (const m of v.morphemes) {
      if (!["prefix", "root", "suffix"].includes(m.role)) {
        problems.push(`${at}: morpheme "${m.form}" has role "${m.role}"`);
      }
      if (!m.form?.trim() || !m.gloss?.trim()) {
        problems.push(`${at}: morpheme is missing form or gloss`);
      }
    }
    // The morphology strip renders the morphemes as the word's parse, so they must
    // actually spell the word — otherwise the card shows a decomposition of
    // something else.
    const spelled = normalizeForCompare(v.morphemes.map((m) => m.form).join(""));
    if (spelled !== normalizeForCompare(v.thai)) {
      problems.push(
        `${at}: morphemes do not spell the word\n` +
          `      morphemes: ${v.morphemes.map((m) => m.form).join(" + ")}\n` +
          `      spell    : ${spelled}\n` +
          `      expected : ${normalizeForCompare(v.thai)}`,
      );
    }
  });

  // --- Grammar ----------------------------------------------------------------
  theme.grammar.forEach((g: GrammarPattern, i) => {
    const at = `grammar[${i}] "${g.frame}"`;
    if (!g.frame?.trim()) problems.push(`${at}: frame is empty`);
    if (!g.plainEnglish?.trim()) problems.push(`${at}: plainEnglish is empty`);
    else assertEnglish(g.plainEnglish, `${at} plainEnglish`, problems);
    if (!PATTERN_FUNCTIONS.includes(g.fn)) {
      problems.push(`${at}: fn "${g.fn}" is not one of ${PATTERN_FUNCTIONS.join("|")}`);
    }
    if (!g.examples?.length) {
      problems.push(`${at}: has no examples`);
      return;
    }
    g.examples.forEach((ex, j) => {
      if (!ex.gloss?.trim()) problems.push(`${at} example[${j}]: gloss is empty`);
      else assertEnglish(ex.gloss, `${at} example[${j}]`, problems);
      if (!ex.segments?.length) {
        problems.push(`${at} example[${j}]: has no segments`);
        return;
      }
      for (const seg of ex.segments) {
        if (!seg.text?.trim()) {
          problems.push(`${at} example[${j}]: a segment has empty text`);
        }
        // "marker" is the pattern word itself and is never named in the frame as a
        // slot; every OTHER slot must appear in the frame, or the Slot Frame card
        // cannot paint the slot and its realization in one colour — which is the
        // entire design of that card.
        if (seg.slot && seg.slot !== "marker" && !g.frame.includes(seg.slot)) {
          problems.push(
            `${at} example[${j}]: slot "${seg.slot}" does not appear in the frame`,
          );
        }
      }
    });
  });

  // --- Ids must be unique -----------------------------------------------------
  const ids = new Map<string, string>();
  const claim = (id: string, what: string) => {
    const prior = ids.get(id);
    if (prior) problems.push(`duplicate card id ${id}: "${prior}" and "${what}"`);
    else ids.set(id, what);
  };
  theme.vocab.forEach((v) => claim(cardIdFor("vocab", v.thai), v.thai));
  theme.grammar.forEach((g) => claim(cardIdFor("grammar", g.frame), g.frame));
  theme.phrases.forEach((p) => claim(cardIdFor("phrase", p.thai), p.thai));

  if (problems.length > 0) {
    console.error(`\n✗ ${problems.length} problem(s) — THE DATABASE WAS NOT TOUCHED.\n`);
    for (const p of problems) console.error(`  • ${p}`);
    console.error("\nFix the JSON and re-run.");
    process.exit(1);
  }

  console.log(
    `✓ assertions passed: ${theme.phrases.length} phrases, ${theme.vocab.length} vocab, ` +
      `${theme.grammar.length} grammar — every word split rebuilds its phrase, every ` +
      `morpheme set spells its word, every slot is in its frame.`,
  );
}

// --- Seed ---------------------------------------------------------------------

interface CardRow {
  id: string;
  themeId: string;
  kind: string;
  payload: unknown;
  deckOrder: number;
}

function buildCards(theme: Theme): CardRow[] {
  const rows: CardRow[] = [];
  let order = 0;

  // Vocabulary first, then grammar, then the phrases in document order: you meet
  // the words, then the shapes they slot into, then the text itself.
  for (const v of theme.vocab) {
    rows.push({
      id: cardIdFor("vocab", v.thai),
      themeId: theme.slug,
      kind: "vocab",
      payload: v,
      deckOrder: order++,
    });
  }
  for (const g of theme.grammar) {
    rows.push({
      id: cardIdFor("grammar", g.frame),
      themeId: theme.slug,
      kind: "grammar",
      payload: g,
      deckOrder: order++,
    });
  }
  for (const p of theme.phrases) {
    rows.push({
      id: cardIdFor("phrase", p.thai),
      themeId: theme.slug,
      kind: "phrase",
      payload: p,
      deckOrder: order++,
    });
  }

  return rows;
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`No such file: ${SOURCE}`);
    console.error("Run scripts/generate-advanced-thai-deck.ts first, then review the JSON.");
    process.exit(1);
  }

  const theme = JSON.parse(readFileSync(SOURCE, "utf8")) as Theme;

  // Everything above this line is checked; nothing below it runs if a check fails.
  assertThemeValid(theme);

  const cards = buildCards(theme);
  const ids = cards.map((c) => c.id);

  // Which of these cards already carry review history? Worth saying out loud
  // before a re-seed, because it is what the content-derived id is protecting.
  const existing = await db
    .select({ id: schema.atCards.id })
    .from(schema.atCards)
    .where(eq(schema.atCards.themeId, theme.slug));
  const existingIds = new Set(existing.map((r) => r.id));

  const orphans = existing.filter((r) => !ids.includes(r.id)).map((r) => r.id);
  const added = ids.filter((id) => !existingIds.has(id));

  const reviewed = existingIds.size
    ? await db
        .select({ cardId: schema.atReviewStates.cardId })
        .from(schema.atReviewStates)
        .where(inArray(schema.atReviewStates.cardId, [...existingIds]))
    : [];
  const reviewedIds = new Set(reviewed.map((r) => r.cardId));

  console.log(`\ntheme     : ${theme.slug} — ${theme.titleThai} (${theme.titleEnglish})`);
  console.log(`cards     : ${cards.length} (${added.length} new, ${cards.length - added.length} updated)`);
  console.log(`in DB now : ${existingIds.size}`);
  console.log(`with FSRS : ${reviewedIds.size} card(s) already have review history`);

  if (orphans.length > 0) {
    const orphansWithHistory = orphans.filter((id) => reviewedIds.has(id));
    console.log(`\n⚠ ${orphans.length} card(s) are in the DB but NOT in the JSON:`);
    for (const id of orphans.slice(0, 10)) {
      console.log(`    ${id}${reviewedIds.has(id) ? "  (HAS REVIEW HISTORY)" : ""}`);
    }
    if (orphans.length > 10) console.log(`    … and ${orphans.length - 10} more`);
    if (PRUNE) {
      console.log(
        `\n  --prune given: these WILL be deleted, and the ${orphansWithHistory.length} with` +
          " review history will lose it permanently (FK cascade).",
      );
    } else {
      console.log(
        "\n  They are being LEFT ALONE. The likeliest reason a card vanishes from the",
      );
      console.log(
        "  JSON is an editing slip, and deleting it would take its review history with",
      );
      console.log("  it. Pass --prune if you really do mean to remove them.");
    }
  }

  if (DRY_RUN) {
    console.log("\n--- DRY RUN — the database was not written to. ---");
    return;
  }

  await db
    .insert(schema.atThemes)
    .values({
      id: theme.slug,
      titleThai: theme.titleThai,
      titleEnglish: theme.titleEnglish,
      summary: theme.summary,
    })
    .onConflictDoUpdate({
      target: schema.atThemes.id,
      set: {
        titleThai: theme.titleThai,
        titleEnglish: theme.titleEnglish,
        summary: theme.summary,
      },
    });

  // Upsert, never delete-then-insert: the audioUrl column is populated by the
  // audio pipeline (B4), not by this script, so it must survive a re-seed — and
  // so must every at_review_states row hanging off these ids.
  for (const card of cards) {
    await db
      .insert(schema.atCards)
      .values(card)
      .onConflictDoUpdate({
        target: schema.atCards.id,
        set: {
          themeId: card.themeId,
          kind: card.kind,
          payload: card.payload,
          deckOrder: card.deckOrder,
        },
      });
  }

  if (PRUNE && orphans.length > 0) {
    await db
      .delete(schema.atCards)
      .where(
        and(
          eq(schema.atCards.themeId, theme.slug),
          notInArray(schema.atCards.id, ids),
        ),
      );
    console.log(`\nPruned ${orphans.length} orphaned card(s).`);
  }

  const [{ count }] = await sql`
    select count(*)::int as count from at_cards where theme_id = ${theme.slug}
  `;
  console.log(`\n✓ Seeded. at_cards now holds ${count} card(s) for ${theme.slug}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
