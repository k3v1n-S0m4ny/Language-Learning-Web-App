import type { Tone } from "@/seed/thai/types";
import type { ToneWordWithAudio } from "@/lib/thai/queries";
import { TONE_LABELS } from "@/lib/thai/tone";
import { AudioPlayButton } from "@/components/thai/audio-play-button";
import { ToneSparkline } from "./tone-sparkline";

const FAMILY_TITLES: Record<string, string> = {
  "carrier-อ": "The carrier อ — one letter, five tones",
  khaa: "kʰaː — the same syllable, five tones (mixed classes)",
  "naa-silent-leader": "นา / หนา — a silent ห leader changes the class",
};

// Unit 9 (A3): listen-and-repeat tiles, grouped into the same minimal-pair
// families as seed/thai/items.ts TONE_WORDS. Playback-only — no attempt is
// logged here; the tracked audio→tone perception drill lives in the drill
// page. Tiles render even before the M12 paid audio batch runs (audioUrl
// null) — the play button is simply omitted per item until then (A4).
export function ToneEarLesson({ words }: { words: ToneWordWithAudio[] }) {
  const families = [...new Set(words.map((w) => w.metadata.family as string))];

  return (
    <div className="flex flex-col gap-8">
      {families.map((family) => {
        const items = words.filter((w) => w.metadata.family === family);
        return (
          <div key={family} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground-muted">
              {FAMILY_TITLES[family] ?? family}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => {
                const tone = item.metadata.tone as Tone;
                const gloss = item.metadata.gloss as string | undefined;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col items-center gap-2 rounded-[var(--r-lg)] border border-border-base bg-surface p-4"
                  >
                    {/* Prominent-ink Thai glyph — ~1.6x a11y bump. */}
                    <span className="font-thai text-5xl text-foreground">{item.display}</span>
                    <span className="font-mono text-xs text-foreground-muted">
                      [{item.initialIpa}]
                    </span>
                    <div className="flex items-center gap-2">
                      <ToneSparkline tone={tone} />
                      <span className="text-xs font-medium text-foreground-muted">
                        {TONE_LABELS[tone]}
                      </span>
                    </div>
                    {gloss && (
                      <span className="text-xs italic text-foreground-muted">&lsquo;{gloss}&rsquo;</span>
                    )}
                    {item.audioUrl ? (
                      <AudioPlayButton url={item.audioUrl} size="sm" />
                    ) : (
                      <span className="text-[10px] text-foreground-muted">Audio coming soon</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
