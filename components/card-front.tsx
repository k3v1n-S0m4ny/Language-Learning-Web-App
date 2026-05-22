"use client";

import type { StudyCard } from "@/lib/review/types";

// The front of a Card: only the Chinese Headword, plus the control to reveal the back.
export function CardFront({
  card,
  onReveal,
}: {
  card: StudyCard;
  onReveal: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {card.headword}
      </p>
      <button
        type="button"
        onClick={onReveal}
        className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Show answer
      </button>
    </div>
  );
}
