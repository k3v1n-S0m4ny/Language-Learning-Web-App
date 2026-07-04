import type { FinalItem } from "@/seed/thai/types";

export function FinalsTable({ items }: { items: FinalItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-1 rounded-[var(--r-lg)] border border-border-base bg-surface p-4 sm:flex-row sm:items-center sm:gap-4"
        >
          <div className="w-16 shrink-0 font-mono text-lg font-semibold text-foreground">
            [{item.initialIpa}]
          </div>
          {/* Prominent-ink Thai glyphs — ~1.6x a11y bump. */}
          <div className="font-thai shrink-0 text-[1.8rem] text-foreground-muted">
            {item.metadata.letters.join(" ")}
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-thai text-[1.8rem] text-foreground">
              {item.metadata.example.thai}
            </span>
            <span className="font-mono text-foreground-muted">
              [{item.metadata.example.ipa}]
            </span>
            <span className="italic text-foreground-muted">
              &lsquo;{item.metadata.example.gloss}&rsquo;
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
