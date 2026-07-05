"use client";

import { motion, useReducedMotion } from "motion/react";

// Route-change entrance (Phase 3). A template.tsx (unlike layout.tsx) remounts
// on every navigation, so this fades + lifts each new route in. Entrance-only
// (no AnimatePresence / exit) — an exit animation would fight App Router
// streaming, and the codebase uses no AnimatePresence anywhere. Reduced-motion
// renders a plain wrapper with no animation.
export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}
