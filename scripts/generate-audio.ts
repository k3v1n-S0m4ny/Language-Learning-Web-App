/**
 * Step 2 of the seed pipeline.
 *
 * Reads <lang>.deckJson (e.g. seed/mandarin/deck.generated.json) and generates
 * pronunciation audio with OpenAI TTS (gpt-4o-mini-tts, voice Nova) for every UNIQUE
 * spoken text — each whole headword and each word — then uploads the mp3s to the
 * public Vercel Blob store and writes the resulting URLs back into the deck file.
 *
 * Immutable + deduped + resumable: clips are keyed by a hash of their text and stored
 * at a stable path; identical words across cards share one clip; existing blobs are
 * reused (no re-generation, no overwrite). Safe to re-run.
 *
 * Language is selected via SEED_LANG (defaults to "mandarin" — see seed/languages.ts).
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import OpenAI from "openai";
import { put, list } from "@vercel/blob";
import type { DeckCard } from "./deck-types";
import { resolveLanguage } from "../seed/languages";

config({ path: ".env.local" });

const lang = resolveLanguage();
const DECK = lang.deckJson;
const VOICE = "nova";
const MODEL = "gpt-4o-mini-tts";
const INSTRUCTIONS = lang.ttsInstructions;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function pathFor(text: string): string {
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 32);
  return `audio/${hash}.mp3`;
}

async function main() {
  const deck = JSON.parse(readFileSync(DECK, "utf8")) as DeckCard[];

  // Reuse any clips already in the store (idempotent re-runs, no overwrite).
  const existing = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const res = await list({ prefix: "audio/", cursor, limit: 1000 });
    for (const b of res.blobs) existing.set(b.pathname, b.url);
    cursor = res.cursor;
  } while (cursor);

  // Every unique text we need to voice: whole headwords + individual words.
  const texts = new Set<string>();
  for (const card of deck) {
    texts.add(card.headword);
    for (const w of card.words) texts.add(w.hanzi);
  }

  const urlByText = new Map<string, string>();
  let made = 0;
  let reused = 0;
  for (const text of texts) {
    const pathname = pathFor(text);
    const existingUrl = existing.get(pathname);
    if (existingUrl) {
      urlByText.set(text, existingUrl);
      reused++;
      continue;
    }
    process.stdout.write(`[tts] ${text} ... `);
    const speech = await openai.audio.speech.create({
      model: MODEL,
      voice: VOICE,
      input: text,
      instructions: INSTRUCTIONS,
      response_format: "mp3",
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: "audio/mpeg",
      addRandomSuffix: false,
    });
    urlByText.set(text, blob.url);
    made++;
    console.log("uploaded");
  }

  // Write URLs back into the deck.
  for (const card of deck) {
    card.wholeAudioUrl = urlByText.get(card.headword);
    for (const w of card.words) w.audioUrl = urlByText.get(w.hanzi);
  }
  writeFileSync(DECK, JSON.stringify(deck, null, 2), "utf8");

  console.log(
    `\nDone. ${texts.size} unique clips (${made} generated, ${reused} reused). URLs written to ${DECK}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
