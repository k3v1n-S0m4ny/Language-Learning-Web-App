// Shared tone constants for the tone-ear unit (9) and the tone-confusion
// matrix (A5). Order matches the research doc's own tone table (§"the five
// tones, written as vowel accents"): mid, low, falling, high, rising.
import type { Tone, ToneMark } from "@/seed/thai/types";

export const TONE_ORDER: Tone[] = ["mid", "low", "falling", "high", "rising"];

export const TONE_LABELS: Record<Tone, string> = {
  mid: "Mid",
  low: "Low",
  falling: "Falling",
  high: "High",
  rising: "Rising",
};

// The four written tone marks (research doc §6 "The four tone marks" table,
// verbatim — glyph shown on the consonant ก, Thai name, IPA reading of the
// name). M13/A2: used by the unit 10 lesson page and the mark-tone drill.
export const TONE_MARK_INFO: Record<
  ToneMark,
  { glyph: string; nameThai: string; nameIpa: string }
> = {
  "mai-ek": { glyph: "◌่", nameThai: "ไม้เอก", nameIpa: "máj ʔèːk̚" },
  "mai-tho": { glyph: "◌้", nameThai: "ไม้โท", nameIpa: "máj tʰōː" },
  "mai-tri": { glyph: "◌๊", nameThai: "ไม้ตรี", nameIpa: "máj trīː" },
  "mai-chattawa": { glyph: "◌๋", nameThai: "ไม้จัตวา", nameIpa: "máj tɕàt̚.tà.wāː" },
};

export const TONE_MARK_ORDER: ToneMark[] = ["mai-ek", "mai-tho", "mai-tri", "mai-chattawa"];

// The tone grid for Standard Thai (research doc §6 "The same rules as a
// grid", verbatim). Rows are the situation; columns are the class; each cell
// is the resulting tone, or null where the doc marks "—" (mai-tri/
// mai-chattawa only ever occur on the Mid class).
export const TONE_GRID_ROWS: {
  situation: string;
  low: Tone | null;
  mid: Tone | null;
  high: Tone | null;
}[] = [
  { situation: "No mark — live", low: "mid", mid: "mid", high: "rising" },
  { situation: "No mark — dead, short vowel", low: "high", mid: "low", high: "low" },
  { situation: "No mark — dead, long vowel", low: "falling", mid: "low", high: "low" },
  { situation: "◌่ ไม้เอก (mai ek)", low: "falling", mid: "low", high: "low" },
  { situation: "◌้ ไม้โท (mai tho)", low: "high", mid: "falling", high: "falling" },
  { situation: "◌๊ ไม้ตรี (mai tri)", low: null, mid: "high", high: null },
  { situation: "◌๋ ไม้จัตวา (mai chattawa)", low: null, mid: "rising", high: null },
];

// Pitch-contour sparkline points for each tone, hand-drawn to approximate the
// research doc's own SVG polylines (§"tone-diacritics" table) at a shared 0-20
// y-range so ToneSparkline can render any tone at any size via a viewBox
// scale. Qualitative shape/direction matches the doc exactly (mid flat, low
// slightly down, falling starts-high-ends-low, high pushes up, rising
// dips-then-rises); the exact coordinates are NOT an affine transform of the
// doc's own numbers (round 2 LOW fix — the prior comment overstated
// precision) — this is cosmetic-only, not a data-correctness concern.
export const TONE_CONTOUR_POINTS: Record<Tone, string> = {
  mid: "0,10 34,10",
  low: "0,14 34,18",
  falling: "0,4 34,18",
  high: "0,4 34,0",
  rising: "0,13 12,18 34,3",
};
