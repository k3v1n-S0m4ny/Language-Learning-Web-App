/**
 * Phase-0 (glass redesign) build step: produce a TINY LXGW WenKai woff2 subset
 * containing only the hanzi the deck actually uses, so the calligraphic Kai face
 * for hanzi ships as a few KB instead of ~25MB.
 *
 * Flow:
 *   1. Read every distinct hanzi character from the PRODUCTION deck (READ-ONLY:
 *      SELECT words.hanzi + cards.headword — no writes, no migration).
 *   2. Union with a small set of common CJK punctuation.
 *   3. Subset scripts/.font-cache/LXGWWenKai-Regular.ttf (gitignored source;
 *      auto-downloaded from the pinned OFL release if missing) down to just those
 *      glyphs via fontTools, emitting app/fonts/lxgw-wenkai-subset.woff2 (committed).
 *
 * Re-run whenever the deck's hanzi set grows: `npx tsx scripts/subset-hanzi-font.ts`.
 * Requires: Python + fonttools + brotli (woff2). config() runs before the db client
 * so DATABASE_URL is read from .env.local (same pattern as the seed scripts).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const FONT_VERSION = "v1.522";
const FONT_URL = `https://github.com/lxgw/LxgwWenKai/releases/download/${FONT_VERSION}/LXGWWenKai-Regular.ttf`;

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const srcTtf = join(here, ".font-cache", "LXGWWenKai-Regular.ttf");
const outWoff2 = join(repoRoot, "app", "fonts", "lxgw-wenkai-subset.woff2");
const charsFile = join(here, ".font-cache", "hanzi-chars.txt");

// Common CJK punctuation that may appear in glosses/headwords rendered in Kai.
const CJK_PUNCTUATION = "、。，！？；：“”‘’（）《》…—·";

async function ensureFont() {
  if (existsSync(srcTtf)) return;
  console.log(`Source TTF missing — downloading LXGW WenKai ${FONT_VERSION}…`);
  mkdirSync(dirname(srcTtf), { recursive: true });
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`Font download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(srcTtf, buf);
  console.log(`  saved ${(buf.length / 1e6).toFixed(1)}MB`);
}

async function collectHanzi(): Promise<Set<string>> {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = (await sql`
    SELECT hanzi AS s FROM words
    UNION ALL
    SELECT headword AS s FROM cards
  `) as { s: string }[];

  const chars = new Set<string>();
  for (const { s } of rows) {
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      // CJK Unified Ideographs (+ Ext A) and compatibility — skip latin/space.
      if (cp >= 0x3400) chars.add(ch);
    }
  }
  for (const ch of CJK_PUNCTUATION) chars.add(ch);
  return chars;
}

async function main() {
  await ensureFont();

  const chars = await collectHanzi();
  if (chars.size === 0) throw new Error("No hanzi found in deck — aborting subset.");
  mkdirSync(dirname(charsFile), { recursive: true });
  writeFileSync(charsFile, [...chars].join(""), "utf8");
  console.log(`Subsetting to ${chars.size} distinct glyphs…`);

  mkdirSync(dirname(outWoff2), { recursive: true });
  execFileSync(
    "python",
    [
      "-m",
      "fontTools.subset",
      srcTtf,
      `--text-file=${charsFile}`,
      "--flavor=woff2",
      `--output-file=${outWoff2}`,
      "--no-hinting",
      "--desubroutinize",
      "--layout-features=locl,ccmp",
    ],
    { stdio: "inherit" },
  );

  const { statSync } = await import("node:fs");
  console.log(`Wrote ${outWoff2} (${(statSync(outWoff2).size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
