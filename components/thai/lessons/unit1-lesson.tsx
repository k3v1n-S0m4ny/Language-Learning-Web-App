"use client";

import { useTransition } from "react";
import { markUnit1LessonRead } from "@/lib/thai/actions";

const CONSONANT_SYMBOLS: { symbol: string; hint: string }[] = [
  { symbol: "k", hint: "the k in “sky” — no puff of air" },
  { symbol: "kʰ", hint: "the k in “kite” — with a puff of air" },
  { symbol: "p", hint: "the p in “spin” — no puff" },
  { symbol: "pʰ", hint: "the p in “pin” — with a puff" },
  { symbol: "t", hint: "the t in “stop” — no puff" },
  { symbol: "tʰ", hint: "the t in “top” — with a puff" },
  { symbol: "tɕ", hint: "roughly the j/ch sound, tongue high & forward" },
  { symbol: "tɕʰ", hint: "the same, but with a puff of air" },
  { symbol: "ŋ", hint: "the ng in “sing” — Thai allows it to start a word" },
  { symbol: "ʔ", hint: "a glottal stop: the catch in “uh-oh”" },
  { symbol: "f", hint: "as in English “fan”" },
  { symbol: "s", hint: "as in English “see”" },
];

const VOWEL_SYMBOLS: { symbol: string; hint: string }[] = [
  { symbol: "i", hint: "“ee” in “see” (short version too)" },
  { symbol: "e", hint: "near “bait” without the glide" },
  { symbol: "ɛ", hint: "“a” in “cat”" },
  { symbol: "a", hint: "“a” in “father” (open, central)" },
  { symbol: "u", hint: "“oo” in “boot”, lips rounded" },
  { symbol: "o", hint: "“o” in “go” without the glide" },
  { symbol: "ɔ", hint: "“aw” in “saw” / “thought”" },
  { symbol: "ɯ", hint: "like u but lips unrounded (spread, as in a smile)" },
  { symbol: "ɤ", hint: "like o but lips unrounded; near “burn”" },
];

// Unit 1 is lesson-only — no drills, "complete when read" (A4). The button
// writes the sentinel thai_progress row that the unit map's unlock check reads.
export function Unit1Lesson({ alreadyRead }: { alreadyRead: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          A quick IPA primer
        </h2>
        <p className="text-sm text-foreground-muted">
          This course describes Thai sounds with the International Phonetic
          Alphabet (IPA) instead of a romanization — one symbol always means
          one sound. Two habits carry the most weight: a raised{" "}
          <span className="font-mono">ʰ</span> marks a puff of air
          (aspiration) — Thai treats <span className="font-mono">k</span> and{" "}
          <span className="font-mono">kʰ</span> as different consonants, the
          way English never does — and a{" "}
          <span className="font-mono">ː</span> after a vowel means it is held
          longer, e.g. <span className="font-mono">a</span> vs{" "}
          <span className="font-mono">aː</span>.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CONSONANT_SYMBOLS.map((s) => (
            <div
              key={s.symbol}
              className="flex items-baseline gap-3 rounded-lg bg-surface px-3 py-2"
            >
              <span className="w-12 shrink-0 font-mono text-base font-semibold text-foreground">
                [{s.symbol}]
              </span>
              <span className="text-xs text-foreground-muted">{s.hint}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {VOWEL_SYMBOLS.map((s) => (
            <div
              key={s.symbol}
              className="flex items-baseline gap-3 rounded-lg bg-surface px-3 py-2"
            >
              <span className="w-12 shrink-0 font-mono text-base font-semibold text-foreground">
                [{s.symbol}]
              </span>
              <span className="text-xs text-foreground-muted">{s.hint}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          The shape of a Thai syllable
        </h2>
        <p className="text-sm text-foreground-muted">
          Every Thai syllable is an initial consonant + a vowel + an optional
          final consonant. A fifth ingredient — the tone — is never written
          directly; it is computed from the other pieces (Units 2–8 give you
          everything that calculation needs). One distinction matters from
          here on: a syllable is <b>live</b> if it can be held out — a long
          vowel, or ending in <span className="font-mono">m n ŋ j w</span> —
          and <b>dead</b> if it stops short — ending in{" "}
          <span className="font-mono">p t k</span>, or a short vowel with
          nothing after it.
        </p>
      </section>

      <button
        type="button"
        disabled={pending || alreadyRead}
        onClick={() =>
          startTransition(async () => {
            await markUnit1LessonRead();
          })
        }
        className="w-fit rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {alreadyRead ? "Read ✓" : pending ? "Marking as read…" : "Mark unit 1 as read"}
      </button>
    </div>
  );
}
