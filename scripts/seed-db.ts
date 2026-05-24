/**
 * Step 3 of the seed pipeline.
 *
 * Loads seed/deck.generated.json into Neon: tags, cards, words, and card↔tag links.
 * Idempotent by headword — cards already in the DB are skipped, so re-running after
 * adding rows only inserts the new ones (and never touches per-Learner review state).
 *
 * config() must run before the db client is created so DATABASE_URL is read from
 * .env.local; that's why the client is built here rather than imported from lib/db.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { inArray } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import type { DeckCard } from "./deck-types";

const DECK = path.join("seed", "deck.generated.json");

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const deck = JSON.parse(readFileSync(DECK, "utf8")) as DeckCard[];

  // 1. Tags (tags.name is unique).
  const tagNames = [...new Set(deck.flatMap((c) => c.tags))];
  if (tagNames.length) {
    await db
      .insert(schema.tags)
      .values(tagNames.map((name) => ({ name })))
      .onConflictDoNothing();
  }
  const tagRows = await db.select().from(schema.tags);
  const tagIdByName = new Map(tagRows.map((t) => [t.name, t.id]));

  // 2. Skip cards already seeded (idempotent by headword).
  const headwords = deck.map((c) => c.headword);
  const present = headwords.length
    ? await db
        .select({ headword: schema.cards.headword })
        .from(schema.cards)
        .where(inArray(schema.cards.headword, headwords))
    : [];
  const alreadySeeded = new Set(present.map((r) => r.headword));

  let inserted = 0;
  for (const [index, card] of deck.entries()) {
    if (alreadySeeded.has(card.headword)) continue;

    const [row] = await db
      .insert(schema.cards)
      .values({
        headword: card.headword,
        isPhrase: card.isPhrase,
        wholeGloss: card.wholeGloss,
        wholePinyin: card.wholePinyin,
        wholeAudioUrl: card.wholeAudioUrl ?? null,
        deckOrder: index,
      })
      .returning({ id: schema.cards.id });

    if (card.words.length) {
      await db.insert(schema.words).values(
        card.words.map((w) => ({
          cardId: row.id,
          position: w.position,
          hanzi: w.hanzi,
          gloss: w.gloss,
          pinyin: w.pinyin,
          audioUrl: w.audioUrl ?? null,
        })),
      );
    }

    const tagLinks = card.tags
      .map((name) => tagIdByName.get(name))
      .filter((id): id is string => Boolean(id))
      .map((tagId) => ({ cardId: row.id, tagId }));
    if (tagLinks.length) {
      await db.insert(schema.cardTags).values(tagLinks).onConflictDoNothing();
    }

    inserted++;
    console.log(`[db] ${card.headword}`);
  }

  console.log(
    `\nDone. ${inserted} new card(s) inserted, ${alreadySeeded.size} already present.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
