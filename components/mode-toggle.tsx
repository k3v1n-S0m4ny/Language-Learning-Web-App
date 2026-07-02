"use client";

import { useTransition } from "react";
import { setActiveMode } from "@/lib/thai/actions";
import type { ActiveMode } from "@/lib/thai/types";

// Persisted Mandarin/Thai switch shown on the home header (A3). The active
// mode drives which flow app/page.tsx renders; `refresh()` inside
// setActiveMode re-renders the page once the write lands.
export function ModeToggle({ activeMode }: { activeMode: ActiveMode }) {
  const [pending, startTransition] = useTransition();

  function choose(mode: ActiveMode) {
    if (mode === activeMode || pending) return;
    startTransition(async () => {
      await setActiveMode(mode);
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-border-base bg-surface p-1 text-xs font-medium">
      {(["mandarin", "thai"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          disabled={pending}
          onClick={() => choose(mode)}
          className={`rounded-full px-3 py-1 capitalize transition-colors disabled:opacity-60 ${
            activeMode === mode
              ? "bg-brand text-white"
              : "text-foreground-muted hover:bg-background"
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
