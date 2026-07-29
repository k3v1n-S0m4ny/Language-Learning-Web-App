"use client";

import { hskLabel } from "@/lib/review/hsk-gate";
import type { StudyCard } from "@/lib/review/types";

// The front FACE of the flip card: solid elevated surface floating on the
// ambient mesh (never glass behind script — reading surfaces stay solid).
// Purely presentational; the flip container in review-session.tsx owns the
// click/keyboard reveal gesture so the whole card (not just this face)
// stays a single, correctly-nested interactive region.
//
// `direction` is the ladder's doing. A Card climbs from recognising the hanzi to
// PRODUCING it from the English, and a produce step is the same Card asked
// backwards — so only the FRONT flips. The back (card-back.tsx) is untouched in
// both directions, because it was already the full answer rather than merely
// "the other side".
export function CardFront({
  card,
  direction = "recognise",
}: {
  card: StudyCard;
  direction?: "recognise" | "produce";
}) {
  const producing = direction === "produce";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[var(--r-xl)] border border-border-base bg-surface p-8 text-center shadow-[var(--glass-shadow)]">
      <span className="absolute left-6 top-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-muted">
        {producing ? "Say it in Chinese" : "Prompt"}
      </span>
      {/* The band chip is a property of the Card, not of the answer, so it is
          safe in both directions — it says how hard the item is, never what it is. */}
      {card.hskLevel !== null && (
        <span
          title={`${hskLabel(card.hskLevel)} — this phrase's difficulty band`}
          className="glass absolute right-6 top-6 rounded-[var(--r-pill)] px-2 py-0.5 text-xs font-medium text-foreground"
        >
          {hskLabel(card.hskLevel)}
        </span>
      )}
      {producing ? (
        <p className="text-[clamp(1.25rem,5vw,1.75rem)] font-medium leading-snug text-foreground">
          {card.wholeGloss}
        </p>
      ) : (
        <p className="font-hanzi text-[clamp(2.75rem,13vw,4.5rem)] font-medium leading-none text-foreground">
          {card.headword}
        </p>
      )}
      <span className="absolute bottom-6 text-xs text-foreground-muted">Tap to reveal</span>
    </div>
  );
}
