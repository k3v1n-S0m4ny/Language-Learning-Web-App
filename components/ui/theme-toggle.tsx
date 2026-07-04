"use client";

import { useSyncExternalStore } from "react";
import { SegmentedControl } from "./segmented-control";

type Theme = "light" | "dark";

// Glass theme toggle (glass redesign, Phase 0). Flips [data-theme] on <html> and
// persists to localStorage — the no-flash script in layout.tsx reads it back
// before paint on the next load. Theme lives on the DOM (external store), so we
// read it with useSyncExternalStore rather than mirroring into React state; this
// avoids a hydration mismatch and the setState-in-effect anti-pattern, and the
// storage listener keeps multiple tabs in sync for free.
function subscribe(callback: () => void) {
  window.addEventListener("themechange", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("themechange", callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, getSnapshot, () => "light");

  function apply(next: Theme) {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode / storage disabled — theme still applies this session */
    }
    window.dispatchEvent(new Event("themechange"));
  }

  return (
    <SegmentedControl<Theme>
      ariaLabel="Theme"
      value={theme}
      onChange={apply}
      options={[
        { value: "light", label: "Light", title: "Light theme" },
        { value: "dark", label: "Dark", title: "Dark theme" },
      ]}
    />
  );
}
