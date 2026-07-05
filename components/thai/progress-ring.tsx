"use client";

import { motion, useReducedMotion } from "motion/react";

// Small SVG progress ring for a unit's mastery percentage (A4).
//
// Client leaf (Phase 3): the active stroke animates from empty (full offset)
// to its target offset on mount with a spring. This is a contained "use client"
// boundary — unit-row.tsx stays a server component and simply renders this leaf.
// Reduced-motion renders the static final offset (no animation).
const SIZE = 44;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({
  percent,
  locked,
}: {
  percent: number;
  locked: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);
  // Active stroke uses the per-language accent (saffron in the Thai
  // [data-lang="thai"] context) instead of the old shared --color-brand.
  const color = locked ? "var(--foreground-muted)" : "var(--accent)";

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="var(--border)"
        strokeWidth={STROKE}
      />
      <motion.circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeDasharray={CIRCUMFERENCE}
        strokeLinecap="round"
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        initial={reduceMotion ? false : { strokeDashoffset: CIRCUMFERENCE }}
        animate={{ strokeDashoffset: offset }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontWeight={600}
        fill="var(--foreground)"
      >
        {clamped}%
      </text>
    </svg>
  );
}
