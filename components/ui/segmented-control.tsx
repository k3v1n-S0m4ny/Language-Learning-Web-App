"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";

// Glass segmented control (glass redesign, Phase 0). A radiogroup with a spring
// sliding indicator (motion layout animation). Used by the theme toggle now and
// the mode toggle later. Explicit text colors on every option (dark-glass a11y).
type Option<T extends string> = {
  value: T;
  label: ReactNode;
  title?: string;
};

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="glass inline-flex items-center gap-1 rounded-[var(--r-pill)] p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`relative rounded-[var(--r-pill)] px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "text-foreground" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId={`${groupId}-indicator`}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 400, damping: 32 }
                }
                className="absolute inset-0 rounded-[var(--r-pill)] bg-[var(--glass-bg-strong)] shadow-[inset_0_1px_0_0_var(--glass-spec)]"
                style={{ zIndex: 0 }}
              />
            )}
            <span className="relative" style={{ zIndex: 1 }}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
