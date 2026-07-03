import type { NumeralItem } from "@/seed/thai/types";
import { TONE_LABELS } from "@/lib/thai/tone";
import { ToneSparkline } from "./tone-sparkline";

// Unit 13 (M14/A4) — Thai numerals. Content transcribed verbatim from
// research doc §9 "Thai numerals" (quoted in the M14 Validation Contract);
// the spoken digit names below come from the typed seed module
// (`.claude/plans/m14-content-numerals.md`, Wiktionary-verified).
export function NumeralsLesson({ numerals }: { numerals: NumeralItem[] }) {
  const sorted = [...numerals].sort((a, b) => a.metadata.value - b.metadata.value);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-xl border border-border-base bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Thai digits and their values</h2>
        <p className="text-sm text-foreground-muted">
          Thai has its own set of digits. Western numerals are common in
          everyday life, but the Thai digits still appear on documents,
          prices, signs, and banknotes, so they are worth a quick look.
        </p>
        <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
          {sorted.map((n) => (
            <div
              key={n.id}
              className="flex flex-col items-center gap-1 rounded-xl border border-border-base bg-background p-3"
            >
              <span className="font-thai text-3xl text-foreground">{n.display}</span>
              <span className="text-xs font-semibold text-foreground-muted">{n.metadata.value}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-foreground-muted">
          They combine exactly like Western digits, so <span className="font-thai">๒๐๒๖</span> is
          simply 2026, and a price tag reading <span className="font-thai">๙๙</span> means 99.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground-muted">Spoken digit names</h3>
        <div className="overflow-x-auto rounded-xl border border-border-base">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-foreground-muted">
                <th className="px-3 py-2 text-left font-medium">Digit</th>
                <th className="px-3 py-2 text-left font-medium">Value</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">IPA</th>
                <th className="px-3 py-2 text-left font-medium">Tone</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((n) => (
                <tr key={n.id} className="border-t border-border-base">
                  <td className="px-3 py-2">
                    <span className="font-thai text-2xl text-foreground">{n.display}</span>
                  </td>
                  <td className="px-3 py-2 text-foreground-muted">{n.metadata.value}</td>
                  <td className="px-3 py-2">
                    <span className="font-thai text-foreground">{n.metadata.name}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-foreground-muted">{n.metadata.nameIpa}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ToneSparkline tone={n.metadata.tone} />
                      <span className="text-xs font-medium text-foreground-muted">
                        {TONE_LABELS[n.metadata.tone]}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-foreground-muted">
          หนึ่ง (one) is taught here with its standard citation LOW tone
          /nɯ̀ŋ/ — a mid-tone colloquial variant /nɯ̄ŋ/ also exists in fast,
          informal counting, but the citation form is the one drilled below.
        </p>
      </div>
    </div>
  );
}
