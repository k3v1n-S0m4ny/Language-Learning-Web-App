"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitExamAnswer, type SubmitExamAnswerResult } from "@/lib/thai/exam-actions";
import type { ExamMode, ExamModeStats, HydratedExamCard } from "@/lib/thai/exam";
import { AudioPlayButton } from "@/components/thai/audio-play-button";
import { Celebration } from "@/components/ui/celebration";

const EXAM_KEY = "consonants";

const MODE_LABELS: Record<ExamMode, string> = {
  flashcard: "Read the letter",
  "letter-sound": "Pick the sound",
  "letter-class": "Pick the class",
  "audio-letter": "Hear it, pick the letter",
};

const EXAM_MODE_ORDER: ExamMode[] = ["flashcard", "letter-sound", "letter-class", "audio-letter"];

interface FirstTryStats {
  overall: ExamModeStats;
  perMode: Record<ExamMode, ExamModeStats>;
}

interface Props {
  firstCard: HydratedExamCard | null;
  clearedCount: number;
  total: number;
  firstTry: FirstTryStats;
  slips: number;
  // Whether unit 6 was still locked when this page rendered — the confetti
  // unlock celebration on the summary screen (mirroring flashcard-session.tsx
  // / drill-session.tsx's own gate) fires only when clearing THIS session is
  // what took unit 6 from locked to unlocked.
  unitSixWasLocked: boolean;
}

interface Summary {
  firstTry: FirstTryStats;
  slips: number;
}

function percent(stats: ExamModeStats): number {
  if (stats.seen === 0) return 0;
  return Math.round((stats.correct / stats.seen) * 100);
}

export function ExamSession({
  firstCard,
  clearedCount: initialClearedCount,
  total,
  firstTry: initialFirstTry,
  slips: initialSlips,
  unitSixWasLocked,
}: Props) {
  const [card, setCard] = useState<HydratedExamCard | null>(firstCard);
  const [clearedCount, setClearedCount] = useState(initialClearedCount);
  // Live "slips so far" readout in the header (updated from every answer's
  // result, resume-aware via the initial props on a reload mid-deck).
  const [slips, setSlips] = useState(initialSlips);
  const [firstTryStats, setFirstTryStats] = useState<FirstTryStats>(initialFirstTry);
  // Flashcard-mode reveal (front glyph -> flip to check sound/name/audio).
  const [flipped, setFlipped] = useState(false);
  // MCQ-mode answering/revealed phase (mirrors components/thai/drill/
  // drill-session.tsx): the option grid answers immediately submit and fetch
  // the next card server-side, but the learner still sees the reveal
  // (correct/incorrect highlight) before advancing via "Next".
  const [phase, setPhase] = useState<"answering" | "revealed">("answering");
  const [chosen, setChosen] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [pendingResult, setPendingResult] = useState<SubmitExamAnswerResult | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pending, startTransition] = useTransition();

  if (!card && !summary) {
    return (
      <div className="rounded-[var(--r-lg)] border border-border-base bg-surface p-6 text-sm text-foreground-muted">
        The exam deck is empty — nothing to review yet.
      </div>
    );
  }

  function submit(answer: string) {
    if (!card || pending) return;
    setChosen(answer);
    startTransition(async () => {
      const result = await submitExamAnswer(EXAM_KEY, card.itemId, card.mode, answer);
      setLastCorrect(result.correct);

      if (card.mode === "flashcard") {
        // Self-graded flashcards advance immediately, same as
        // flashcard-session.tsx's own grade() flow — no extra reveal gate.
        applyResult(result);
        return;
      }

      // MCQ modes: hold on the reveal until the learner presses "Next".
      setPendingResult(result);
      setPhase("revealed");
    });
  }

  function applyResult(result: SubmitExamAnswerResult) {
    setClearedCount(result.clearedCount);
    setSlips(result.slips);
    setFirstTryStats(result.firstTry);
    setFlipped(false);
    setPhase("answering");
    setChosen(null);
    setLastCorrect(null);
    setPendingResult(null);
    if (result.done) {
      setCard(null);
      setSummary({ firstTry: result.firstTry, slips: result.slips });
    } else {
      setCard(result.nextCard);
    }
  }

  function next() {
    if (!pendingResult) return;
    applyResult(pendingResult);
  }

  if (summary) {
    const unlockedThisRound = unitSixWasLocked;
    return (
      <div className="flex flex-col gap-6 rounded-[var(--r-lg)] border border-border-base bg-surface p-6 animate-slide-up-fade">
        <h2 className="text-lg font-semibold text-foreground">Exam cleared</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Cards cleared" value={`${total} / ${total}`} />
          <StatTile label="First-try accuracy" value={`${percent(summary.firstTry.overall)}%`} />
          <StatTile label="Slips" value={summary.slips} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {EXAM_MODE_ORDER.map((mode) => (
            <StatTile key={mode} label={MODE_LABELS[mode]} value={`${percent(summary.firstTry.perMode[mode])}%`} />
          ))}
        </div>
        {unlockedThisRound && (
          <Celebration show>
            <div className="rounded-[var(--r-md)] bg-highlight px-4 py-3 text-sm font-semibold text-on-earthy animate-pop-in">
              🎉 Unit 6 unlocked!
            </div>
          </Celebration>
        )}
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-[var(--r-pill)] bg-accent px-5 py-2 text-sm font-semibold text-on-earthy transition-opacity hover:opacity-90"
          >
            Back to units
          </Link>
        </div>
      </div>
    );
  }

  // The exam deck just cleared: applyResult's setCard(null) commits in the
  // same tick as the summary being set on the NEXT event-loop turn (the
  // useTransition callback resolves asynchronously) — mirror
  // flashcard-session.tsx's own guard against dereferencing a null card here.
  if (!card) {
    return (
      <div className="rounded-[var(--r-lg)] border border-border-base bg-surface p-6 text-sm text-foreground-muted">
        Finishing…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        Cleared {clearedCount} / {total} · {MODE_LABELS[card.mode]}
        {firstTryStats.overall.seen > 0 && ` · ${percent(firstTryStats.overall)}% first-try`}
        {slips > 0 && ` · ${slips} slip${slips === 1 ? "" : "s"}`}
      </div>

      {card.mode === "flashcard" ? (
        <FlashcardModeCard card={card} flipped={flipped} onFlip={() => setFlipped(true)} onGrade={(known) => submit(known ? "known" : "missed")} pending={pending} />
      ) : (
        <McqModeCard
          card={card}
          phase={phase}
          chosen={chosen}
          lastCorrect={lastCorrect}
          pending={pending}
          onAnswer={submit}
          onNext={next}
        />
      )}
    </div>
  );
}

