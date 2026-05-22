"use client";

import type { IntervalHints, RatingValue } from "@/lib/review/types";

const RATINGS: { value: RatingValue; label: string; hintKey: keyof IntervalHints }[] =
  [
    { value: 1, label: "Again", hintKey: "again" },
    { value: 2, label: "Hard", hintKey: "hard" },
    { value: 3, label: "Good", hintKey: "good" },
    { value: 4, label: "Easy", hintKey: "easy" },
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
  return (
    <div className="grid w-full max-w-md grid-cols-4 gap-2">
      {RATINGS.map(({ value, label, hintKey }) => (
        <button
          key={value}
          type="button"
          disabled={pending}
          onClick={() => onRate(value)}
          className="flex flex-col items-center gap-0.5 rounded-lg border border-zinc-300 px-2 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          <span>{label}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {hints[hintKey]}
          </span>
        </button>
      ))}
    </div>
  );
}
