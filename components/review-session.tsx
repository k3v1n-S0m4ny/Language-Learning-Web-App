"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/lib/review/actions";
import type {
  IntervalHints,
  RatingValue,
  StudyCard,
} from "@/lib/review/types";
import { playAudio } from "./audio-button";
import { CardBack } from "./card-back";
import { CardFront } from "./card-front";
import { RatingButtons } from "./rating-buttons";

// Owns the per-Card interaction state. Keyed by card.id at the call site so reveal
// state resets when the next Card loads. Submitting a rating runs the server action
// inside a transition; while pending we show a lightweight "next Card" placeholder
// instead of leaving the rated Card frozen on screen (perceived-instant advance).
export function ReviewSession({
  card,
  hints,
}: {
  card: StudyCard;
  hints: IntervalHints;
}) {
  const [revealed, setRevealed] = useState(false);
  const [pinyinShown, setPinyinShown] = useState(false);
  const [pending, startTransition] = useTransition();

  function rate(rating: RatingValue) {
    startTransition(async () => {
      await submitReview(card.id, rating);
    });
  }

  // The server action + re-render is in flight: advance immediately in the UI.
  if (pending) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center justify-center gap-4 py-16">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-300"
          aria-hidden
        />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Next card…</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      {!revealed ? (
        <CardFront
          card={card}
          onReveal={() => {
            setRevealed(true);
            // Play inside the click-handler so it counts as a user gesture.
            // playAudio is a no-op when wholeAudioUrl is null.
            playAudio(card.wholeAudioUrl);
          }}
        />
      ) : (
        <>
          <CardBack
            card={card}
            pinyinShown={pinyinShown}
            onTogglePinyin={() => setPinyinShown((v) => !v)}
          />
          <RatingButtons hints={hints} pending={pending} onRate={rate} />
        </>
      )}
    </div>
  );
}
