"use client";

import { useState } from "react";
import type { SpokenSyllable } from "@/lib/mandarin/tone-sandhi";
import type { StudyWord } from "@/lib/review/types";
import { AudioButton } from "./audio-button";
import { PinyinSyllables } from "./pinyin-syllables";

// One Word in the word-by-word breakdown: hanzi always visible, its Gloss
// hidden until tapped (the core per-word self-test mechanic — preserved
// verbatim through the reskin), pinyin shown when the Card's "Show pinyin"
// toggle is on, plus a per-Word audio control. `syllables` is this word's
// SLICE of the phrase-level spoken-tone computation (lib/mandarin/tone-
// sandhi's computeSandhiByWord) — so e.g. 我 renders tone-2 in the context
// of "我喜欢喝茶", not the tone-3 it would show standalone.
export function WordChip({
  word,
  pinyinShown,
  toneColorOn,
  syllables,
}: {
  word: StudyWord;
  pinyinShown: boolean;
  toneColorOn: boolean;
  syllables: SpokenSyllable[];
}) {
  const [glossShown, setGlossShown] = useState(false);

  return (
    <div className="glass relative flex min-w-[5.5rem] flex-col items-center gap-1 rounded-[var(--r-md)] px-3 py-2.5 animate-pop-in">
      <div className="absolute right-1.5 top-1.5">
        <AudioButton url={word.audioUrl} label={`Play ${word.hanzi}`} size="sm" />
      </div>
      <span className="font-hanzi mt-1 text-2xl text-foreground">{word.hanzi}</span>
      {pinyinShown && (
        <PinyinSyllables syllables={syllables} toneColorOn={toneColorOn} className="text-xs font-semibold" />
      )}
      <button
        type="button"
        onClick={() => setGlossShown(true)}
        className="rounded-[var(--r-pill)] px-2 py-0.5 text-[11px] font-semibold text-foreground-muted transition-colors hover:text-foreground"
      >
        {glossShown ? word.gloss : "reveal"}
      </button>
    </div>
  );
}
