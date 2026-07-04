import type { SyllableItem } from "@/seed/thai/types";
import { TONE_LABELS } from "@/lib/thai/tone";
import { ClassBadge } from "./class-badge";
import { ToneSparkline } from "./tone-sparkline";

// Unit 11 (M13/A3) — syllable decode: assembling a word's full IPA reading
// (initial + vowel + final + tone) from its written parts. Recap prose is
// paraphrased from seed/thai/research/reading-thai-script.html §2 ("live" vs
// "dead") and §5 ("The core vowels, short and long" / "Two habits that hide
// vowels") — the worked examples below are real word-bank rows (no invented
// content), one per branch shape the word-ipa drill's distractors mutate.
function findExample(
  words: SyllableItem[],
  predicate: (w: SyllableItem) => boolean,
): SyllableItem | undefined {
  return words.find(predicate);
}

export function SyllableDecodeLesson({ words }: { words: SyllableItem[] }) {
  const examples = [
    {
      label: "Unmarked, live syllable",
      item: findExample(words, (w) => !w.metadata.toneMark && w.metadata.live === "live"),
    },
    {
      label: "Unmarked, dead syllable, short vowel",
      item: findExample(
        words,
        (w) => !w.metadata.toneMark && w.metadata.live === "dead" && w.metadata.vowelLength === "short",
      ),
    },
    {
      label: "Unmarked, dead syllable, long vowel",
      item: findExample(
        words,
        (w) => !w.metadata.toneMark && w.metadata.live === "dead" && w.metadata.vowelLength === "long",
      ),
    },
    {
      label: "Marked syllable (mark wins)",
      item: findExample(words, (w) => !!w.metadata.toneMark),
    },
  ].filter((e): e is { label: string; item: SyllableItem } => !!e.item);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-border-base bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Reading a syllable&rsquo;s full IPA</h2>
        <p className="text-sm text-foreground-muted">
          Every Thai syllable decodes into initial consonant + vowel +
          (optional) final consonant, with the tone computed on top (unit
          10). A vowel is not always where it looks — it can sit before,
          after, above, or below the consonant, and two habits hide it
          further: an unwritten vowel between two consonants (usually o, e.g.
          คน = kʰōn), and a short a rewritten as ◌ั before a final (e.g. รัก =
          rák̚).
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground-muted">Four worked examples</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {examples.map(({ label, item }) => {
            const meta = item.metadata;
            return (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-[var(--r-lg)] border border-border-base bg-surface p-4"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                  {label}
                </span>
                {/* Prominent-ink Thai glyph — ~1.6x a11y bump. */}
                <div className="flex items-center gap-3">
                  <span className="font-thai text-5xl text-foreground">{item.display}</span>
                  <span className="font-mono text-sm text-foreground-muted">[{item.initialIpa}]</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
                  {meta.initialClass && <ClassBadge consonantClass={meta.initialClass} />}
                  {meta.toneMark && <span>marked</span>}
                  {meta.live && <span>{meta.live}</span>}
                  {meta.vowelLength && <span>{meta.vowelLength} vowel</span>}
                  {meta.finalSound && <span>final {meta.finalSound}</span>}
                  {meta.tone && (
                    <span className="flex items-center gap-1">
                      <ToneSparkline tone={meta.tone} /> {TONE_LABELS[meta.tone]}
                    </span>
                  )}
                </div>
                <span className="text-xs italic text-foreground-muted">&lsquo;{meta.gloss}&rsquo;</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[var(--r-lg)] border border-border-base bg-surface p-5 text-sm text-foreground-muted">
        <p>
          The drill below shows a word and asks you to pick its correct full
          IPA reading from four options. The three wrong options each change
          exactly one thing — the tone, the vowel length, or the final sound
          — so read carefully rather than pattern-matching the shape.
        </p>
      </div>
    </div>
  );
}
