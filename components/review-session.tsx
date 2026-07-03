"use client";

import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
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

// Owns the per-Card interaction state. Keyed by card.id at the call site so
// reveal state resets when the next Card loads. Submitting a rating runs
// the server action inside a transition; while pending we show a
// lightweight "next Card" placeholder instead of leaving the rated Card
// frozen on screen (perceived-instant advance).
//
// Reveal is a 3D spring flip (front -> back) via `motion`, with both faces
// mounted simultaneously (stacked, backface-hidden) inside a perspective
// container. `prefers-reduced-motion` users get an instant swap instead —
// only one face is ever mounted, no 3D transform at all.
export function ReviewSession({
  card,
  hints,
}: {
  card: StudyCard;
  hints: IntervalHints;
}) {
  const [revealed, setRevealed] = useState(false);
  const [pinyinShown, setPinyinShown] = useState(false);
  const [toneColorOn, setToneColorOn] = useState(true);
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    // Play inside the click/keydown handler so it counts as a user gesture.
    // playAudio is a no-op when wholeAudioUrl is null.
    playAudio(card.wholeAudioUrl);
  }

  function rate(rating: RatingValue) {
    startTransition(async () => {
      await submitReview(card.id, rating);
    });
  }

  // The server action + re-render is in flight: advance immediately in the UI.
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

  const backFace = (
    <CardBack
      card={card}
      pinyinShown={pinyinShown}
      onTogglePinyin={() => setPinyinShown((v) => !v)}
      toneColorOn={toneColorOn}
      onToggleToneColor={() => setToneColorOn((v) => !v)}
    />
  );

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 animate-slide-up-fade">
      {/* Tapping/clicking the card is a pointer-only convenience shortcut for
          the SAME action as the "Show answer" button below, which is the
          sole keyboard-focusable control for revealing (no `role`/`tabIndex`
          here — deliberately not a second tab stop for one action). Once
          revealed, the back face's own buttons (audio, chips, pinyin toggle)
          are the interactive surface, so the click handler is removed
          entirely rather than becoming a nested `role="button"` around them
          (which would be invalid ARIA). */}
      <div
        className={`relative aspect-[1/1.12] w-full select-none ${revealed ? "" : "cursor-pointer"}`}
        style={reduceMotion ? undefined : { perspective: 1600 }}
        onClick={revealed ? undefined : reveal}
      >
        {reduceMotion ? (
          revealed ? (
            backFace
          ) : (
            <CardFront card={card} />
          )
        ) : (
          <motion.div
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: revealed ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            {/* Both faces stay mounted throughout the flip (required for the
                3D rotation), so the currently-invisible one is excluded from
                the tab order via `inert` — otherwise a keyboard user could
                Tab into the back face's buttons (pinyin/tone toggles, per-
                word audio + reveal) while it is still rotated away. */}
            <div
              className="absolute inset-0"
              style={{ backfaceVisibility: "hidden" }}
              aria-hidden={revealed}
              inert={revealed}
            >
              <CardFront card={card} />
            </div>
            <div
              className="absolute inset-0"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              aria-hidden={!revealed}
              inert={!revealed}
            >
              {backFace}
            </div>
          </motion.div>
        )}
      </div>

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
