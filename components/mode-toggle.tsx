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
export function ModeToggle({
  activeMode,
  showAdvancedThai = false,
}: {
  activeMode: ActiveMode;
  /**
   * Adds the third "Advanced" segment. Advanced Thai is the owner's personal
   * course, so only accounts on the lib/advanced-thai/access.ts allowlist see
   * it. This is UI scoping only — setActiveMode re-checks the allowlist
   * server-side and coerces anyone else away, because a Server Action is
   * reachable by direct POST whatever this component chooses to render.
   */
  showAdvancedThai?: boolean;
}) {
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
        ...(showAdvancedThai
          ? [{ value: "advanced-thai" as const, label: "Advanced", title: "Advanced Thai" }]
          : []),
      ]}
    />
  );
}
