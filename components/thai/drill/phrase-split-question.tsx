"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { serializeBoundaries } from "@/lib/thai/types";

interface Props {
  phrase: { chars: string[]; syllables: { thai: string; ipa: string; gloss: string }[] };
  // Canonical serialized boundary set (e.g. "2,5") — used only to render
  // right/wrong feedback locally once the learner presses Check; the actual
  // scoring happens server-side in lib/thai/actions.ts::submitThaiAttempt,
  // same as every other drill type (M11 review round 2 pattern: never trust
  // the client, but it's fine to use the value we already have to give
  // instant feedback without waiting on the round-trip).
  correct: string;
  disabled: boolean;
  // Called exactly once, when the learner presses Check — the parent
  // (DrillSession) owns submitting the serialized value to the server (M14/A5
  // contract: "one thai_attempts row per completed question ... expected vs
  // chosen boundary-set string"). The per-syllable IPA/gloss reinforcement
  // shown after Check is purely local/unlogged (mirrors tone-assembly's
  // per-step feedback contract).
  onSubmit: (serialized: string) => void;
}

// M14/A5 — the `phrase-split` tap-boundary widget: the learner taps the
// targets BETWEEN character cells to toggle syllable-boundary positions, then
// presses Check. Sibling of tone-assembly-question.tsx (the other non-MC
// drill widget) — same "local interaction, one server-logged final answer"
// shape.
export function PhraseSplitQuestion({ phrase, correct, disabled, onSubmit }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const reduceMotion = useReducedMotion();

  const correctSet = new Set(correct.split(",").filter(Boolean).map(Number));

  function toggle(index: number) {
    if (checked || disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function check() {
    if (checked || disabled) return;
    setChecked(true);
    onSubmit(serializeBoundaries([...selected]));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-center gap-0 rounded-[var(--r-lg)] border border-border-base bg-surface p-4 sm:p-8">
        {phrase.chars.map((char, i) => (
          <span key={i} className="flex items-center">
            {i > 0 && (
              <button
                type="button"
                disabled={checked || disabled}
                onClick={() => toggle(i)}
                aria-label={`Toggle syllable boundary before position ${i}`}
                aria-pressed={selected.has(i)}
                className={`focus-ring mx-0.5 box-content h-6 w-0.5 shrink-0 rounded-[var(--r-pill)] bg-clip-content px-[11px] py-[10px] transition-colors disabled:cursor-default sm:box-border sm:h-8 sm:w-2 sm:px-0 sm:py-0 sm:bg-clip-border ${
                  checked
                    ? correctSet.has(i) && selected.has(i)
                      ? "bg-success"
                      : correctSet.has(i)
                        ? "bg-highlight"
                        : selected.has(i)
                          ? "bg-clay"
                          : "bg-transparent"
                    : selected.has(i)
                      ? "bg-accent"
                      : "bg-border-base hover:bg-accent/50"
                }`}
              />
            )}
            {/* Prominent-ink Thai glyph (~1.6x a11y bump — a consonant only
                fills ~50% of its font-size, the rest reserved for stacked
                vowels/tone marks). */}
            <span className="font-thai text-[3.6rem] text-foreground">{char}</span>
          </span>
        ))}
      </div>

      {!checked && (
        <motion.button
          type="button"
          onClick={check}
          disabled={disabled}
          whileTap={disabled || reduceMotion ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-fit self-center rounded-[var(--r-pill)] bg-accent px-6 py-2 text-sm font-semibold text-on-earthy transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          Check
        </motion.button>
      )}

      {checked && (
        <div className="flex flex-col gap-2 animate-fade-in">
          {phrase.syllables.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3 rounded-[var(--r-md)] bg-background px-3 py-2 text-sm">
              <span className="font-thai text-xl text-foreground">{s.thai}</span>
              <span className="font-mono text-xs text-foreground-muted">[{s.ipa}]</span>
              <span className="text-xs italic text-foreground-muted">&lsquo;{s.gloss}&rsquo;</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
