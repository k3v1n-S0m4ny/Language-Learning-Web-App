"use client";

import { createContext, useContext, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

// Shared scaffolding for the bake-off cards. Everything here is the EXISTING
// design language, just factored so the candidates can be compared without a
// copy of the same class string in each:
//
//   - CardShell   the solid-elevated reading surface (never .glass behind script)
//   - FlipCard    the 3D spring flip, lifted verbatim from review-session.tsx
//   - Chip        the tint + pinned-ink recipe used by ClassBadge / the heat ramp
//   - Recessed    the bg-background sub-tile idiom from the Read-Thai drills
//
// IMPORTANT (Tailwind v4): class names are scanned STATICALLY out of the source.
// `bg-[var(--pos-${key})]` produces no CSS. Every token class below is therefore
// a literal string in a lookup map. Adding a token means adding a literal here.

// --- Letterform toggle ------------------------------------------------------
// The classical looped vs modern loopless cuts of IBM Plex Sans Thai, same pair
// the unit-2 flashcards offer. Page-level here so all nine cards switch at once
// and you can judge the designs at the letterform you actually read in.

type ThaiFont = "looped" | "loopless";
const ThaiFontContext = createContext<ThaiFont>("looped");

export function ThaiFontProvider({
  value,
  children,
}: {
  value: ThaiFont;
  children: ReactNode;
}) {
  return <ThaiFontContext.Provider value={value}>{children}</ThaiFontContext.Provider>;
}

/** The Tailwind font class for the currently-selected Thai letterform. */
export function useThaiFont(): string {
  return useContext(ThaiFontContext) === "looped" ? "font-thai-looped" : "font-thai-loopless";
}

export type { ThaiFont };

// --- Token class maps -------------------------------------------------------
// Each entry pairs a fill with its OWN pinned ink, so no consumer ever branches
// on theme — and, critically, no consumer ever sets `text-foreground` alongside
// one of these (that same-property collision silently defeated AA once already;
// see the Phase 3 note in globals.css).

export const POS_CLASS: Record<string, string> = {
  noun: "bg-[var(--pos-noun)] text-[var(--pos-noun-ink)]",
  verb: "bg-[var(--pos-verb)] text-[var(--pos-verb-ink)]",
  adj: "bg-[var(--pos-adj)] text-[var(--pos-adj-ink)]",
  adv: "bg-[var(--pos-adv)] text-[var(--pos-adv-ink)]",
  classifier: "bg-[var(--pos-classifier)] text-[var(--pos-classifier-ink)]",
};

export const REGISTER_CLASS: Record<string, string> = {
  formal: "bg-[var(--register-formal)] text-[var(--register-formal-ink)]",
  colloquial: "bg-[var(--register-colloquial)] text-[var(--register-colloquial-ink)]",
  technical: "bg-[var(--register-technical)] text-[var(--register-technical-ink)]",
};

export const MORPH_CLASS: Record<string, string> = {
  prefix: "bg-[var(--morph-prefix)] text-[var(--morph-prefix-ink)]",
  root: "bg-[var(--morph-root)] text-[var(--morph-root-ink)]",
  suffix: "bg-[var(--morph-suffix)] text-[var(--morph-suffix-ink)]",
};

export const PATTERN_FN_CLASS: Record<string, string> = {
  causative: "bg-[var(--pattern-fn-causative)] text-[var(--pattern-fn-causative-ink)]",
  passive: "bg-[var(--pattern-fn-passive)] text-[var(--pattern-fn-passive-ink)]",
  comparative: "bg-[var(--pattern-fn-comparative)] text-[var(--pattern-fn-comparative-ink)]",
  topic: "bg-[var(--pattern-fn-topic)] text-[var(--pattern-fn-topic-ink)]",
  connector: "bg-[var(--pattern-fn-connector)] text-[var(--pattern-fn-connector-ink)]",
  reciprocal: "bg-[var(--pattern-fn-reciprocal)] text-[var(--pattern-fn-reciprocal-ink)]",
};

// --- Primitives -------------------------------------------------------------

/**
 * The reading surface. Solid, elevated, concentric radius — NOT glass. The one
 * rule repeated in every card comment in this codebase: never glass behind
 * script. `radius` picks which product idiom the design is quoting: "xl" is the
 * Mandarin flip card, "lg" is the flat Read-Thai panel.
 */
export function CardShell({
  radius = "xl",
  className = "",
  onClick,
  children,
}: {
  radius?: "lg" | "xl";
  className?: string;
  /** Pointer-only reveal shortcut — see the note in grammar-slot-frame.tsx. */
  onClick?: () => void;
  children: ReactNode;
}) {
  const r = radius === "xl" ? "rounded-[var(--r-xl)]" : "rounded-[var(--r-lg)]";
  return (
    <div
      onClick={onClick}
      className={`border border-border-base bg-surface shadow-[var(--glass-shadow)] ${r} ${className}`}
    >
      {children}
    </div>
  );
}

/** The small uppercase tracked label in a card's top corner. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-muted">
      {children}
    </span>
  );
}

/** A tint + pinned-ink chip. `tone` must already be a full literal class pair. */
export function Chip({
  tone,
  className = "",
  children,
}: {
  tone: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[var(--r-pill)] px-2.5 py-0.5 text-xs font-medium ${tone} ${className}`}
    >
      {children}
    </span>
  );
}

/** The accent-gradient CTA. The only gradient in the app; quoted from the Mandarin flow. */
export function RevealButton({
  onClick,
  children = "Show answer",
}: {
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[var(--r-pill)] px-6 py-2.5 text-sm font-semibold text-on-earthy shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] transition-transform active:scale-95"
      style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-3))" }}
    >
      {children}
    </button>
  );
}

/** The quieter outline pill used for secondary reveals (the Read-Thai idiom). */
export function QuietButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[var(--r-pill)] border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-background hover:text-foreground"
    >
      {children}
    </button>
  );
}

/**
 * The 3D spring flip, lifted from components/review-session.tsx rather than
 * reinvented: both faces stay mounted (required for the rotation), the hidden
 * one is `inert` so a keyboard user cannot tab into a face that is rotated away,
 * and reduced-motion users get a plain swap with no 3D transform at all.
 */
export function FlipCard({
  flipped,
  onFlip,
  front,
  back,
  ratio = "aspect-[1/1.12]",
}: {
  flipped: boolean;
  onFlip: () => void;
  front: ReactNode;
  back: ReactNode;
  ratio?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`relative w-full select-none ${ratio} ${flipped ? "" : "cursor-pointer"}`}
      style={reduceMotion ? undefined : { perspective: 1600 }}
      onClick={flipped ? undefined : onFlip}
    >
      {reduceMotion ? (
        flipped ? (
          back
        ) : (
          front
        )
      ) : (
        <motion.div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <div
            className="absolute inset-0"
            style={{ backfaceVisibility: "hidden" }}
            aria-hidden={flipped}
            inert={flipped}
          >
            {front}
          </div>
          <div
            className="absolute inset-0"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            aria-hidden={!flipped}
            inert={!flipped}
          >
            {back}
          </div>
        </motion.div>
      )}
    </div>
  );
}
