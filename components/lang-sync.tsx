"use client";

import { useEffect } from "react";

// Sets [data-lang] on <html> from the server-persisted active mode so the
// per-language accents + ambient mesh switch with the product. The root layout
// can't know the mode without an extra per-route query, so each page that knows
// its mode renders this. Effect-only (post-hydration); accents aren't applied to
// content surfaces in Phase 0, so a one-frame default is imperceptible.
export function LangSync({ activeMode }: { activeMode: "mandarin" | "thai" }) {
  useEffect(() => {
    document.documentElement.dataset.lang = activeMode;
  }, [activeMode]);
  return null;
}
