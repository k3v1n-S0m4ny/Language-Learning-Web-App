import type { VowelItem } from "@/seed/thai/types";

// Unit 7: pairs items sharing a pairId into a short/long row. Unit 8 has no
// pairId — each diphthong/hidden-vowel/shape-changer form gets its own row.
export function VowelTable({ items }: { items: VowelItem[] }) {
  const paired = items.some((i) => i.metadata.pairId);

  if (paired) {
    const pairIds = [...new Set(items.map((i) => i.metadata.pairId))];
    return (
      <div className="overflow-x-auto rounded-[var(--r-lg)] border border-border-base">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-base bg-background text-xs uppercase tracking-wide text-foreground-muted">
              <th className="px-3 py-2 text-left">Short</th>
              <th className="px-3 py-2 text-left">Sound</th>
              <th className="px-3 py-2 text-left">Long</th>
              <th className="px-3 py-2 text-left">Sound</th>
            </tr>
          </thead>
          <tbody>
            {pairIds.map((pairId) => {
              const short = items.find(
                (i) => i.metadata.pairId === pairId && i.metadata.length === "short",
              );
              const long = items.find(
                (i) => i.metadata.pairId === pairId && i.metadata.length === "long",
              );
              return (
                <tr key={pairId} className="border-b border-border-base last:border-0">
                  {/* Prominent-ink Thai glyphs — ~1.6x a11y bump. */}
                  <td className="font-thai px-3 py-2 text-3xl">{short?.display}</td>
                  <td className="px-3 py-2 font-mono">{short && `[${short.initialIpa}]`}</td>
                  <td className="font-thai px-3 py-2 text-3xl">{long?.display}</td>
                  <td className="px-3 py-2 font-mono">{long && `[${long.initialIpa}]`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const byCategory = {
    diphthong: items.filter((i) => i.metadata.category === "diphthong"),
    hidden: items.filter((i) => i.metadata.category === "hidden"),
    "shape-changer": items.filter((i) => i.metadata.category === "shape-changer"),
  };

  return (
    <div className="flex flex-col gap-6">
      {(["diphthong", "hidden", "shape-changer"] as const).map((cat) =>
        byCategory[cat].length ? (
          <div key={cat} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold capitalize text-foreground-muted">
              {cat === "shape-changer" ? "Shape-changers" : `${cat} vowels`}
            </h3>
            <div className="flex flex-col gap-2">
              {byCategory[cat].map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 rounded-[var(--r-lg)] border border-border-base bg-surface p-4"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-thai text-3xl text-foreground">{item.display}</span>
                    <span className="font-mono text-foreground-muted">
                      [{item.initialIpa}]
                    </span>
                  </div>
                  {item.metadata.note && (
                    <p className="text-xs text-foreground-muted">{item.metadata.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
