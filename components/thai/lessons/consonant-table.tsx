import type { ConsonantItem } from "@/seed/thai/types";
import { ClassBadge } from "./class-badge";

// Renders one unit's consonant inventory (units 2-5), reading directly from
// the typed seed module — the same data the drill engine reads from the DB
// mirror of this content (A5: lessons and drills share one source of truth).
export function ConsonantTable({ items }: { items: ConsonantItem[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--r-lg)] border border-border-base">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-base bg-background text-xs uppercase tracking-wide text-foreground-muted">
            <th className="px-3 py-2 text-left">Letter</th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Meaning</th>
            <th className="px-3 py-2 text-left">Class</th>
            <th className="px-3 py-2 text-left">Initial</th>
            <th className="px-3 py-2 text-left">Final</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border-base last:border-0">
              {/* Prominent-ink Thai glyph — ~1.6x a11y bump. */}
              <td className="font-thai px-3 py-2 text-[2.4rem]">
                {item.display}
                {item.metadata.obsolete && (
                  <span className="ml-2 align-middle text-[10px] font-sans font-normal uppercase text-foreground-muted">
                    obsolete, not drilled
                  </span>
                )}
              </td>
              <td className="font-thai px-3 py-2">{item.metadata.name}</td>
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
  );
}
