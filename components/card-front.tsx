"use client";

import type { StudyCard } from "@/lib/review/types";

// The front FACE of the flip card: solid elevated surface floating on the
// ambient mesh (never glass behind script — reading surfaces stay solid).
// Purely presentational; the flip container in review-session.tsx owns the
// click/keyboard reveal gesture so the whole card (not just this face)
// stays a single, correctly-nested interactive region.
export function CardFront({ card }: { card: StudyCard }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[var(--r-xl)] border border-border-base bg-surface p-8 text-center shadow-[var(--glass-shadow)]">
      <span className="absolute left-6 top-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-muted">
        Prompt
      </span>
      <p className="font-hanzi text-[clamp(2.75rem,13vw,4.5rem)] font-medium leading-none text-foreground">
        {card.headword}
      </p>
      <span className="absolute bottom-6 text-xs text-foreground-muted">Tap to reveal</span>
    </div>
  );
}
