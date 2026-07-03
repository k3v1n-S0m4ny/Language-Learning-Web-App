import type { SpokenSyllable } from "@/lib/mandarin/tone-sandhi";
import type { Tone } from "@/lib/mandarin/pinyin-tone";

// Renders an ordered syllable sequence (already SPOKEN-tone-derived by
// lib/mandarin/tone-sandhi) as tone-coloured spans, with a subtle dotted
// underline on sandhi'd syllables (locked design decisions: keep the
// citation mark, recolour to the spoken tone; underline cue on shifts).
// Shared by card-back.tsx (whole phrase) and word-chip.tsx (per-word slice
// of the same phrase-level computation).
const TONE_VAR: Record<Tone, string> = {
  0: "var(--tone-neutral)",
  1: "var(--tone-1)",
  2: "var(--tone-2)",
  3: "var(--tone-3)",
  4: "var(--tone-4)",
};

export function PinyinSyllables({
  syllables,
  toneColorOn,
  className = "",
}: {
  syllables: SpokenSyllable[];
  toneColorOn: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-baseline justify-center gap-x-1.5 ${className}`}>
      {syllables.map((syllable, i) => (
        <span
          key={i}
          style={toneColorOn ? { color: TONE_VAR[syllable.tone] } : undefined}
          className={
            toneColorOn && syllable.sandhi
              ? "underline decoration-dotted decoration-1 underline-offset-4"
              : undefined
          }
          title={
            toneColorOn && syllable.sandhi
              ? "Spoken tone differs from the citation (tone sandhi)"
              : undefined
          }
        >
          {syllable.pinyin}
        </span>
      ))}
    </span>
  );
}
