"use client";

import { motion, useReducedMotion } from "motion/react";
import { Kbd } from "@/components/ui/kbd";

// The flashcard GRADING CHROME, shared by both ladder courses.
//
// Note what is not here: the card face. Advanced Thai has two bespoke faces
// (VocabLexemeSlab, PhraseSlab) that won a design bake-off, and Mandarin has its
// own flip card; a generic face would replace three considered designs with one
// worse one. What genuinely IS shared is the pair of controls around the face —
// reveal, then say whether you had it — so that is what this module owns.
//
// It replaces components/rating-buttons.tsx, and the collapse from four buttons
// to two is the whole point. Again/Hard/Good/Easy existed to feed FSRS a
// difficulty signal; the ladder has no memory model to feed, so the only question
// left is the one the Learner can actually answer honestly: did you know it.

export function RevealButton({
  onClick,
  children = "Show answer",
}: {
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[var(--r-pill)] px-8 py-3 text-sm font-semibold text-on-earthy shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] transition-transform active:scale-95"
      style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-3))" }}
    >
      {children}
    </button>
  );
}

/**
 * The binary self-grade.
 *
 * Both fills are taken from the FSRS rating ramp that used to sit here — the
 * ends of it, "again" and "good" — so the colour signal a Learner already reads
 * carries over unchanged, and both clear 4.5:1 against the pinned
 * --color-on-earthy ink (the AA table in globals.css covers them).
 *
 * There is no interval hint under either label. Under FSRS the hint was the only
 * way to understand what a button would do; here the answer is the same
 * regardless — pass and the card climbs, fail and it drops one step — and a
 * number that never varies is noise.
 */
export function PassFailRow({
  pending,
  showKeys = false,
  className = "",
  onGrade,
}: {
  pending: boolean;
  /**
   * Draws the 1 / 2 key caps. Opt-in, and default off, because this row is
   * shared with Mandarin — which has no key bindings — and a cap advertising a
   * key that does nothing is worse than no cap at all.
   */
  showKeys?: boolean;
  /** Layout-only, for a caller placing this row inside its own grid. */
  className?: string;
  onGrade: (passed: boolean) => void;
}) {
  const reduceMotion = useReducedMotion();

  const buttons: { passed: boolean; label: string; bg: string }[] = [
    { passed: false, label: "Missed it", bg: "bg-[var(--rate-again)]" },
    { passed: true, label: "Got it", bg: "bg-[var(--rate-good)]" },
  ];

  return (
    <div
      className={`grid w-full max-w-md grid-cols-2 gap-2 animate-slide-up-fade ${className}`}
      role="group"
      aria-label="Did you know it?"
    >
      {buttons.map(({ passed, label, bg }, index) => (
        <motion.button
          key={label}
          type="button"
          disabled={pending}
          onClick={() => onGrade(passed)}
          whileTap={reduceMotion ? undefined : { scale: 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`rate-press rounded-[var(--r-sm)] px-2 py-3 text-sm font-semibold text-on-earthy shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)] disabled:opacity-40 ${showKeys ? "flex items-center justify-center gap-2 " : ""}${bg}`}
        >
          {showKeys ? (
            <>
              <Kbd>{index + 1}</Kbd>
              {label}
            </>
          ) : (
            label
          )}
        </motion.button>
      ))}
    </div>
  );
}
