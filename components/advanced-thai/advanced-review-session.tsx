"use client";

import { useEffect, useState, useTransition } from "react";
import { playAudio } from "@/components/audio-button";
import { RatingButtons } from "@/components/rating-buttons";
import { submitAdvancedReview } from "@/lib/advanced-thai/actions";
import type { AtStudyCard } from "@/lib/advanced-thai/types";
import type { IntervalHints, RatingValue } from "@/lib/review/types";
import { setSessionActive } from "@/lib/ux/session-focus";
import { GrammarSlotFrame } from "./grammar-slot-frame";
import { PhraseSlab } from "./phrase-slab";
import { VocabLexemeSlab } from "./vocab-lexeme-slab";

// Owns the per-card interaction state for Advanced Thai — the counterpart of
// components/review-session.tsx, and it reuses that flow's RatingButtons and its
// FSRS contract unchanged.
//
// The one structural difference is that THE CARD IS NOT ONE SHAPE. Three designs
// won the bake-off and they are genuinely different objects: a vocab card and a
// phrase card flip (there is a question on the front and an answer on the back);
// a grammar card does not (its frame is what the examples must be read against,
// so hiding it would defeat the card). Rather than force a single flip container
// on all three, this dispatches on `card.kind` and lets each design own its own
// reveal — while the session keeps ownership of the things that must stay
// consistent across all three: WHEN the answer is revealed, the audio firing on
// reveal, and the rating.
//
// Keyed by card.id at the call site, so reveal state resets when the next card
// loads.
export function AdvancedReviewSession({
  card,
  hints,
}: {
  card: AtStudyCard;
  hints: IntervalHints;
}) {
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();

  // Recede the bottom nav while a session is on screen; resets on unmount.
  useEffect(() => {
    setSessionActive(true);
    return () => setSessionActive(false);
  }, []);

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    // Played inside the click/keydown handler so it counts as a user gesture.
    // A no-op when audioUrl is null — which is always the case for grammar cards.
    playAudio(card.audioUrl);
  }

  function rate(rating: RatingValue) {
    startTransition(async () => {
      await submitAdvancedReview(card.id, rating);
    });
  }

  // The server action + re-render is in flight: advance immediately in the UI so
  // the rated card does not sit frozen on screen.
  if (pending) {
    return (
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 py-16 animate-fade-in">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-sage border-t-brand"
          aria-hidden
        />
        <p className="text-sm text-foreground-muted">Next card…</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 animate-slide-up-fade">
      {card.kind === "vocab" && (
        <VocabLexemeSlab
          entry={card.payload}
          audioUrl={card.audioUrl}
          revealed={revealed}
          onReveal={reveal}
        />
      )}
      {card.kind === "phrase" && (
        <PhraseSlab
          phrase={card.payload}
          audioUrl={card.audioUrl}
          revealed={revealed}
          onReveal={reveal}
        />
      )}
      {card.kind === "grammar" && (
        <GrammarSlotFrame pattern={card.payload} revealed={revealed} onReveal={reveal} />
      )}

      {!revealed ? (
        <button
          type="button"
          onClick={reveal}
          className="rounded-[var(--r-pill)] px-8 py-3 text-sm font-semibold text-on-earthy shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] transition-transform active:scale-95"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-3))" }}
        >
          Show answer
        </button>
      ) : (
        <RatingButtons hints={hints} pending={pending} onRate={rate} />
      )}
    </div>
  );
}
