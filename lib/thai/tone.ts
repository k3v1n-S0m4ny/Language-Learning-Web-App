// Shared tone constants for the tone-ear unit (9) and the tone-confusion
// matrix (A5). Order matches the research doc's own tone table (§"the five
// tones, written as vowel accents"): mid, low, falling, high, rising.
import type { Tone } from "@/seed/thai/types";

export const TONE_ORDER: Tone[] = ["mid", "low", "falling", "high", "rising"];

export const TONE_LABELS: Record<Tone, string> = {
  mid: "Mid",
  low: "Low",
  falling: "Falling",
  high: "High",
  rising: "Rising",
};

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
