import { ProgressRing } from "@/components/progress-ring";
import { hskLabel, type HskGate } from "@/lib/review/hsk-gate";

// The HSK band ladder: how far the Learner is through each band and where the gate
// currently stands. Server component — ProgressRing is the only client leaf.
//
// This is what makes the gate legible. Without it, new Cards simply stop arriving and
// the Learner has no way to see why or what would fix it. Mirrors components/thai/unit-row.tsx:
// dimmed row + greyed ring + a plain-language reason, never a disabled control.
export function HskLadder({ gate }: { gate: HskGate }) {
  return (
    <ul className="flex flex-col gap-2">
      {gate.bands.map((band) => {
        const locked = !band.unlocked;
        const blocking = gate.blockingBand?.band === band.band;

        return (
          <li
            key={band.band}
            className={`flex items-center gap-3 rounded-[var(--r-md)] border border-border-base px-3 py-2 ${
              locked ? "opacity-60" : ""
            }`}
          >
            <ProgressRing percent={locked ? 0 : band.percentMastered} locked={locked} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {hskLabel(band.band)}
              </p>
              <p className="text-xs text-foreground-muted">
                {/* Name the band that ACTUALLY blocks, which is not always band-1:
                    the grandfather high-water mark can leave a lower band short while
                    a higher one is already open. Pointing at the wrong band would send
                    the learner off to study something that changes nothing. */}
                {locked
                  ? `Locked — master ${hskLabel(gate.blockingBand?.band ?? band.band - 1)} first`
                  : `${band.mastered} / ${band.total} mastered${
                      blocking ? ` — ${band.required} to unlock the next band` : ""
                    }`}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
