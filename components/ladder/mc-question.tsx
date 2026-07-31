"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

// The four-option multiple-choice step, for both ladder courses.
//
// Modelled on the Read-Thai drill's option grid (components/thai/drill/
// drill-session.tsx) — the same two-column layout, the same correct/chosen
// highlight, the same animate-correct-pulse / animate-shake pair, which are
// gated in globals.css and no-op under reduced motion. Restyled to the glass
// design language, and with the answer face and its own reasoning left to the
// caller.
//
// THE COMPONENT NEVER KNOWS THE ANSWER UNTIL IT HAS BEEN GIVEN. `options` arrives
// unmarked (see AtStudyCard.options) and this file has no way to derive which one
// is right — it posts the chosen string and waits. `verdict` is what the SERVER
// returns after grading, so the correct-option highlight below can only ever
// appear after an answer has been committed. That is not a courtesy: on a
// produce-mc step the answer is the Thai the Learner is being asked to produce,
// and shipping it early would make the question answerable by reading the DOM.
//
// `chosen` does NOT weaken that. It is the Learner's own tap, echoed back before
// the server has said anything about it — the acknowledgement that the tap
// landed. Grading still happens entirely server-side and the correct option is
// still unknowable until `verdict` arrives.

export interface McVerdict {
  chosen: string;
  passed: boolean;
  /** The right answer, safe to hold only because grading has already happened. */
  correct: string;
}

export function McQuestion({
  eyebrow,
  prompt,
  options,
  optionClassName = "",
  chosen = null,
  verdict,
  pending,
  onChoose,
}: {
  eyebrow: string;
  /** The question face. The caller renders it, so Thai gets the right cut and scale. */
  prompt: ReactNode;
  options: string[];
  /** Applied to every option — the Thai letterform class on a produce step. */
  optionClassName?: string;
  /**
   * The option the Learner tapped, set the instant they tap it and before the
   * server has graded it. Optional, and null-by-default, so a caller that does
   * not pass it behaves exactly as this component always has: the grid simply
   * gives no acknowledgement until the verdict lands.
   */
  chosen?: string | null;
  verdict: McVerdict | null;
  pending: boolean;
  onChoose: (choice: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const answered = verdict !== null;
  // Before grading this is the Learner's own tap; after it, the server's echo of
  // the same string. Reading it from the verdict once one exists keeps the
  // highlight correct for callers that never pass `chosen` at all.
  const picked = verdict?.chosen ?? chosen;
  // Committed but not yet graded: the answer is in flight. The grid stays on
  // screen through this — replacing it with a spinner is what used to make the
  // feedback look like a new card arriving pre-answered.
  const committing = picked !== null && !answered;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 animate-slide-up-fade">
      <div className="flex w-full flex-col items-center gap-3 rounded-[var(--r-xl)] border border-border-base bg-surface p-6 text-center shadow-[var(--glass-shadow)]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-muted">
          {eyebrow}
        </span>
        {prompt}
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        {options.map((option) => {
          const isChosen = picked === option;
          const isCorrect = verdict?.correct === option;

          // Explicit text-foreground on the default state — the UA default button
          // ink is black, invisible on the dark surface (a11y).
          let tone = "border-border-base bg-surface text-foreground hover:bg-background";
          let feedback = "";
          if (answered) {
            if (isCorrect) tone = "border-success bg-success text-white";
            else if (isChosen) tone = "border-clay bg-clay text-on-earthy";
            // Pulse the Learner's own choice when right, shake it when wrong.
            if (isChosen) feedback = verdict.passed ? "animate-correct-pulse" : "animate-shake";
          } else if (committing) {
            // Deliberately NEUTRAL — it says "got it", never "right" or "wrong".
            // Committing to a verdict tone here would be the client grading
            // itself, and would be wrong half the time.
            tone = isChosen
              ? "border-brand bg-[var(--glass-bg-strong)] text-foreground"
              : "border-border-base bg-surface text-foreground opacity-50";
          }

          const locked = answered || committing || pending;

          return (
            <motion.button
              key={option}
              type="button"
              disabled={locked}
              onClick={() => onChoose(option)}
              whileTap={locked || reduceMotion ? undefined : { scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`focus-ring rounded-[var(--r-lg)] border-2 px-4 py-3 text-center transition-[color,background-color,border-color,opacity] disabled:cursor-default ${optionClassName} ${tone} ${feedback}`}
            >
              {option}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
