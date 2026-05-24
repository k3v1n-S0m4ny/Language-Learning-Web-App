"use client";

import type { IntervalHints, RatingValue } from "@/lib/review/types";

// Duolingo-style colored rating row. Each button's background is drawn from the
// earthy palette; text is always near-black (#1A1A1A / on-earthy) except Good
// which uses white on #1A7A40 (5.38:1 — WCAG AA). See globals.css ratio table.
const RATINGS: {
  value: RatingValue;
  label: string;
  hintKey: keyof IntervalHints;
  bg: string;
  text: string;
}[] = [
  {
    value: 1,
    label: "Again",
    hintKey: "again",
    bg: "bg-clay",
    text: "text-on-earthy",
  },
  {
    value: 2,
    label: "Hard",
    hintKey: "hard",
    bg: "bg-peach",
    text: "text-on-earthy",
  },
  {
    value: 3,
    label: "Good",
    hintKey: "good",
    bg: "bg-success",
    text: "text-white",
  },
  {
    value: 4,
    label: "Easy",
    hintKey: "easy",
    bg: "bg-easy",
    text: "text-on-earthy",
  },
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
      {RATINGS.map(({ value, label, hintKey, bg, text }) => (
        <button
          key={value}
          type="button"
          disabled={pending}
          onClick={() => onRate(value)}
          className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 text-sm font-semibold ${bg} ${text} animate-pop-in active:scale-95 transition-transform disabled:opacity-40`}
        >
          <span>{label}</span>
          <span className={`text-xs font-normal opacity-80`}>
            {hints[hintKey]}
          </span>
        </button>
      ))}
    </div>
  );
}
