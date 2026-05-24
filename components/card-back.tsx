"use client";

import { isLeech } from "@/lib/review/config";
import type { StudyCard } from "@/lib/review/types";
import { AudioButton } from "./audio-button";
import { WordChip } from "./word-chip";

// The back of a Card: whole-Phrase Gloss + audio, the word-by-word row (suppressed
// for single-Word Cards), and one "Show pinyin" toggle revealing all pinyin together.
export function CardBack({
  card,
  pinyinShown,
  onTogglePinyin,
}: {
  card: StudyCard;
  pinyinShown: boolean;
  onTogglePinyin: () => void;
}) {
  const leech = isLeech({ lapses: card.lapses });

  return (
    <div className="flex w-full flex-col items-center gap-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <p className="text-4xl font-semibold tracking-tight text-foreground">
          {card.headword}
        </p>
        {leech && (
          <span
            title={`Lapsed ${card.lapses} times — needs review`}
            className="rounded-full bg-clay px-2 py-0.5 text-xs font-medium text-on-earthy"
          >
            leech
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <p className="text-lg text-foreground">
            {card.wholeGloss}
          </p>
          <AudioButton url={card.wholeAudioUrl} label="Play whole phrase" />
        </div>
        {pinyinShown && (
          <p className="text-sm text-foreground-muted">
            {card.wholePinyin}
          </p>
        )}
      </div>

      {card.isPhrase && (
        <div className="flex flex-wrap justify-center gap-2">
          {card.words.map((word) => (
            <WordChip key={word.id} word={word} pinyinShown={pinyinShown} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onTogglePinyin}
        className="rounded-full border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface active:scale-95"
      >
        {pinyinShown ? "Hide pinyin" : "Show pinyin"}
      </button>
    </div>
  );
}
