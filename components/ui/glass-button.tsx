"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

// Pressable glass button primitive (glass redesign, Phase 0): the `.glass` recipe
// on a pill, with a spring press (specular sheen + squash). Reduced-motion users
// get no scale animation. An explicit text color is always set — the UA default
// is black, which is invisible on the dark glass surface (a11y note in the spec).
type GlassButtonProps = HTMLMotionProps<"button">;

export function GlassButton({
  className = "",
  children,
  ...props
}: GlassButtonProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      whileTap={reduceMotion ? undefined : { scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`glass rounded-[var(--r-pill)] px-4 py-2 text-sm font-medium text-foreground transition-colors ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
