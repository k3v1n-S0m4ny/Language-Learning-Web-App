import type { LeaderWordItem, SpecialSignItem } from "@/seed/thai/types";
import { TONE_LABELS } from "@/lib/thai/tone";
import { ToneSparkline } from "./tone-sparkline";

// Unit 12 (M14/A3) — special signs & silent leaders. Content transcribed
// verbatim from research doc §8 "Small marks above and around letters" and
// "Silent tone-leaders: ห and อ" (quoted in the M14 Validation Contract) —
// no external verification needed for the sign rows; the leader words below
// come from the typed seed module (`.claude/plans/m14-content-leaders.md`,
// Wiktionary-verified).
export function SpecialSignsLesson({
  signs,
  leaders,
}: {
  signs: SpecialSignItem[];
  leaders: LeaderWordItem[];
}) {
  const orLeaders = leaders.filter((l) => l.metadata.leaderChar === "อ");
  const hoLeaders = leaders.filter((l) => l.metadata.leaderChar === "ห");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Small marks above and around letters
        </h2>
        <p className="text-sm text-foreground-muted">
          Real text contains a handful of extra marks that the core class +
          live/dead + tone-mark rules do not cover. You will not meet them in
          every sentence, but it is worth recognising each on sight.
        </p>
        <div className="overflow-x-auto rounded-[var(--r-lg)] border border-border-base">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-foreground-muted">
                <th className="px-3 py-2 text-left font-medium">Sign</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">What it does when you read</th>
              </tr>
            </thead>
            <tbody>
              {signs.map((sign) => (
                <tr key={sign.id} className="border-t border-border-base">
                  <td className="px-3 py-2">
                    {/* Prominent-ink Thai glyph — ~1.6x a11y bump. */}
                    <span className="font-thai text-5xl text-foreground">{sign.display}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-thai text-sm text-foreground">{sign.metadata.signName}</span>
                  </td>
                  <td className="px-3 py-2 text-foreground-muted">
                    {sign.metadata.functionLabel}
                    {sign.metadata.example.thai && (
                      <span className="ml-1">
                        — e.g. <span className="font-thai text-foreground">{sign.metadata.example.thai}</span>
                        {sign.metadata.example.ipa && (
                          <span className="font-mono"> {sign.metadata.example.ipa}</span>
                        )}
                        {" "}
                        &lsquo;{sign.metadata.example.gloss}&rsquo;
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-border-base bg-surface p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Silent tone-leaders: ห and อ
        </h3>
        <p className="text-sm text-foreground-muted">
          Several Low-class sounds — the sonorants ง ญ น ม ย ร ล ว — have no
          High-class twin, so on their own they cannot make certain tones. To
          fill the gap, Thai writes a silent High-class ห in front of them;
          the ห is not pronounced, but it hands its High-class tone behaviour
          to the syllable. Compare:
        </p>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <span className="font-thai text-5xl text-foreground">นา</span>
            <span className="font-mono text-sm text-foreground-muted">nāː</span>
            <span className="text-xs italic text-foreground-muted">&lsquo;rice field&rsquo; (Low + live → mid)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-thai text-5xl text-foreground">หนา</span>
            <span className="font-mono text-sm text-foreground-muted">nǎː</span>
            <span className="text-xs italic text-foreground-muted">&lsquo;thick&rsquo; (now High-class rules → rising)</span>
          </div>
        </div>
        <p className="text-sm text-foreground-muted">
          In the same spirit, a silent Mid-class อ leads ย in exactly four
          everyday words — อย่า jàː &lsquo;don&rsquo;t&rsquo;, อยาก jàːk̚
          &lsquo;to want&rsquo;, อย่าง jàːŋ &lsquo;kind, type&rsquo;, and อยู่
          jùː &lsquo;to be at&rsquo; — forcing Mid-class rules.
        </p>
        <div className="rounded-[var(--r-md)] bg-background p-4 text-sm text-foreground-muted">
          <span className="font-semibold text-foreground">Worked example: </span>
          The word หมา begins with a silent ห before ม. It is a live syllable
          with no tone mark. The silent ห imposes High-class rules; High +
          live → rising. So หมา = mǎː &lsquo;dog&rsquo; — and note it is{" "}
          <i>not</i> said māː, which (from plain มา) means &lsquo;to
          come&rsquo;.
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground-muted">
          The twelve silent-leader words this unit drills
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[...orLeaders, ...hoLeaders].map((word) => (
            <div
              key={word.id}
              className="flex items-center gap-3 rounded-[var(--r-lg)] border border-border-base bg-surface p-3"
            >
              {/* Prominent-ink Thai glyph — ~1.6x a11y bump. */}
              <span className="font-thai text-[2.4rem] text-foreground">{word.display}</span>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs text-foreground-muted">[{word.initialIpa}]</span>
                <div className="flex items-center gap-2">
                  <ToneSparkline tone={word.metadata.tone} />
                  <span className="text-xs font-medium text-foreground-muted">
                    {TONE_LABELS[word.metadata.tone]}
                  </span>
                </div>
                <span className="text-xs italic text-foreground-muted">
                  &lsquo;{word.metadata.gloss}&rsquo; — {word.metadata.derivation}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--r-lg)] border border-border-base bg-surface p-5 text-sm text-foreground-muted">
        <p>
          Two consonants side by side at the start of a syllable can also be
          a <b>true cluster</b> (both pronounced together as a blend, as in
          ปลา plāː) or a <b>false cluster</b> (not blended — sometimes the
          second letter is silent, as in ทร often read s, e.g. ทราย sāːj
          &lsquo;sand&rsquo;; sometimes a short linking a slips in between
          them, as in สบาย sà.bāːj &lsquo;comfortable, well&rsquo;). This
          distinction is standard teaching material rather than a point drawn
          from this course&rsquo;s specific reference sources, so treat it as
          orientation only — it is not quizzed in this unit&rsquo;s drills.
        </p>
      </div>
    </div>
  );
}