function FlashcardModeCard({
  card,
  flipped,
  onFlip,
  onGrade,
  pending,
}: {
  card: Extract<HydratedExamCard, { mode: "flashcard" }>;
  flipped: boolean;
  onFlip: () => void;
  onGrade: (knewIt: boolean) => void;
  pending: boolean;
}) {
  return (
    <>
      <div className="flex min-h-[16rem] flex-col items-center justify-center gap-5 rounded-[var(--r-lg)] border border-border-base bg-surface p-8">
        <div className="font-thai-looped text-[6rem] leading-none text-foreground">{card.glyph}</div>
        {flipped ? (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="flex gap-3">
              <SoundTile label="Initial" ipa={card.sound} />
              <SoundTile label="Final" ipa={card.finalSound} />
            </div>
            <div className="font-thai-looped text-lg text-foreground">{card.name}</div>
            {card.nameIpa && (
              <div className="font-mono text-sm text-foreground-muted">[{card.nameIpa}]</div>
            )}
            {card.audioUrl && <AudioPlayButton url={card.audioUrl} label="▶ Hear it" size="sm" />}
          </div>
        ) : (
          <button
            type="button"
            onClick={onFlip}
            disabled={pending}
            className="rounded-[var(--r-pill)] border border-border-base px-5 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-background disabled:opacity-60"
          >
            Tap to reveal
          </button>
        )}
      </div>

      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onGrade(false)}
            disabled={pending}
            className="rounded-[var(--r-lg)] border-2 border-clay bg-clay px-4 py-3 text-center font-medium text-on-earthy transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Missed it
          </button>
          <button
            type="button"
            onClick={() => onGrade(true)}
            disabled={pending}
            className="rounded-[var(--r-lg)] border-2 border-success bg-success px-4 py-3 text-center font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Knew it
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-foreground-muted">
          Say the sound out loud, then reveal to check.
        </p>
      )}
    </>
  );
}

function McqModeCard({
  card,
  phase,
  chosen,
  lastCorrect,
  pending,
  onAnswer,
  onNext,
}: {
  card: Extract<HydratedExamCard, { mode: "letter-sound" | "letter-class" | "audio-letter" }>;
  phase: "answering" | "revealed";
  chosen: string | null;
  lastCorrect: boolean | null;
  pending: boolean;
  onAnswer: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <>
      <div className="flex flex-col items-center gap-4 rounded-[var(--r-lg)] border border-border-base bg-surface p-8">
        {card.promptKind === "audio" ? (
          card.audioUrl && <AudioPlayButton url={card.audioUrl} label="▶ Play clip" />
        ) : (
          <div className="text-center font-thai text-[4.8rem] text-foreground">{card.prompt}</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {card.options.map((option) => {
          const isChosen = chosen === option.value;
          const isCorrectOption = option.value === card.correct;
          let style = "border-border-base bg-surface text-foreground hover:bg-background";
          if (phase === "revealed") {
            if (isCorrectOption) style = "border-success bg-success text-white";
            else if (isChosen) style = "border-clay bg-clay text-on-earthy";
          }
          return (
            <button
              key={option.value}
              type="button"
              disabled={phase === "revealed" || pending}
              onClick={() => onAnswer(option.value)}
              className={`rounded-[var(--r-lg)] border-2 px-4 py-3 text-center font-mono text-lg transition-colors disabled:cursor-default ${style}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {phase === "revealed" && (
        <div className="flex items-center justify-between gap-3">
          {lastCorrect === false && (
            <div className="text-xs text-foreground-muted">
              Correct answer: <span className="font-mono">{card.correct}</span>
            </div>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={pending}
            className="ml-auto w-fit rounded-[var(--r-pill)] bg-accent px-5 py-2 text-sm font-semibold text-on-earthy transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

function SoundTile({ label, ipa }: { label: string; ipa: string | null }) {
  return (
    <div className="min-w-[5rem] rounded-[var(--r-md)] bg-background px-4 py-2 text-center">
      <div className="text-[0.65rem] uppercase tracking-wide text-foreground-muted">{label}</div>
      <div className="font-mono text-xl text-foreground">{ipa ? `/${ipa}/` : "—"}</div>
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
