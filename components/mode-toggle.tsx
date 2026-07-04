"use client";

import { useTransition } from "react";
import { setActiveMode } from "@/lib/thai/actions";
import type { ActiveMode } from "@/lib/thai/types";
import { SegmentedControl } from "./ui/segmented-control";

// Persisted Mandarin/Thai switch shown on the home header (A3), now the
// glass segmented-control referenced by the floating top bar spec ("mode
// segmented-control"). The active mode drives which flow app/page.tsx
// renders; `refresh()` inside setActiveMode re-renders the page once the
// write lands. Note: this is a SHARED component — Thai's home header (kept
// visually as-is for Phase 2) also renders this, so its mode toggle now
// picks up the glass look too; that is an intentional, minimal exception to
// "leave Thai untouched" since mode-toggle.tsx is listed as a shared Phase 1
// file in the design spec's critical-files list.
export function ModeToggle({ activeMode }: { activeMode: ActiveMode }) {
  const [pending, startTransition] = useTransition();

  function choose(mode: ActiveMode) {
    if (mode === activeMode || pending) return;
    startTransition(async () => {
      await setActiveMode(mode);
    });
  }

  return (
    <SegmentedControl<ActiveMode>
      ariaLabel="Mode"
      value={activeMode}
      onChange={choose}
      disabled={pending}
      options={[
        { value: "mandarin", label: "Mandarin" },
        { value: "thai", label: "Thai" },
      ]}
    />
  );
}
