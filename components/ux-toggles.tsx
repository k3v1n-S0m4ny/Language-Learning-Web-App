"use client";

import {
  useHapticsEnabled,
  useSoundEnabled,
  setHapticsEnabled,
  setSoundEnabled,
} from "@/lib/ux/prefs";
import { SegmentedControl } from "./ui/segmented-control";

type OnOff = "on" | "off";

// Haptics + sound preference toggles for the bottom-nav menu (Phase 4). Reuse
// the glass SegmentedControl (same primitive as theme/mode) so the menu reads
// as one control family. Device-local prefs (lib/ux/prefs.ts) — never touches
// learner_settings.
export function HapticsToggle() {
  const enabled = useHapticsEnabled();
  return (
    <SegmentedControl<OnOff>
      ariaLabel="Haptics"
      value={enabled ? "on" : "off"}
      onChange={(v) => setHapticsEnabled(v === "on")}
      options={[
        { value: "on", label: "On" },
        { value: "off", label: "Off" },
      ]}
    />
  );
}

export function SoundToggle() {
  const enabled = useSoundEnabled();
  return (
    <SegmentedControl<OnOff>
      ariaLabel="Sound"
      value={enabled ? "on" : "off"}
      onChange={(v) => setSoundEnabled(v === "on")}
      options={[
        { value: "on", label: "On" },
        { value: "off", label: "Off" },
      ]}
    />
  );
}
