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
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <p className="text-5xl font-semibold tracking-tight text-foreground">
        {card.headword}
      </p>
      <button
        type="button"
        onClick={onReveal}
        className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 active:scale-95"
      >
        Show answer
      </button>
    </div>
  );
}
