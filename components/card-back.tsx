"use client";

import { tokenizePhrasePinyin } from "@/lib/mandarin/pinyin-tone";
import { computeSandhi, computeSandhiFromSyllables, sliceSandhiByWord } from "@/lib/mandarin/tone-sandhi";
import { isLeech } from "@/lib/review/config";
import type { StudyCard } from "@/lib/review/types";
import { AudioButton } from "./audio-button";
import { PinyinSyllables } from "./pinyin-syllables";
import { WordChip } from "./word-chip";

// The back FACE of the flip card: whole-headword + tone-coloured pinyin
// (SPOKEN tones, derived via lib/mandarin/tone-sandhi from the citation
// pinyin already on the card — no data change), whole-phrase gloss + audio,
// the word-by-word row (suppressed for single-word Cards), the pinyin
// show/hide toggle, and a tone-colour on/off toggle (colour is on by
// default; turning it off renders pinyin in the neutral ink colour, per the
// locked design decision — the show/hide toggle is untouched).
export function CardBack({
  card,
  pinyinShown,
  onTogglePinyin,
  toneColorOn,
  onToggleToneColor,
}: {
  card: StudyCard;
  pinyinShown: boolean;
  onTogglePinyin: () => void;
  toneColorOn: boolean;
  onToggleToneColor: () => void;
}) {
  const leech = isLeech({ lapses: card.lapses });

  // card.words always carries at least one entry for non-phrase Cards too
  // (the seed pipeline segments even a single-word headword into one word
  // entry — confirmed against seed/mandarin/deck.generated.json). The
  // `else` branch below only guards against unexpected empty word data: it
  // whitespace-tokenizes card.wholePinyin directly (tokenizePhrasePinyin is
  // word-boundary-aware, unlike naively re-splitting the whole phrase as if
  // it were one word) and applies only the word-boundary-independent
  // 3rd-tone rule (see computeSandhiFromSyllables) — no per-word data is
  // available in this path, so `byWord`/word chips are simply empty.
  const hasWordData = card.words.length > 0;
  const phraseSyllables = hasWordData
    ? computeSandhi(card.words)
    : computeSandhiFromSyllables(tokenizePhrasePinyin(card.wholePinyin));
  const byWord = hasWordData ? sliceSandhiByWord(phraseSyllables, card.words) : [];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto rounded-[var(--r-xl)] border border-border-base bg-surface p-4 text-center shadow-[var(--glass-shadow)] sm:gap-3 sm:p-6">
      <span className="absolute left-4 top-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-muted sm:left-6 sm:top-6">
        Answer
      </span>

      <div className="flex items-center gap-2">
        <p className="font-hanzi text-[clamp(1.75rem,8vw,3rem)] font-medium leading-none text-foreground">
          {card.headword}
        </p>
        {leech && (
          <span
            title={`Lapsed ${card.lapses} times — needs review`}
            className="glass rounded-[var(--r-pill)] px-2 py-0.5 text-xs font-medium text-foreground"
          >
            leech
          </span>
        )}
      </div>

      {pinyinShown && (
        <PinyinSyllables
          syllables={phraseSyllables}
          toneColorOn={toneColorOn}
          className="text-lg font-semibold"
        />
      )}

      <div className="flex items-center gap-3">
        <p className="text-base text-foreground">{card.wholeGloss}</p>
        <AudioButton url={card.wholeAudioUrl} label="Play whole phrase" />
      </div>

      {card.isPhrase && (
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {card.words.map((word, i) => (
            <WordChip
              key={word.id}
              word={word}
              pinyinShown={pinyinShown}
              toneColorOn={toneColorOn}
              syllables={byWord[i] ?? []}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={onTogglePinyin}
          className="rounded-[var(--r-pill)] border border-border-base px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-foreground"
        >
          {pinyinShown ? "Hide pinyin" : "Show pinyin"}
        </button>
        {pinyinShown && (
          <button
            type="button"
            onClick={onToggleToneColor}
            aria-pressed={toneColorOn}
            className="rounded-[var(--r-pill)] border border-border-base px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-foreground"
          >
            {toneColorOn ? "Tone colour on" : "Tone colour off"}
          </button>
        )}
      </div>
    </div>
  );
}
