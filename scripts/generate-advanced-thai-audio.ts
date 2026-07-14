/**
 * Advanced Thai (M16/B4) — audio batch pipeline (paid-gated).
 *
 *   npx tsx scripts/generate-advanced-thai-audio.ts --theme nak-kosana --dry
 *   npx tsx scripts/generate-advanced-thai-audio.ts --theme nak-kosana
 *
 * Reads the seeded at_cards rows, synthesizes one clip per card with the native
 * Thai Google voice th-TH-Neural2-C, uploads to Vercel Blob under
 * audio/advanced-thai/, and writes the URL back into at_cards.audio_url.
 *
 * WHOLE-PHRASE AUDIO ONLY — NO PER-WORD CLIPS. Owner's decision (M16/B4). A
 * phrase card gets one clip of the whole clause; a vocab card gets one clip of
 * the word. The word chips on a phrase card teach segmentation VISUALLY and carry
 * no audio button. (The cost was never the reason — the whole theme is about five
 * cents of TTS either way. The reason is that ~500 extra blobs is real complexity
 * to carry for a per-word "hear it" affordance the owner did not want.)
 *
 * GRAMMAR CARDS GET NO AUDIO, deliberately: a card's headline is an abstract frame
 * ("ทำให้ + N + V") which is not a sayable Thai utterance, and its examples are
 * sentences already drawn from the same text the phrase cards cover.
 *
 * VOICE: th-TH-Neural2-C — the same native Thai voice Read-Thai settled on after
 * the Chirp3-HD voices (Google's GLOBAL multilingual personas) were found to
 * mispronounce and truncate rare Thai items. See the voice history in
 * scripts/generate-thai-audio.ts.
 *
 * BLOB PATHS HASH THE (provider, model, voice, language, text) TUPLE — NOT THE
 * TEXT ALONE. Hashing text alone is a latent bug: change the voice and every path
 * is unchanged, so the pipeline happily "reuses" clips spoken in the OLD voice and
 * the switch silently half-applies. The Mandarin pipeline
 * (scripts/generate-audio.ts) still does this; generate-thai-audio.ts fixed it,
 * and this inherits the fix. A voice change here rehashes every path, so the set
 * regenerates cleanly onto the new voice.
 *
 * Idempotent + resumable: existing blobs are listed once and reused, never
 * re-generated or overwritten.
 *
 * PAID GATE: --dry builds the manifest and prints clip count / total chars / cost
 * WITHOUT calling Google, uploading, or touching the DB.
 */
import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import type { PhraseEntry, VocabEntry } from "../seed/advanced-thai/types";

const OUT_DIR = ".artifacts/advanced-thai-audio";
const MANIFEST_PATH = `${OUT_DIR}/manifest.json`;
const LEDGER_PATH = `${OUT_DIR}/ledger.json`;

const PROVIDER = "google";
const MODEL = "neural2";
const VOICE = "th-TH-Neural2-C";
const LANGUAGE_CODE = "th-TH";
// Neural2 tier is $16/1M chars (Chirp3-HD was $30/1M).
const COST_PER_MILLION_CHARS_USD = 16;

const BLOB_PREFIX = "audio/advanced-thai/";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const SLUG = arg("theme");
const DRY_RUN = process.argv.includes("--dry") || process.env.DRY_RUN === "1";

