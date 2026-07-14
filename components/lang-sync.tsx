"use client";

import { useEffect } from "react";

// Sets [data-lang] on <html> from the server-persisted active mode so the
// per-language accents + ambient mesh switch with the product. The root layout
// can't know the mode without an extra per-route query, so each page that knows
// its mode renders this. Effect-only (post-hydration); accents aren't applied to
// content surfaces in Phase 0, so a one-frame default is imperceptible.
//
// The prop is deliberately WIDER than ActiveMode (the learner_settings.active_mode
// union). "advanced-thai" is a third [data-lang] palette — see globals.css — but
// it is not yet a persistable mode, because until Phase B ships an Advanced-Thai
// home screen there would be nothing for app/page.tsx to render if a learner were
// switched into it. A page can therefore *paint* as Advanced Thai without a
// learner being able to get *stranded* in it.
type LangKey = "mandarin" | "thai" | "advanced-thai";

export function LangSync({ activeMode }: { activeMode: LangKey }) {
  useEffect(() => {
    document.documentElement.dataset.lang = activeMode;
    // Notify same-tab subscribers (the bottom nav reads mode from this dataset
    // via useSyncExternalStore) — a dataset write emits no native event.
    window.dispatchEvent(new Event("langchange"));
  }, [activeMode]);
  return null;
}
