import type { Tone } from "@/seed/thai/types";
import { TONE_CONTOUR_POINTS } from "@/lib/thai/tone";

const TONE_STROKE: Record<Tone, string> = {
  mid: "#475569",
  low: "#0369a1",
  falling: "#b91c1c",
  high: "#15803d",
  rising: "#7e22ce",
};

// Pitch-contour sparkline for a single tone, transcribed from the research
// doc's own tone table (§"tone-diacritics") — see lib/thai/tone.ts.
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
        stroke={TONE_STROKE[tone]}
        strokeWidth="2.4"
      />
    </svg>
  );
}
