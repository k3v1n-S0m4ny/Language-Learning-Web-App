"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { playAudio } from "@/components/audio-button";
import { McQuestion, type McVerdict } from "@/components/ladder/mc-question";
import { PassFailRow, RevealButton } from "@/components/ladder/flashcard";
import {
  gradeAdvancedChoice,
  submitAdvancedChoice,
  submitAdvancedSelfGrade,
} from "@/lib/advanced-thai/actions";
import type { AtStudyCard } from "@/lib/advanced-thai/types";
import { setSessionActive } from "@/lib/ux/session-focus";
import { PhraseSlab } from "./phrase-slab";
import { useThaiFont } from "./kit";
import { VocabLexemeSlab } from "./vocab-lexeme-slab";

// Owns the per-card interaction state for Advanced Thai — the counterpart of
// components/review-session.tsx.
//
// IT DISPATCHES ON `card.format`, NOT ON `card.kind`. That inversion is the whole
// ladder change: a card is not one question any more. The same vocab row is a
// four-option recognition question at step 1, a flip card at step 2, a
// four-option production question at step 3 and a cold recall at step 4. Kind
// still decides which FACE draws the card (the two bake-off designs), but format
// decides what is being ASKED, and those are now different axes.
//
// Keyed by card.id at the call site, so the interaction state resets when the
// next card loads.
//
// `mode` decides whether an answer is RECORDED. A round writes ladder state; a
// practice drill does not write at all, so its cards cannot climb, cannot be
// demoted and cannot be dragged into a round by being drilled. The interaction is
// otherwise identical, deliberately — practice should feel like study, it just
// must not count as it.

// How long the correct/incorrect highlight stays up before the next card is
// requested. Long enough to read which option was right on a miss, short enough
// that a run of easy cards does not feel gated.
const FEEDBACK_MS = 1100;

export function AdvancedReviewSession({
  card,
  mode = "round",
}: {
  card: AtStudyCard;
  mode?: "round" | "practice";
}) {
  const router = useRouter();
  const thai = useThaiFont();

  const [revealed, setRevealed] = useState(false);
  const [verdict, setVerdict] = useState<McVerdict | null>(null);
  const [pending, startTransition] = useTransition();
  // Set the moment an answer is committed, so the card cannot be answered twice
  // while the feedback timer and the refresh are both in flight.
  const [answered, setAnswered] = useState(false);

  // Recede the bottom nav while a session is on screen; resets on unmount.
  useEffect(() => {
    setSessionActive(true);
    return () => setSessionActive(false);
  }, []);

  const producing = card.format.startsWith("produce");

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    // Played inside the click/keydown handler so it counts as a user gesture, and
    // only on reveal — never on the front. On a produce step the front asks for
    // the Thai, and audio before the commit would answer the question out loud.
    playAudio(card.audioUrl);
  }

  function advance() {
    startTransition(() => {
      router.refresh();
    });
  }

  function selfGrade(passed: boolean) {
    if (answered) return;
    setAnswered(true);
    // Belt-and-braces. Reveal state survives a re-render that keeps the same
    // card.id, so a round that hands the same card back — legitimate when it is
    // the only one left unfinished — would otherwise show it face-up.
    setRevealed(false);
    // In practice there is nothing to submit: the Learner has already seen the
    // answer, and the verdict is theirs alone. Just draw the next card.
    if (mode === "practice") return advance();
    startTransition(async () => {
      await submitAdvancedSelfGrade(card.id, card.step, passed);
      router.refresh();
    });
  }

  function choose(choice: string) {
    if (answered) return;
    setAnswered(true);
    startTransition(async () => {
      const result =
        mode === "practice"
          ? await gradeAdvancedChoice(card.id, card.step, choice)
          : await submitAdvancedChoice(card.id, card.step, choice);
      setVerdict({ chosen: choice, ...result });
      // The plan's one audio rule: it fires on the COMMIT, alongside the
      // feedback, never before it.
      playAudio(card.audioUrl);
      setTimeout(advance, FEEDBACK_MS);
    });
  }

  // The answer is committed and the next card is being fetched. Showing a
  // spinner instead of the answered card stops it sitting frozen on screen — but
  // NOT while multiple-choice feedback is up, which is the one thing the Learner
  // is meant to be reading.
  if (pending && verdict === null && answered) {
    return (
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 py-16 animate-fade-in">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-sage border-t-brand"
          aria-hidden
        />
        <p className="text-sm text-foreground-muted">Next card…</p>
      </div>
    );
  }

  if (card.format === "recognise-mc" || card.format === "produce-mc") {
    // Only vocab reaches a multiple-choice step — the phrase ladder is a single
    // rung of recognise-card — so the prompt below reads the vocab payload
    // directly rather than branching on kind.
    const entry = card.kind === "vocab" ? card.payload : null;
    if (!entry) return null;

    return (
      <McQuestion
        eyebrow={producing ? "Which is the Thai?" : "What does it mean?"}
        prompt={
          producing ? (
            <p className="text-[clamp(1.25rem,5vw,1.75rem)] font-medium leading-snug text-foreground">
              {entry.gloss}
            </p>
          ) : (
            <p
              className={`${thai} text-[clamp(2rem,9vw,3.25rem)] font-medium leading-tight text-foreground`}
            >
              {entry.thai}
            </p>
          )
        }
        options={card.options ?? []}
        // Thai options need the Learner's chosen letterform; English ones must not
        // get it, or the gloss renders in a Thai-first cut.
        optionClassName={producing ? `${thai} text-lg` : "text-sm"}
        verdict={verdict}
        pending={pending}
        onChoose={choose}
      />
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 animate-slide-up-fade">
      {card.kind === "vocab" ? (
        <VocabLexemeSlab
          entry={card.payload}
          audioUrl={card.audioUrl}
          revealed={revealed}
          onReveal={reveal}
          direction={producing ? "produce" : "recognise"}
        />
      ) : (
        <PhraseSlab
          phrase={card.payload}
          audioUrl={card.audioUrl}
          revealed={revealed}
          onReveal={reveal}
        />
      )}

      {!revealed ? (
        <RevealButton onClick={reveal} />
      ) : (
        <PassFailRow pending={pending} onGrade={selfGrade} />
      )}
    </div>
  );
}
