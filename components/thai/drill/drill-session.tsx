"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { getUnitProgressSnapshot, submitThaiAttempt } from "@/lib/thai/actions";
import type { DrillOption, DrillQuestion } from "@/lib/thai/types";
import { AudioPlayButton } from "@/components/thai/audio-play-button";

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

  const question = questions[index];
  const total = questions.length;

  const optionOrder = useMemo(() => question?.options ?? [], [question]);

  if (!total) {
    return (
      <div className="rounded-xl border border-border-base bg-surface p-6 text-sm text-foreground-muted">
        No drill questions are available for this unit yet.
      </div>
    );
  }

  function answer(option: DrillOption) {
    if (phase !== "answering" || pending) return;
    setChosen(option.value);
    startTransition(async () => {
      // itemId/drillType only — the server re-derives the expected answer
      // from thai_items rather than trusting a client-supplied value (M11
      // review round 2, HIGH fix).
      const result = await submitThaiAttempt(question.itemId, question.drillType, option.value);
      setLastCorrect(result.correct);
      if (result.correct) setCorrectCount((c) => c + 1);
      if (result.newlyMastered) {
        setNewlyMasteredIds((ids) => [...ids, question.itemId]);
      }
      setPhase("revealed");
    });
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
      setSummary(snap);
      setPhase("summary");
    });
  }

  if (phase === "summary" && summary) {
    const unlockedThisRound = summary.nextUnitNewlyUnlocked && !nextUnitWasUnlocked;
    return (
      <div className="flex flex-col gap-6 rounded-xl border border-border-base bg-surface p-6 animate-slide-up-fade">
        <h2 className="text-lg font-semibold text-foreground">Round complete</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Score" value={`${correctCount} / ${total}`} />
          <StatTile label="Newly mastered" value={newlyMasteredIds.length} />
          <StatTile label={`Unit ${unit}`} value={`${summary.percentMastered}%`} />
        </div>
        {unlockedThisRound && (
          <div className="rounded-lg bg-highlight px-4 py-3 text-sm font-semibold text-on-earthy animate-pop-in">
            🎉 Unit {summary.nextUnit} unlocked!
          </div>
        )}
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Back to units
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        Question {index + 1} / {total}
      </div>

      <div className="flex flex-col items-center gap-4 rounded-xl border border-border-base bg-surface p-8">
        {question.promptKind === "audio" ? (
          question.audioUrl && <AudioPlayButton url={question.audioUrl} label="▶ Play clip" />
        ) : (
          <div
            className={`text-center ${
              question.promptKind === "consonant" || question.promptKind === "syllable"
                ? "font-thai text-5xl"
                : "font-mono text-3xl"
            } text-foreground`}
          >
            {question.prompt}
          </div>
        )}
        {question.promptKind !== "audio" && question.audioUrl && (
          <AudioPlayButton url={question.audioUrl} label="▶ Hear it" size="sm" />
        )}
        {phase === "revealed" && question.gloss && (
          <div className="text-sm italic text-foreground-muted animate-fade-in">
            &lsquo;{question.gloss}&rsquo;
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {optionOrder.map((option) => {
          const isChosen = chosen === option.value;
          const isCorrectOption = option.value === question.correct;
          let style = "border-border-base bg-surface hover:bg-background";
          if (phase === "revealed") {
            if (isCorrectOption) style = "border-success bg-success text-white";
            else if (isChosen) style = "border-clay bg-clay text-on-earthy";
          }
          return (
            <button
              key={option.value}
              type="button"
              disabled={phase === "revealed" || pending}
              onClick={() => answer(option)}
              className={`rounded-xl border-2 px-4 py-3 text-center font-mono text-lg transition-colors disabled:cursor-default ${style}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {phase === "revealed" && (
        <button
          type="button"
          onClick={next}
          disabled={pending}
          className="w-fit self-end rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {index + 1 < total ? "Next" : "Finish round"}
        </button>
      )}

      {lastCorrect === false && phase === "revealed" && (
        <div className="text-xs text-foreground-muted">
          Correct answer: <span className="font-mono">{question.correct}</span>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <div className="text-xs text-foreground-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
