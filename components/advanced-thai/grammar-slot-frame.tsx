"use client";

import type { GrammarPattern } from "@/seed/advanced-thai/types";
import { CardShell, Chip, Eyebrow, PATTERN_FN_CLASS, useThaiFont } from "./kit";

// G1 — SLOT FRAME.
// The pattern is shown as a frame with EMPTY slots you have to fill mentally,
// then the reveal shows real sentences from the text with the matching spans
// painted in the SAME hue as the slot.
//
// That colour identity is the whole design, and it is why there is no separate
// --slot-filled token: the pattern's own --pattern-fn-* tint IS the span
// highlight. The abstract frame and its concrete realization are literally the
// same colour, so the eye does the matching for free. The seed script asserts
// that every slot named in an example actually appears in the frame, which is
// what keeps that correspondence honest.
//
// UNLIKE THE OTHER TWO CARDS, THIS ONE DOES NOT FLIP. A flip hides the question
// while you read the answer, and here the question — the frame — is exactly what
// the examples are meant to be read AGAINST. So the frame stays pinned at the top
// and the examples appear beneath it. It quotes the flat Read-Thai panel (--r-lg)
// rather than the Mandarin flip card, which is the honest signal that it is a
// different kind of problem.
export function GrammarSlotFrame({
  pattern,
  revealed,
  onReveal,
}: {
  pattern: GrammarPattern;
  revealed: boolean;
  onReveal: () => void;
}) {
  const thai = useThaiFont();
  const tone = PATTERN_FN_CLASS[pattern.fn];

  // The frame string ("ทำให้ + N + V") is split on "+" so each part can be
  // rendered as either the pattern marker or an empty slot.
  const parts = pattern.frame.split("+").map((p) => p.trim());

  return (
    <CardShell
      radius="lg"
      className={`flex min-h-[26rem] w-full flex-col gap-4 p-5 ${
        revealed ? "" : "cursor-pointer"
      }`}
      // Pointer-only convenience for the same action as the session's "Show
      // answer" button, which remains the sole keyboard-focusable control — so no
      // role/tabIndex here, deliberately not a second tab stop for one action.
      onClick={revealed ? undefined : onReveal}
    >
      <div className="flex items-center justify-between">
        <Eyebrow>Pattern</Eyebrow>
        {revealed && <Chip tone={tone}>{pattern.fn}</Chip>}
      </div>

      {/* The frame. Slots are recessed and dashed — a gap you are meant to fill. */}
      <div className="flex flex-wrap items-center justify-center gap-2 py-2">
        {parts.map((part, i) => {
          const isSlot = /^[A-Z][a-z]*$/.test(part); // N, V, A, B, Clause, Adj, Agent
          return isSlot ? (
            <span
              key={i}
              className="inline-flex min-w-[3rem] items-center justify-center rounded-[var(--r-sm)] border border-dashed border-[var(--slot-empty-brd)] bg-[var(--slot-empty-bg)] px-3 py-1.5 text-sm font-medium text-[var(--slot-empty-ink)]"
            >
              {part}
            </span>
          ) : (
            <span
              key={i}
              className={`${thai} inline-flex items-center rounded-[var(--r-sm)] px-2.5 py-1.5 text-lg leading-none ${tone}`}
            >
              {part}
            </span>
          );
        })}
      </div>

      {!revealed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <p className="text-sm text-foreground-muted">What does this pattern do?</p>
          <p className="text-xs text-foreground-muted">Tap to reveal</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto animate-fade-in">
          <p className="text-center text-base font-medium text-foreground">
            {pattern.plainEnglish}
          </p>

          <div className="flex flex-col gap-3">
            <Eyebrow>In the text</Eyebrow>
            {pattern.examples.map((ex, i) => (
              <div key={i} className="flex flex-col gap-1 rounded-[var(--r-md)] bg-background p-3">
                <p className={`${thai} text-base leading-relaxed`}>
                  {ex.segments.map((seg, j) =>
                    seg.slot ? (
                      // Same tint as the slot above. The ink is pinned by the
                      // token pair, so this span never also sets text-foreground
                      // (that same-property collision is a known CRITICAL here).
                      <span key={j} className={`rounded-[var(--r-sm)] px-1 py-0.5 ${tone}`}>
                        {seg.text}
                      </span>
                    ) : (
                      <span key={j} className="text-foreground">
                        {seg.text}
                      </span>
                    ),
                  )}
                </p>
                <p className="text-xs leading-snug text-foreground-muted">{ex.gloss}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </CardShell>
  );
}
