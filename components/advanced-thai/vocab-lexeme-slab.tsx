"use client";

import type { VocabEntry } from "@/seed/advanced-thai/types";
import { AudioButton } from "@/components/audio-button";
import {
  CardShell,
  Chip,
  Eyebrow,
  FlipCard,
  MORPH_CLASS,
  POS_CLASS,
  REGISTER_CLASS,
  useThaiFont,
} from "./kit";

// V1 — LEXEME SLAB.
// Quotes the Mandarin idiom directly: --r-xl, 3D spring flip, big centred
// headword. The argument for it is that vocabulary IS the Mandarin problem
// shape (one item, one meaning, recall it), so it should feel the same.
//
// What it adds over the Mandarin card is the MORPHOLOGY STRIP on the back.
// นักโฆษณา is not an atom — it is นัก- (one whose practice is) + โฆษณา
// (advertising), and the same นัก- builds นักการตลาด, นักวิจัย, นักเขียน,
// นักกีฬา, all of which appear in this one source text. Showing the seam turns
// a flat deck into a productive one.
//
// The seed script asserts that a word's morphemes actually SPELL the word, so
// this strip can never show a decomposition of something else.
export function VocabLexemeSlab({
  entry,
  audioUrl,
  revealed,
  onReveal,
}: {
  entry: VocabEntry;
  audioUrl: string | null;
  revealed: boolean;
  onReveal: () => void;
}) {
  const thai = useThaiFont();

  const front = (
    <CardShell className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="absolute left-5 top-5">
        <Eyebrow>Word</Eyebrow>
      </span>
      <span className="absolute right-5 top-5">
        <Chip tone={REGISTER_CLASS[entry.register]}>{entry.register}</Chip>
      </span>
      <p className={`${thai} text-[clamp(2rem,9vw,3.25rem)] font-medium leading-tight text-foreground`}>
        {entry.thai}
      </p>
      <span className="absolute bottom-5 text-xs text-foreground-muted">Tap to reveal</span>
    </CardShell>
  );

  // Fixed header + a scroll container whose child is `min-h-full justify-center`.
  // A four-morpheme compound (นักเขียนบทโฆษณา) overflows this card, and the naive
  // one-column `justify-center overflow-y-auto` recipe CLIPS when it does —
  // centring pushes the overflow above the scroll origin where it cannot be
  // reached. Short words still sit optically centred.
  const back = (
    <CardShell className="absolute inset-0 flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-5">
        <Eyebrow>Answer</Eyebrow>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-1">
        <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <p
              className={`${thai} text-[clamp(1.4rem,6vw,2rem)] font-medium leading-tight text-foreground`}
            >
              {entry.thai}
            </p>
            <AudioButton url={audioUrl} label={`Play ${entry.thai}`} size="sm" />
          </div>

          <p className="text-lg font-medium text-foreground">{entry.gloss}</p>
          <Chip tone={POS_CLASS[entry.pos]}>{entry.pos}</Chip>

          <div className="flex w-full flex-col gap-1.5 pt-1">
            <Eyebrow>Built from</Eyebrow>
            <div className="flex flex-wrap justify-center gap-1.5">
              {entry.morphemes.map((m, i) => (
                <div
                  key={i}
                  className="flex min-w-[4.5rem] flex-col items-center gap-1 rounded-[var(--r-md)] bg-background px-2.5 py-2"
                >
                  <span className={`${thai} text-base leading-none text-foreground`}>{m.form}</span>
                  <Chip tone={MORPH_CLASS[m.role]} className="!px-1.5 !text-[10px]">
                    {m.role}
                  </Chip>
                  <span className="text-[11px] leading-tight text-foreground-muted">{m.gloss}</span>
                </div>
              ))}
            </div>
            {entry.literal && (
              <p className="pt-0.5 text-[11px] italic text-foreground-muted">lit. {entry.literal}</p>
            )}
          </div>
        </div>
      </div>
    </CardShell>
  );

  return <FlipCard flipped={revealed} onFlip={onReveal} front={front} back={back} />;
}
