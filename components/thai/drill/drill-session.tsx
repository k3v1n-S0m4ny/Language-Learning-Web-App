"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { haptic } from "@/lib/ux/haptics";
import { playSfx } from "@/lib/ux/sfx";
import { setSessionActive } from "@/lib/ux/session-focus";
import { getUnitProgressSnapshot, submitThaiAttempt } from "@/lib/thai/actions";
import { TONE_LABELS } from "@/lib/thai/tone";
import type { DrillOption, DrillQuestion } from "@/lib/thai/types";
import type { Tone } from "@/seed/thai/types";
import { AudioPlayButton } from "@/components/thai/audio-play-button";
import { Celebration } from "@/components/ui/celebration";
import { PhraseSplitQuestion } from "./phrase-split-question";
import { ToneAssemblyQuestion } from "./tone-assembly-question";

interface Props {
  unit: number;
  questions: DrillQuestion[];
  nextUnitWasUnlocked: boolean;
}

type Phase = "answering" | "revealed" | "summary";

export function DrillSession({ unit, questions, nextUnitWasUnlocked }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [chosen, setChosen] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [newlyMasteredIds, setNewlyMasteredIds] = useState<string[]>([]);
  const [summary, setSummary] = useState<{
    percentMastered: number;
    nextUnitNewlyUnlocked: boolean;
    nextUnit: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();
  // House press spring (500/30) — shared by the option tiles and the flow
  // buttons; no scale for reduced-motion users.
  const pressSpring = { type: "spring" as const, stiffness: 500, damping: 30 };
  const whileTapPress = reduceMotion ? undefined : { scale: 0.97 };

  // Recede the bottom nav while actively drilling (Phase 4); restore it on the
  // summary screen so the learner can navigate away, and on unmount.
  useEffect(() => {
    setSessionActive(phase !== "summary");
    return () => setSessionActive(false);
  }, [phase]);

  const question = questions[index];
  const total = questions.length;

  const optionOrder = useMemo(() => question?.options ?? [], [question]);

  if (!total) {
    return (
      <div className="rounded-[var(--r-lg)] border border-border-base bg-surface p-6 text-sm text-foreground-muted">
        No drill questions are available for this unit yet.
      </div>
    );
  }

  function submitAnswer(value: string) {
    if (phase !== "answering" || pending) return;
    setChosen(value);
    startTransition(async () => {
      // itemId/drillType only — the server re-derives the expected answer
      // from thai_items rather than trusting a client-supplied value (M11
      // review round 2, HIGH fix). For tone-assembly, `value` is the FINAL
      // step's chosen tone — every earlier step's feedback is local-only
      // (M13/A2 contract: one attempt row per completed question).
      const result = await submitThaiAttempt(question.itemId, question.drillType, value);
      setLastCorrect(result.correct);
      // Answer feedback (Phase 3): haptics self-gate (feature + pref +
      // reduced-motion); sound follows the mute pref only. The visual
      // pulse/shake is driven off `lastCorrect` on the tile below, itself
      // reduced-motion-gated by the CSS keyframe.
      if (result.correct) {
        setCorrectCount((c) => c + 1);
        haptic("success");
        playSfx("correct");
      } else {
        haptic("error");
        playSfx("incorrect");
      }
      if (result.newlyMastered) {
        setNewlyMasteredIds((ids) => [...ids, question.itemId]);
      }
      setPhase("revealed");
    });
  }

  function answer(option: DrillOption) {
    submitAnswer(option.value);
  }

  function next() {
    if (index + 1 < total) {
      setIndex((i) => i + 1);
      setChosen(null);
      setLastCorrect(null);
      setPhase("answering");
      return;
    }
    startTransition(async () => {
      const snap = await getUnitProgressSnapshot(unit);
      // Unlock feedback (Phase 3): fire from this gesture-initiated transition
      // (pressing Finish) — not from the summary render — so the AudioContext
      // is created inside a user gesture and the cue plays exactly once, on the
      // same condition that shows the confetti below.
      if (snap.nextUnitNewlyUnlocked && !nextUnitWasUnlocked) {
        haptic("unlock");
        playSfx("unlock");
      }
      setSummary(snap);
      setPhase("summary");
    });
  }

  if (phase === "summary" && summary) {
    const unlockedThisRound = summary.nextUnitNewlyUnlocked && !nextUnitWasUnlocked;
    return (
      <div className="flex flex-col gap-6 rounded-[var(--r-lg)] border border-border-base bg-surface p-6 animate-slide-up-fade">
        <h2 className="text-lg font-semibold text-foreground">Round complete</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Score" value={`${correctCount} / ${total}`} />
          <StatTile label="Newly mastered" value={newlyMasteredIds.length} />
          <StatTile label={`Unit ${unit}`} value={`${summary.percentMastered}%`} />
        </div>
        {unlockedThisRound && (
          // Genuine milestone (unit unlock) — the confetti burst is
          // reserved for exactly this event, gated by unlockedThisRound
          // itself (already true only once per round, since it requires
          // !nextUnitWasUnlocked — see the Props/computation above).
          <Celebration show>
            <div className="rounded-[var(--r-md)] bg-highlight px-4 py-3 text-sm font-semibold text-on-earthy animate-pop-in">
              🎉 Unit {summary.nextUnit} unlocked!
            </div>
          </Celebration>
        )}
        <div className="flex gap-2">
          <Link
            href="/"
            className="tap-press rounded-[var(--r-pill)] bg-accent px-5 py-2 text-sm font-semibold text-on-earthy transition-opacity hover:opacity-90"
          >
            Back to units
          </Link>
        </div>
      </div>
    );
  }

  // word-ipa (M13/A3): gloss + audio are revealed only after answering, so
  // the pronunciation clip can't be used to guess the tone/length before the
  // learner has committed — unlike the other drill types' always-visible
  // "hear it" hint, which predates this requirement.
  const hideAudioUntilRevealed = question.drillType === "word-ipa";
  // audio-word's options are real Thai words (need Noto Sans Thai shaping),
  // unlike every other drill type's options (IPA/class/tone-label strings).
  // Thai-script options get the ~1.6x a11y glyph-size bump (a Thai consonant
  // only fills ~50% of its font-size); Latin/IPA-string options don't need it.
  const optionFont = question.drillType === "audio-word" ? "font-thai text-[2.4rem]" : "font-mono text-lg";
  // M14/A5: phrase-split is not MC at all — the tap-boundary widget IS the
  // question (it renders the phrase itself), so the standard prompt box +
  // options grid are skipped entirely for this drill type.
  const isPhraseSplit = question.drillType === "phrase-split" && !!question.phrase;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        Question {index + 1} / {total}
      </div>

      {!isPhraseSplit && (
        <div className="flex flex-col items-center gap-4 rounded-[var(--r-lg)] border border-border-base bg-surface p-8">
          {question.promptKind === "audio" ? (
            question.audioUrl && <AudioPlayButton url={question.audioUrl} label="▶ Play clip" />
          ) : (
            <div
              className={`text-center ${
                question.promptKind === "consonant" || question.promptKind === "syllable"
                  ? "font-thai text-[4.8rem]"
                  : "font-mono text-3xl"
              } text-foreground`}
            >
              {question.prompt}
            </div>
          )}
          {question.promptKind !== "audio" &&
            question.audioUrl &&
            (!hideAudioUntilRevealed || phase === "revealed") && (
              <AudioPlayButton url={question.audioUrl} label="▶ Hear it" size="sm" />
            )}
          {phase === "revealed" && question.gloss && (
            <div className="text-sm italic text-foreground-muted animate-fade-in">
              &lsquo;{question.gloss}&rsquo;
            </div>
          )}
        </div>
      )}

      {isPhraseSplit ? (
        <PhraseSplitQuestion
          phrase={question.phrase!}
          correct={question.correct}
          disabled={pending}
          onSubmit={submitAnswer}
        />
      ) : question.drillType === "tone-assembly" && question.steps ? (
        phase === "answering" ? (
          <ToneAssemblyQuestion steps={question.steps} disabled={pending} onFinalStepAnswered={submitAnswer} />
        ) : (
          chosen && (
            <div className="text-sm text-foreground-muted">
              Your final answer: <b className="text-foreground">{TONE_LABELS[chosen as Tone] ?? chosen}</b>
            </div>
          )
        )
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {optionOrder.map((option) => {
            const isChosen = chosen === option.value;
            const isCorrectOption = option.value === question.correct;
            // Explicit text-foreground on the default state — UA default
            // button text colour is black, invisible on a dark surface (a11y).
            let style = "border-border-base bg-surface text-foreground hover:bg-background";
            let feedbackAnim = "";
            if (phase === "revealed") {
              if (isCorrectOption) style = "border-success bg-success text-white";
              else if (isChosen) style = "border-clay bg-clay text-on-earthy";
              // Pulse the learner's own choice when right; shake it when wrong.
              // Keyframes are gated in globals.css → no-op under reduce-motion.
              if (isChosen) {
                feedbackAnim = lastCorrect ? "animate-correct-pulse" : "animate-shake";
              }
            }
            return (
              <motion.button
                key={option.value}
                type="button"
                disabled={phase === "revealed" || pending}
                onClick={() => answer(option)}
                whileTap={phase === "revealed" || pending ? undefined : whileTapPress}
                transition={pressSpring}
                className={`focus-ring rounded-[var(--r-lg)] border-2 px-4 py-3 text-center transition-colors disabled:cursor-default ${optionFont} ${style} ${feedbackAnim}`}
              >
                {option.label}
              </motion.button>
            );
          })}
        </div>
      )}

      {phase === "revealed" && (
        <motion.button
          type="button"
          onClick={next}
          disabled={pending}
          whileTap={pending ? undefined : whileTapPress}
          transition={pressSpring}
          className="w-fit self-end rounded-[var(--r-pill)] bg-accent px-5 py-2 text-sm font-semibold text-on-earthy transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {index + 1 < total ? "Next" : "Finish round"}
        </motion.button>
      )}

      {lastCorrect === false && phase === "revealed" && !isPhraseSplit && (
        <div className="text-xs text-foreground-muted">
          Correct answer: <span className="font-mono">{question.correct}</span>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--r-md)] bg-background p-3">
      <div className="text-xs text-foreground-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
