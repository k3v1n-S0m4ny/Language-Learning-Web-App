"use client";

import { useState } from "react";
import type { StudyWord } from "@/lib/review/types";
import { AudioButton } from "./audio-button";

// One Word in the word-by-word breakdown: hanzi always visible, its Gloss hidden
// until tapped, pinyin shown when the Card's "Show pinyin" toggle is on, plus a
// per-Word audio control.
export function WordChip({
  word,
  pinyinShown,
}: {
  word: StudyWord;
  pinyinShown: boolean;
}) {
  const [glossShown, setGlossShown] = useState(false);

  return (
    <div className="flex min-w-20 flex-col items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <span className="text-2xl text-zinc-900 dark:text-zinc-50">
        {word.hanzi}
      </span>
      {pinyinShown && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {word.pinyin}
        </span>
      )}
      <button
        type="button"
        onClick={() => setGlossShown(true)}
        className="text-xs text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
      >
        {glossShown ? word.gloss : "Reveal"}
      </button>
      <AudioButton url={word.audioUrl} label={`Play ${word.hanzi}`} />
    </div>
  );
}
