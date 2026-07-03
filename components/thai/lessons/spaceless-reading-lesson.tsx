// Unit 14 (M14/A5) — reading text without spaces. Content transcribed
// verbatim from research doc §10 "Reading text without spaces" (quoted in
// the M14 Validation Contract). The tap-boundary widget below (drill page)
// is where the learner practises the three cues on real phrases.
export function SpacelessReadingLesson() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-xl border border-border-base bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">The final hurdle: no spaces</h2>
        <p className="text-sm text-foreground-muted">
          Thai does not put spaces between words; a sentence is a continuous
          string, and the spaces you do see mark the ends of clauses or
          sentences. At first this looks impossible — where does one word
          stop and the next begin? — yet in practice a few reliable cues let
          your eye carve the string into syllables, and syllables into
          words.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground-muted">Three cues</h3>
        <ol className="list-inside list-decimal space-y-2 text-sm text-foreground-muted">
          <li>
            <b className="text-foreground">Leading vowels announce a boundary</b> — whenever you see
            เ แ โ ไ ใ, a new syllable starts there, because those vowels are
            always written in front of their consonant.
          </li>
          <li>
            <b className="text-foreground">A vowel shape marks a syllable&rsquo;s extent</b> — once you
            find the vowel and its consonant(s), that syllable is
            essentially complete.
          </li>
          <li>
            <b className="text-foreground">A final consonant closes a syllable</b>, so the next letter
            must open a new one.
          </li>
        </ol>
        <p className="text-sm text-foreground-muted">
          Taken together, these let you read the string one syllable at a
          time, left to right, and the words assemble themselves as you go.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground-muted">Worked examples</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border-base bg-surface p-4">
            <div className="font-thai text-2xl text-foreground">
              ไป<span className="text-brand">·</span>โรง<span className="text-brand">·</span>เรียน
            </div>
            <p className="mt-2 text-sm text-foreground-muted">
              The leading vowels break it apart: ไ&hellip; starts ไป pāj
              &lsquo;go&rsquo;; โ&hellip; starts โรง rōːŋ; and เ&hellip;
              starts เรียน rīan. Read together, ไปโรงเรียน is pāj rōːŋ rīan
              &lsquo;to go to school&rsquo;.
            </p>
          </div>
          <div className="rounded-xl border border-border-base bg-surface p-4">
            <div className="font-thai text-2xl text-foreground">
              แมว<span className="text-brand">·</span>กิน<span className="text-brand">·</span>ปลา
            </div>
            <p className="mt-2 text-sm text-foreground-muted">
              แ&hellip; announces แมว mɛ̄ːw &lsquo;cat&rsquo;; the final น
              closes กิน kīn &lsquo;eats&rsquo;; ปลา plāː &lsquo;fish&rsquo;
              follows. แมวกินปลา = mɛ̄ːw kīn plāː &lsquo;the cat eats
              fish&rsquo;.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-base bg-surface p-5 text-sm text-foreground-muted">
        <p>
          Fluent word-spotting comes from vocabulary as much as from rules:
          the more words you recognise on sight, the more the boundaries
          jump out. Treat this section as a starting strategy, and expect it
          to get easier automatically as your word stock grows.
        </p>
        <p className="mt-3">
          The drill below shows you a real phrase, spaceless, and asks you to
          tap between the characters to place the syllable boundaries
          yourself.
        </p>
      </div>
    </div>
  );
}
