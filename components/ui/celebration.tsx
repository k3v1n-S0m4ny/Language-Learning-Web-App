"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

const PARTICLE_COUNT = 26;
// Confetti particles cycle through the active language's own accent triad
// (jade/vermilion/gold for Mandarin, saffron/teal/ruby for Thai — resolved
// per [data-lang] at paint time), so a burst always feels native to
// whichever product fired it rather than reading as generic.
const PARTICLE_COLOR_VARS = ["var(--accent)", "var(--accent-2)", "var(--accent-3)"];

interface Particle {
  id: number;
  xVw: number;
  delay: number;
  rotate: number;
  colorVar: string;
}

function buildParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    xVw: (Math.random() - 0.5) * 70,
    delay: Math.random() * 0.25,
    rotate: Math.random() < 0.5 ? 360 : -360,
    colorVar: PARTICLE_COLOR_VARS[i % PARTICLE_COLOR_VARS.length],
  }));
}

// Self-contained one-shot burst. Mounts already visible (the initial state
// itself IS "on" — no effect needed to turn it on) and turns itself off via
// a timer whose CALLBACK calls setState; that is the React-sanctioned
// "calling setState in a callback function" pattern (not a synchronous
// setState call in the effect body itself), so it doesn't trip
// react-hooks/set-state-in-effect. Celebration below re-mounts this with a
// fresh `key` each time a new burst should fire.
function ConfettiBurst() {
  const [visible, setVisible] = useState(true);
  const particles = useMemo(() => buildParticles(), []);

  useEffect(() => {
    const clear = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(clear);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-0 block h-2.5 w-2.5 rounded-[3px]"
          style={{ background: p.colorVar }}
          initial={{ x: `${p.xVw}vw`, y: "-5vh", opacity: 1, rotate: 0 }}
          animate={{ y: "75vh", opacity: 0, rotate: p.rotate }}
          transition={{ duration: 1.4, delay: p.delay, ease: [0.4, 0, 0.2, 1] }}
        />
      ))}
    </div>
  );
}

// Milestone celebration (Phase 3): confetti burst + spring "pop" on the
// wrapped message. RESERVED for genuine milestones — callers gate `show` to
// a real event (unit unlock, deck cleared this session), never a routine
// render.
//
// `show` may already be true at mount (drill-session's unlock banner mounts
// fresh each round with show already true) OR may flip true later on an
// already-mounted instance (empty-state.tsx's async sessionStorage check
// updates its own state after mount, which flows down as a prop change
// here). Both are handled WITHOUT a `useEffect` + synchronous `setState`:
// the initial burst (if `show` starts true) comes from a lazy `useState`
// initializer; a later true transition is caught by React's documented
// "adjust state during render" pattern — see
// https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
// — which is a plain conditional setState call during render, not inside an
// effect, so react-hooks/set-state-in-effect does not apply to it.
//
// Reduced-motion: skips confetti AND the spring pop entirely — the
// milestone message still renders, just statically (mandatory fallback).
//
// Post-review fix: the spring-pop branch below is now ALSO gated on `show`
// (not just `reduceMotion`). Previously it wrapped `children` in the
// animated `motion.div` whenever `!reduceMotion`, with no dependency on
// `show` at all — so empty-state.tsx's every idle revisit (show=false,
// motion allowed) still played the scale/opacity pop on the whole "All
// caught up" card, even though confetti was correctly suppressed. Constraint
// #4 reserves the WHOLE celebration effect (confetti AND bounce) for a
// genuine milestone, not just the confetti half.
export function Celebration({ show, children }: { show: boolean; children?: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [prevShow, setPrevShow] = useState(show);
  const [burstId, setBurstId] = useState(() => (show && !reduceMotion ? 1 : 0));

  if (show !== prevShow) {
    setPrevShow(show);
    if (show && !reduceMotion) {
      setBurstId((id) => id + 1);
    }
  }

  return (
    <>
      {show && !reduceMotion ? (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        >
          {children}
        </motion.div>
      ) : (
        <div>{children}</div>
      )}

      {burstId > 0 && !reduceMotion && <ConfettiBurst key={burstId} />}
    </>
  );
}
