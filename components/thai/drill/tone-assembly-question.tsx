"use client";

import { useState } from "react";
import type { DrillOption, DrillStep } from "@/lib/thai/types";

interface Props {
  steps: DrillStep[];
  disabled: boolean;
  // Called exactly once, when the learner answers the LAST step — the parent
  // (DrillSession) owns submitting that value to the server (M13/A2 contract:
  // "One thai_attempts row per completed question ... expected vs chosen
  // FINAL tone"). Every earlier step's feedback is purely local/unlogged.
  onFinalStepAnswered: (chosenValue: string) => void;
}

// M13/A2 — the `tone-assembly` branching builder: class -> mark present? ->
// [marked: mark+class tone] / [unmarked: live/dead -> (dead:) vowel length ->
// tone]. Each step gives immediate right/wrong feedback and a "Continue"
// button; the whole question resolves to one server-logged attempt on the
// FINAL tone step (lib/thai/drill.ts's buildToneAssemblySteps).
export function ToneAssemblyQuestion({ steps, disabled, onFinalStepAnswered }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const answered = chosen !== null;

  function choose(option: DrillOption) {
    if (answered || disabled) return;
    setChosen(option.value);
    if (isLastStep) {
      onFinalStepAnswered(option.value);
    }
  }

  function continueToNextStep() {
    setStepIndex((i) => i + 1);
    setChosen(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        Step {stepIndex + 1} / {steps.length}
      </div>
      <div className="text-center text-base text-foreground">{step.prompt}</div>
      <div className="grid grid-cols-2 gap-3">
        {step.options.map((option) => {
          const isChosen = chosen === option.value;
          const isCorrectOption = option.value === step.correct;
          // Explicit text-foreground on the default state (a11y — UA default
          // button text colour is black, invisible on a dark surface).
          let style = "border-border-base bg-surface text-foreground hover:bg-background";
          if (answered) {
            if (isCorrectOption) style = "border-success bg-success text-white";
            else if (isChosen) style = "border-clay bg-clay text-on-earthy";
          }
          return (
            <button
              key={option.value}
              type="button"
              disabled={answered || disabled}
              onClick={() => choose(option)}
              className={`rounded-[var(--r-lg)] border-2 px-4 py-3 text-center font-mono text-base transition-colors disabled:cursor-default ${style}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {answered && !isLastStep && (
        <button
          type="button"
          onClick={continueToNextStep}
          className="w-fit self-end rounded-[var(--r-pill)] bg-accent px-5 py-2 text-sm font-semibold text-on-earthy transition-opacity hover:opacity-90"
        >
          Continue
        </button>
      )}
    </div>
  );
}
