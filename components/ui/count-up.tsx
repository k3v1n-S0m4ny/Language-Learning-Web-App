"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

type CountUpProps = {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
};

// Animated 0 -> value count-up (Phase 3 stats hero moment). Presentation-only:
// the parent computes `value`, this just interpolates the display text.
//
// Reduced-motion: the effect below is a no-op (returns immediately) and the
// render simply uses `value` directly instead of the animated `display`
// state — so there is no synchronous setState call in the reduced-motion
// path at all (mandatory fallback: no animation, exact final value shown
// immediately).
//
// Non-reduced-motion: `display` is only ever updated from INSIDE motion's
// `animate()` callbacks (`onUpdate`/`onComplete`), which run asynchronously
// off the animation loop — never a direct synchronous setState call in the
// effect body itself. `onComplete` always sets the display to the exact
// `value` prop (not the animation's last interpolated frame), so it never
// has an off-by-one from mid-flight rounding.
export function CountUp({ value, durationMs = 900, format, className = "" }: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString());
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduceMotion) return;
    const from = fromRef.current;
    const controls = animate(from, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
      onComplete: () => setDisplay(value),
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, reduceMotion, durationMs]);

  return <span className={className}>{fmt(reduceMotion ? value : display)}</span>;
}
