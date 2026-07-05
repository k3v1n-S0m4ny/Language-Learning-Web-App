import type { ConsonantItem } from "@/seed/thai/types";
import { ClassBadge } from "./class-badge";

// Renders one unit's consonant inventory (units 2-5), reading directly from
// the typed seed module — the same data the drill engine reads from the DB
// mirror of this content (A5: lessons and drills share one source of truth).
export function ConsonantTable({ items }: { items: ConsonantItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-[var(--r-lg)] border border-border-base">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-base bg-background text-xs uppercase tracking-wide text-foreground-muted">
              <th className="px-3 py-2 text-left">Letter</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Name IPA</th>
              <th className="px-3 py-2 text-left">Meaning</th>
              <th className="px-3 py-2 text-left">Class</th>
              <th className="px-3 py-2 text-left">Initial</th>
              <th className="px-3 py-2 text-left">Final</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border-base last:border-0">
                {/* Every letter in both cuts of IBM Plex Sans Thai — classical
                    (looped) beside modern (loopless) — so the หัว loop is
                    visibly present vs absent. Same two families the unit-2
                    flashcard toggles between. Prominent-ink glyph = ~1.6x a11y
                    bump (a consonant fills only ~50% of its font-size). */}
                <td className="px-3 py-2">
                  <div className="flex items-start gap-4">
                    <span className="flex flex-col items-center gap-0.5">
                      <span className="font-thai-looped text-[2.4rem] leading-none text-foreground">
                        {item.display}
                      </span>
                      <span className="text-[9px] font-medium uppercase tracking-wide text-foreground-muted">
                        Classical
                      </span>
                    </span>
                    <span className="flex flex-col items-center gap-0.5">
                      <span className="font-thai-loopless text-[2.4rem] leading-none text-foreground">
                        {item.display}
                      </span>
                      <span className="text-[9px] font-medium uppercase tracking-wide text-foreground-muted">
                        Modern
                      </span>
                    </span>
                  </div>
                  {item.metadata.obsolete && (
                    <span className="mt-1 inline-block text-[10px] font-sans font-normal uppercase text-foreground-muted">
                      obsolete, not drilled
                    </span>
                  )}
                </td>
                <td className="font-thai px-3 py-2">{item.metadata.name}</td>
                <td className="px-3 py-2 font-mono text-foreground-muted">
                  {item.metadata.nameIpa ? `[${item.metadata.nameIpa}]` : "—"}
                </td>
                <td className="px-3 py-2 text-foreground-muted">{item.metadata.meaning}</td>
                <td className="px-3 py-2">
                  <ClassBadge consonantClass={item.consonantClass} />
                </td>
                <td className="px-3 py-2 font-mono">[{item.initialIpa}]</td>
                <td className="px-3 py-2 font-mono">
                  {item.finalIpa ? `[${item.finalIpa}]` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-foreground-muted">
        Each letter is shown in both the <span className="font-medium text-foreground">classical</span>{" "}
        (looped) and <span className="font-medium text-foreground">modern</span> (loopless) styles &mdash;
        watch the <span className="font-thai">หัว</span> loop appear and vanish.
      </p>
    </div>
  );
}
