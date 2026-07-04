import type { SyllableItem, ToneMark } from "@/seed/thai/types";
import { TONE_GRID_ROWS, TONE_LABELS, TONE_MARK_INFO, TONE_MARK_ORDER } from "@/lib/thai/tone";
import { ClassBadge } from "./class-badge";
import { ToneSparkline } from "./tone-sparkline";

// Unit 10 (M13/A2) — the tone-rules engine. All content (the four tone
// marks, the tone grid, the carrier-อ minimal set) is transcribed verbatim
// from seed/thai/research/reading-thai-script.html §6 "Tones — the core
// rules" (see lib/thai/tone.ts TONE_GRID_ROWS / TONE_MARK_INFO for the exact
// source data). `carrierWords` are the unit-9 carrier-อ tone-word family
// (same real content already taught in unit 9, reused here to anchor the
// grid to sounds the learner already knows).
export function ToneRulesLesson({
  markedExamples,
}: {
  markedExamples: Record<ToneMark, SyllableItem[]>;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-border-base bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Four ingredients decide a syllable&rsquo;s tone
        </h2>
        <ol className="list-inside list-decimal space-y-1 text-sm text-foreground-muted">
          <li>the class of the initial consonant (mid, high, or low) — units 2-5</li>
          <li>whether the syllable is live or dead — a long vowel or one of m n ŋ j w is live; a short vowel or a stop (p t k) ending is dead</li>
          <li>for dead syllables only, the vowel length (short or long) — length never changes the answer for mid/high class</li>
          <li>any tone mark written above the consonant — a mark always wins over live/dead/length</li>
        </ol>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground-muted">The four tone marks</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TONE_MARK_ORDER.map((mark) => {
            const info = TONE_MARK_INFO[mark];
            return (
              <div
                key={mark}
                className="flex flex-col items-center gap-1 rounded-[var(--r-lg)] border border-border-base bg-surface p-4"
              >
                {/* Prominent-ink Thai glyph — ~1.6x a11y bump (a consonant
                    only fills ~50% of its font-size). */}
                <span className="font-thai text-5xl text-foreground">ก{info.glyph.replace("◌", "")}</span>
                <span className="font-thai text-sm text-foreground-muted">{info.nameThai}</span>
                <span className="font-mono text-xs text-foreground-muted">[{info.nameIpa}]</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground-muted">The tone grid</h3>
        <div className="overflow-x-auto rounded-[var(--r-lg)] border border-border-base">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-foreground-muted">
                <th className="px-3 py-2 text-left font-medium">Situation</th>
                <th className="px-3 py-2 text-center font-medium">Low</th>
                <th className="px-3 py-2 text-center font-medium">Mid</th>
                <th className="px-3 py-2 text-center font-medium">High</th>
              </tr>
            </thead>
            <tbody>
              {TONE_GRID_ROWS.map((row) => (
                <tr key={row.situation} className="border-t border-border-base">
                  <td className="px-3 py-2 text-foreground">{row.situation}</td>
                  <td className="px-3 py-2 text-center text-foreground-muted">
                    {row.low ? TONE_LABELS[row.low] : "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-foreground-muted">
                    {row.mid ? TONE_LABELS[row.mid] : "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-foreground-muted">
                    {row.high ? TONE_LABELS[row.high] : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-foreground-muted">
          The ◌๊ and ◌๋ marks only ever appear on Mid-class consonants — a dash
          means that combination is never written. Vowel length only changes
          the answer in the Low class.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground-muted">
          One example word per mark, worked through the grid
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TONE_MARK_ORDER.map((mark) => {
            const words = markedExamples[mark] ?? [];
            const example = words[0];
            if (!example) return null;
            const tone = example.metadata.tone!;
            return (
              <div
                key={mark}
                className="flex items-center gap-3 rounded-[var(--r-lg)] border border-border-base bg-surface p-4"
              >
                <span className="font-thai text-5xl text-foreground">{example.display}</span>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs text-foreground-muted">[{example.initialIpa}]</span>
                  <div className="flex items-center gap-2">
                    {example.metadata.initialClass && (
                      <ClassBadge consonantClass={example.metadata.initialClass} />
                    )}
                    <span className="font-thai text-sm text-foreground-muted">
                      {TONE_MARK_INFO[mark].glyph}
                    </span>
                    <ToneSparkline tone={tone} />
                    <span className="text-xs font-medium text-foreground-muted">{TONE_LABELS[tone]}</span>
                  </div>
                  <span className="text-xs italic text-foreground-muted">&lsquo;{example.metadata.gloss}&rsquo;</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-foreground-muted">
        In the drill below you&rsquo;ll work through the same four-step routine
        yourself for real words: class, then whether a mark is written, then
        (only when unmarked) live/dead and vowel length — every step ending
        in the resulting tone.
      </p>
    </div>
  );
}