if (!SLUG) {
  console.error("usage: tsx scripts/generate-advanced-thai-audio.ts --theme <slug> [--dry]");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

interface ClipSpec {
  cardId: string;
  kind: string;
  text: string;
}

function pathFor(text: string): string {
  const hash = createHash("sha256")
    .update(`${PROVIDER}|${MODEL}|${VOICE}|${LANGUAGE_CODE}|${text}`)
    .digest("hex")
    .slice(0, 32);
  return `${BLOB_PREFIX}${hash}.mp3`;
}

async function buildManifest(): Promise<ClipSpec[]> {
  const cards = await db
    .select({
      id: schema.atCards.id,
      kind: schema.atCards.kind,
      payload: schema.atCards.payload,
      deckOrder: schema.atCards.deckOrder,
    })
    .from(schema.atCards)
    .where(eq(schema.atCards.themeId, SLUG!));

  const clips: ClipSpec[] = [];
  for (const card of cards.sort((a, b) => a.deckOrder - b.deckOrder)) {
    let text: string | null = null;

    if (card.kind === "phrase") {
      text = (card.payload as PhraseEntry).thai;
    } else if (card.kind === "vocab") {
      text = (card.payload as VocabEntry).thai;
    }
    // grammar → no clip; see the header note.

    if (!text?.trim()) continue;
    clips.push({ cardId: card.id, kind: card.kind, text: text.trim() });
  }

  return clips;
}

async function synth(text: string, googleKey: string): Promise<Buffer> {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: LANGUAGE_CODE, name: VOICE },
        audioConfig: { audioEncoding: "MP3" },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `Google TTS failed for "${text}": ${res.status} ${(await res.text()).slice(0, 300)}`,
    );
  }
  const { audioContent } = (await res.json()) as { audioContent: string };
  return Buffer.from(audioContent, "base64");
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const clips = await buildManifest();
  if (clips.length === 0) {
    console.error(`No cards found for theme "${SLUG}". Seed it first.`);
    process.exit(1);
  }

  const totalChars = clips.reduce((sum, c) => sum + c.text.length, 0);
  const estCostUsd = (totalChars * COST_PER_MILLION_CHARS_USD) / 1e6;

  // Identical text hashes to one path, so repeats cost nothing. Report the real
  // number of API calls rather than the clip count, or the estimate overstates.
  const uniqueTexts = new Set(clips.map((c) => c.text));
  const byKind: Record<string, number> = {};
  for (const c of clips) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;

  writeFileSync(MANIFEST_PATH, JSON.stringify(clips, null, 2), "utf8");

  console.log(`theme       : ${SLUG}`);
  console.log(`voice       : ${VOICE} (${PROVIDER}/${MODEL})`);
  console.log(`clips       : ${clips.length}  (${Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(", ")})`);
  console.log(`unique texts: ${uniqueTexts.size}  ← the number actually synthesized`);
  console.log(`total chars : ${totalChars}`);
  console.log(
    `EST. COST   : $${estCostUsd.toFixed(4)}  (Google Neural2, $${COST_PER_MILLION_CHARS_USD}/1M chars)`,
  );
  console.log(`manifest    : ${MANIFEST_PATH}`);
  console.log("\nNOTE: whole-phrase + vocab audio only — no per-word clips (owner's call).");

  if (DRY_RUN) {
    console.log("\n[dry-run] no API calls made, no Blob uploads, no DB writes. Nothing spent.");
    return;
  }

  const googleKey = (process.env.GOOGLE_TTS_API_KEY ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!googleKey) throw new Error("GOOGLE_TTS_API_KEY missing");

  const { put, list } = await import("@vercel/blob");

  // Reuse any clip already in the store — idempotent re-runs, never overwrite.
  const existing = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const res = await list({ prefix: BLOB_PREFIX, cursor, limit: 1000 });
    for (const b of res.blobs) existing.set(b.pathname, b.url);
    cursor = res.cursor;
  } while (cursor);
  console.log(`\n[blob] ${existing.size} clip(s) already in the store.`);

  let made = 0;
  let reused = 0;
  const urlByCardId = new Map<string, string>();

  for (const clip of clips) {
    const pathname = pathFor(clip.text);
    let url = existing.get(pathname);
    if (!url) {
      process.stdout.write(`[tts] ${clip.cardId} ("${clip.text.slice(0, 30)}") ... `);
      const buffer = await synth(clip.text, googleKey);
      const blob = await put(pathname, buffer, {
        access: "public",
        contentType: "audio/mpeg",
        addRandomSuffix: false,
      });
      url = blob.url;
      // Cache the just-uploaded blob so a later clip with IDENTICAL text reuses it
      // rather than re-putting the same pathname, which the Blob API rejects.
      existing.set(pathname, url);
      made++;
      console.log("uploaded");
    } else {
      reused++;
    }
    urlByCardId.set(clip.cardId, url);
  }

  for (const [cardId, url] of urlByCardId) {
    await db
      .update(schema.atCards)
      .set({ audioUrl: url })
      .where(eq(schema.atCards.id, cardId));
  }

  let ledger: unknown[] = [];
  try {
    ledger = JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
  } catch {
    // First run — no ledger yet.
  }
  ledger.push({
    ranAt: new Date().toISOString(),
    theme: SLUG,
    provider: PROVIDER,
    model: MODEL,
    voice: VOICE,
    clipCount: clips.length,
    uniqueTexts: uniqueTexts.size,
    totalChars,
    made,
    reused,
    estCostUsd,
  });
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), "utf8");

  console.log(
    `\nDone. ${clips.length} clips (${made} generated, ${reused} reused). ` +
      `at_cards.audio_url updated for ${urlByCardId.size} card(s).`,
  );
  console.log(`Ledger: ${LEDGER_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
