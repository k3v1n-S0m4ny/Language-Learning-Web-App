import type { Tone } from "@/seed/thai/types";
import { TONE_CONTOUR_POINTS } from "@/lib/thai/tone";

// Pitch-contour sparkline for a single tone, transcribed from the research
// doc's own tone table (§"tone-diacritics") — see lib/thai/tone.ts. Stroke
// colour reads the glass-native --thai-tone-* tokens directly (Phase 2) —
// AA-verified as a 3:1+ graphical stroke in both themes (see globals.css).
const TONE_STROKE_VAR: Record<Tone, string> = {
  mid: "var(--thai-tone-mid)",
  low: "var(--thai-tone-low)",
  falling: "var(--thai-tone-falling)",
  high: "var(--thai-tone-high)",
  rising: "var(--thai-tone-rising)",
};

export function ToneSparkline({ tone }: { tone: Tone }) {
  return (
    <svg
      width="34"
      height="22"
      viewBox="0 0 34 22"
      role="img"
      aria-label={`${tone} tone pitch contour`}
    >
      <polyline
        points={TONE_CONTOUR_POINTS[tone]}
        fill="none"
        stroke={TONE_STROKE_VAR[tone]}
        strokeWidth="2.4"
      />
    </svg>
  );
}
