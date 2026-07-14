"use client";

import type { PhraseEntry, PhraseWord } from "@/seed/advanced-thai/types";
import { AudioButton } from "@/components/audio-button";
import { CardShell, Eyebrow, FlipCard, useThaiFont } from "./kit";

// PHRASE SLAB — the Mandarin card, in Thai.
//
// Front: the clause, unspaced and verbatim. Back: the clause, its English, the
// audio, and the word-by-word chip row. Structurally the Mandarin card
// (components/card-back.tsx) minus the pinyin — this deck is Thai script and
// English only.
//
// Why the transplant works, and it is worth being explicit because it is the
// whole reason this design won: on a Mandarin card the word row is a
// CONVENIENCE. The reader can already see where one character ends and the next
// begins, so the chips mostly just attach glosses. In Thai the front face has NO
// SPACES AT ALL — where the words divide is genuinely unknown until you flip. So
// the very same row is answering a question the front actually posed.
// Segmentation is the skill that separates an intermediate Thai reader from a
// fluent one, and the Mandarin card teaches it here for free.
//
// A PHRASE is one space-delimited clause of the source (see PhraseEntry). Thai
// spaces separate clauses, not words, so the document marks its own phrase
// boundaries. That keeps every card between 4 and 71 Thai characters — which is
// what makes a fixed-ratio flip card viable at all, since the raw source lines
// run to 439.
//
// THE WORD CHIPS CARRY NO AUDIO BUTTON. Owner's decision (M16/B4): whole-phrase
// audio only. The chips teach segmentation VISUALLY, and the clip you hear is the
// whole clause — which is how the words actually arrive in speech anyway.

/**
 * The Thai counterpart of components/word-chip.tsx, minus the audio control.
 * Glass, because a word chip is floating chrome ON the card rather than the
 * reading surface itself — the one glass element the Mandarin card carries, and
 * the precedent holds.
 */
function ThaiWordChip({ word }: { word: PhraseWord }) {
  const thai = useThaiFont();
  return (
    <div className="glass flex min-w-[4.5rem] flex-col items-center gap-1 rounded-[var(--r-md)] px-2.5 py-2 animate-pop-in">
      <span className={`${thai} text-base leading-none text-foreground`}>{word.thai}</span>
      <span className="text-center text-[11px] leading-tight text-foreground-muted">
        {word.gloss}
      </span>
    </div>
  );
}

/** The clause itself. Type scales with length — these run from 4 to 71 characters. */
function Clause({ text, size = "lg" }: { text: string; size?: "lg" | "sm" }) {
  const thai = useThaiFont();
  const scale =
    size === "lg" ? "text-[clamp(1.25rem,4.2vw,1.75rem)]" : "text-[clamp(1rem,3.2vw,1.25rem)]";
  return <p className={`${thai} ${scale} text-center leading-relaxed text-foreground`}>{text}</p>;
}

export function PhraseSlab({
  phrase,
  audioUrl,
  revealed,
  onReveal,
}: {
  phrase: PhraseEntry;
  audioUrl: string | null;
  revealed: boolean;
  onReveal: () => void;
}) {
  const front = (
    <CardShell className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="absolute left-5 top-5">
        <Eyebrow>Phrase</Eyebrow>
      </span>
      <span className="absolute right-5 top-5 text-[10px] text-foreground-muted">
        {phrase.context ?? phrase.source}
      </span>
      <Clause text={phrase.thai} />
      <span className="absolute bottom-5 text-xs text-foreground-muted">Tap to reveal</span>
    </CardShell>
  );

  // Fixed header + a scroll container whose CHILD is `min-h-full justify-center`.
  // The naive one-column `justify-center overflow-y-auto` recipe CLIPS when its
  // content overflows — centring pushes the overflow above the scroll origin,
  // where it can never be scrolled back to. A twelve-word clause overflows this
  // card immediately. (components/card-back.tsx is built the naive way and is
  // only safe because Mandarin phrases are short.) Short clauses still sit
  // optically centred; long ones scroll from the top with nothing lost.
  const back = (
    <CardShell className="absolute inset-0 flex flex-col overflow-hidden">
      <div className="flex shrink-0 items-start justify-between gap-2 px-5 pt-5">
        <Eyebrow>Answer</Eyebrow>
        <span className="text-right text-[10px] leading-tight text-foreground-muted">
          {phrase.context ?? phrase.source}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2">
        <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <Clause text={phrase.thai} size="sm" />
            <AudioButton url={audioUrl} label="Play phrase" size="sm" />
          </div>

          <p className="max-w-[24rem] text-sm leading-snug text-foreground">{phrase.gloss}</p>

          <div className="flex flex-wrap justify-center gap-1.5">
            {phrase.words.map((w, i) => (
              <ThaiWordChip key={i} word={w} />
            ))}
          </div>
        </div>
      </div>
    </CardShell>
  );

  return (
    <FlipCard
      flipped={revealed}
      onFlip={onReveal}
      front={front}
      back={back}
      ratio="aspect-[1/1.2]"
    />
  );
}
