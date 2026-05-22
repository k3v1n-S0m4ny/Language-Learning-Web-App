"use client";

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
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {card.headword}
      </p>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <p className="text-lg text-zinc-700 dark:text-zinc-300">
            {card.wholeGloss}
          </p>
          <AudioButton url={card.wholeAudioUrl} label="Play whole phrase" />
        </div>
        {pinyinShown && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
        className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
      >
        {pinyinShown ? "Hide pinyin" : "Show pinyin"}
      </button>
    </div>
  );
}
