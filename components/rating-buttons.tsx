"use client";

import { motion, useReducedMotion } from "motion/react";
import type { IntervalHints, RatingValue } from "@/lib/review/types";

// Solid vivid FSRS rating ramp + glass press (specular sheen via the
// `.rate-press` utility + spring squash via motion, reduced-motion gated).
// Colour signal is preserved from the earthy original; text is always the
// explicit near-black --color-on-earthy — every fill clears 4.5:1 against
// it (verified in globals.css's Phase 1 AA table; "again" was nudged
// slightly from the north-star mock's #E5484D, which measured 4.45:1).
const RATINGS: {
  value: RatingValue;
  label: string;
  hintKey: keyof IntervalHints;
  bg: string;
}[] = [
  { value: 1, label: "Again", hintKey: "again", bg: "bg-[var(--rate-again)]" },
  { value: 2, label: "Hard", hintKey: "hard", bg: "bg-[var(--rate-hard)]" },
  { value: 3, label: "Good", hintKey: "good", bg: "bg-[var(--rate-good)]" },
  { value: 4, label: "Easy", hintKey: "easy", bg: "bg-[var(--rate-easy)]" },
];

// The four FSRS rating controls, each labelled with its next-interval hint.
// Disabled while a submission is pending (guards double-submit).
export function RatingButtons({
  hints,
  pending,
  onRate,
}: {
  hints: IntervalHints;
  pending: boolean;
  onRate: (rating: RatingValue) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="grid w-full max-w-md grid-cols-2 gap-2 animate-slide-up-fade sm:grid-cols-4"
      role="group"
      aria-label="Rate recall"
    >
      {RATINGS.map(({ value, label, hintKey, bg }) => (
        <motion.button
          key={value}
          type="button"
          disabled={pending}
          onClick={() => onRate(value)}
          whileTap={reduceMotion ? undefined : { scale: 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`rate-press flex flex-col items-center gap-0.5 rounded-[var(--r-sm)] px-2 py-3 text-sm font-semibold text-on-earthy shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)] disabled:opacity-40 sm:py-2.5 ${bg}`}
        >
          <span>{label}</span>
          <span className="whitespace-nowrap text-xs font-normal tabular-nums opacity-80">{hints[hintKey]}</span>
        </motion.button>
      ))}
    </div>
  );
}
