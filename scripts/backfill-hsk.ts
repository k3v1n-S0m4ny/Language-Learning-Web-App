/**
 * Backfills cards.hsk_level from the deck file for Cards already in the DB.
 *
 * seed-db.ts is insert-only (idempotent by headword), so re-running it after adding
 * the hsk_level column updates nothing — the 204 existing Cards would keep a NULL
 * band forever. This script is the update path.
 *
 * It only ever writes cards.hsk_level, matched by headword. It does not insert,
 * delete, or touch words/tags — and above all it never touches review_states or
 * review_logs, so Learner FSRS history is untouched. (Contrast refresh-seed-db.ts,
 * which can delete Cards and cascade into review state.)
 *
 *   npx tsx scripts/backfill-hsk.ts [--dry]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import type { DeckCard } from "./deck-types";
import { resolveLanguage } from "../seed/languages";

const dry = process.argv.includes("--dry");
const lang = resolveLanguage();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const deck = JSON.parse(readFileSync(lang.deckJson, "utf8")) as DeckCard[];
  const hskByHeadword = new Map(
    deck
      .filter((c) => c.hsk !== undefined)
      .map((c) => [c.headword, c.hsk as number]),
  );
  console.log(
    `Deck: ${deck.length} card(s), ${hskByHeadword.size} with an HSK band.`,
  );

  const dbCards = await db
    .select({
      id: schema.cards.id,
      headword: schema.cards.headword,
      hskLevel: schema.cards.hskLevel,
    })
    .from(schema.cards);
  console.log(`DB:   ${dbCards.length} card(s).`);

  let updated = 0;
  let unchanged = 0;
  const missing: string[] = [];

  for (const dbCard of dbCards) {
    const hsk = hskByHeadword.get(dbCard.headword);
    if (hsk === undefined) {
      missing.push(dbCard.headword);
      continue;
    }
    if (dbCard.hskLevel === hsk) {
      unchanged++;
      continue;
    }
    if (!dry) {
      await db
        .update(schema.cards)
        .set({ hskLevel: hsk })
        .where(eq(schema.cards.id, dbCard.id));
    }
    updated++;
  }

  console.log(
    `\n${dry ? "[dry] would update" : "Updated"} ${updated} card(s); ${unchanged} already correct.`,
  );
  if (missing.length) {
    console.log(
      `\n${missing.length} DB card(s) absent from the deck file (left untouched):`,
    );
    for (const h of missing) console.log(`  ${h}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
