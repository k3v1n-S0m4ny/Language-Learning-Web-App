/**
 * One-off maintenance for the 2026-05-23 deck refresh (new "Reborn Chinese System"
 * sheet export). seed-db is insert-only by headword, so it cannot drop entries that
 * left the sheet, nor update an entry whose meaning changed. This script:
 *
 *   1. Deletes cards whose headword is no longer in seed/mandarin/deck.generated.json
 *      (the 41 single-word rows + the tongue-twister). FK cascades remove their words,
 *      card_tags, review_states, and review_logs.
 *   2. Re-syncs cards that are still present but whose generated content drifted from
 *      the DB (here only 只, which moved from a single-word gloss to the classifier
 *      gloss and from the "languages difficulties" tag to "numbers & amounts").
 *      Updated in place so the card id — and the learner's FSRS history — survives.
 *
 * Safe to re-run: deletion is set-based, and the re-sync overwrites to the deck values.
 *
 * Mandarin-only: pinned to seed/mandarin (not SEED_LANG-parameterized). The DB is a
 * single shared library with no per-language column, and this script is destructive
 * (deletes any card whose headword isn't in the selected deck) — do not point it at
 * another language's deck until the DB is split per language.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, notInArray, inArray } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import type { DeckCard } from "./deck-types";

const DECK = path.join("seed", "mandarin", "deck.generated.json");

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const deck = JSON.parse(readFileSync(DECK, "utf8")) as DeckCard[];
  const keep = deck.map((c) => c.headword);
  const deckByHeadword = new Map(deck.map((c) => [c.headword, c]));

  // An empty deck would turn the delete below into "remove every card"; refuse it.
  if (!keep.length) throw new Error(`${DECK} has no cards — aborting.`);

  // 1. Delete cards no longer in the deck (cascades to words/tags/review state).
  const doomed = await db
    .select({ id: schema.cards.id, headword: schema.cards.headword })
    .from(schema.cards)
    .where(notInArray(schema.cards.headword, keep));
  if (doomed.length) {
    await db.delete(schema.cards).where(
      inArray(
        schema.cards.id,
        doomed.map((d) => d.id),
      ),
    );
  }
  console.log(
    `[delete] ${doomed.length} dropped card(s): ${doomed
      .map((d) => d.headword)
      .join(", ")}`,
  );

  // 2. Re-sync cards whose generated content differs from the DB.
  const dbCards = await db
    .select()
    .from(schema.cards)
    .where(inArray(schema.cards.headword, keep));
  const tagRows = await db.select().from(schema.tags);
  const tagIdByName = new Map(tagRows.map((t) => [t.name, t.id]));

  let resynced = 0;
  for (const dbCard of dbCards) {
    const card = deckByHeadword.get(dbCard.headword);
    if (!card) continue;

    const drift =
      dbCard.wholeGloss !== card.wholeGloss ||
      dbCard.wholePinyin !== card.wholePinyin ||
      dbCard.isPhrase !== card.isPhrase ||
      (dbCard.wholeAudioUrl ?? null) !== (card.wholeAudioUrl ?? null);

    const normalizeWords = (ws: { position: number; hanzi: string; gloss: string; pinyin: string; audioUrl?: string | null }[]) =>
      JSON.stringify(
        [...ws]
          .sort((a, b) => a.position - b.position)
          .map((w) => [w.position, w.hanzi, w.gloss, w.pinyin, w.audioUrl ?? null]),
      );
    const dbWords = await db
      .select()
      .from(schema.words)
      .where(eq(schema.words.cardId, dbCard.id));
    const wordDrift = normalizeWords(dbWords) !== normalizeWords(card.words);

    const desiredTagIds = card.tags
      .map((n) => tagIdByName.get(n))
      .filter((id): id is string => Boolean(id))
      .sort();
    const currentTagIds = (
      await db
        .select({ tagId: schema.cardTags.tagId })
        .from(schema.cardTags)
        .where(eq(schema.cardTags.cardId, dbCard.id))
    )
      .map((r) => r.tagId)
      .sort();
    const tagDrift =
      desiredTagIds.length !== currentTagIds.length ||
      desiredTagIds.some((id, i) => id !== currentTagIds[i]);

    if (!drift && !tagDrift && !wordDrift) continue;

    await db
      .update(schema.cards)
      .set({
        isPhrase: card.isPhrase,
        wholeGloss: card.wholeGloss,
        wholePinyin: card.wholePinyin,
        wholeAudioUrl: card.wholeAudioUrl ?? null,
      })
      .where(eq(schema.cards.id, dbCard.id));

    // Rewrite words for this card to match the deck breakdown.
    await db.delete(schema.words).where(eq(schema.words.cardId, dbCard.id));
    if (card.words.length) {
      await db.insert(schema.words).values(
        card.words.map((w) => ({
          cardId: dbCard.id,
          position: w.position,
          hanzi: w.hanzi,
          gloss: w.gloss,
          pinyin: w.pinyin,
          audioUrl: w.audioUrl ?? null,
        })),
      );
    }

    // Reset tag links to the deck's tags.
    await db.delete(schema.cardTags).where(eq(schema.cardTags.cardId, dbCard.id));
    if (desiredTagIds.length) {
      await db
        .insert(schema.cardTags)
        .values(desiredTagIds.map((tagId) => ({ cardId: dbCard.id, tagId })))
        .onConflictDoNothing();
    }

    resynced++;
    console.log(`[resync] ${dbCard.headword} -> ${card.tags.join(", ")}`);
  }

  // 3. Unconditionally backfill deck_order for every card still in the deck.
  //    This is independent of the drift check above — it always runs so that
  //    re-running this script is idempotent and the CSV row order is always
  //    authoritative (M9/A5). Cards deleted in step 1 are already gone.
  const deckIndexByHeadword = new Map(deck.map((c, i) => [c.headword, i]));
  let backfilled = 0;
  for (const dbCard of dbCards) {
    const idx = deckIndexByHeadword.get(dbCard.headword);
    if (idx === undefined) continue;
    await db
      .update(schema.cards)
      .set({ deckOrder: idx })
      .where(eq(schema.cards.id, dbCard.id));
    backfilled++;
  }
  console.log(`[backfill] ${backfilled} card(s) deck_order updated.`);

  console.log(`\nDone. ${doomed.length} deleted, ${resynced} re-synced, ${backfilled} deck_order backfilled.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
