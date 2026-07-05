// One-time history/culture primer, shown on unit 2 (the first consonant unit).
// Later units get short per-unit callouts instead of repeating this.
//
// History is CITED, not parametric (owner rule). Facts sourced via Perplexity
// sonar-pro, 2026-07-05:
//   - Descent Brahmi -> Pallava (southern Indian Brahmic) -> Old Khmer -> Thai,
//     adapted in the Sukhothai period: en.wikipedia.org/wiki/Thai_script,
//     en.wikipedia.org/wiki/Pallava_script, shs.hal.science/halshs-00922729v1.
//   - Ramkhamhaeng / 1283 Sukhothai Inscription No. 1 as the traditional first
//     Thai writing, and the (still unresolved) authenticity debate raised since
//     the late 1980s: en.wikipedia.org/wiki/Ram_Khamhaeng_Inscription,
//     sealang.net/sala/ram91, academia.edu/16392138.
//   - The loop (หัว, "head") as a later Thai pen-form tradition, not inherited:
//     rapidlearnthai.com/understanding-thai-modern-fonts.
//   - 44 letters / 21 sounds, ฃ & ฅ obsolete (~1927): en.wikipedia.org/wiki/
//     Thai_script, kirit.com/Reading Thai/The Thai consonants.
//   - Tone marks a later addition (2 originally, 4 now): thai-tonetrainer.com/
//     thai-tones-origin, jamkham.com/thai-alphabet-chart.
export function ThaiScriptHistory() {
  return (
    <section className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-border-base bg-surface p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Before the letters &mdash; where Thai writing came from
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground-muted">
        <p>
          Thai script is young by world standards, and borrowed. It was adapted
          in the 1200s from Old Khmer, the writing of the Angkor empire next
          door &mdash; which had itself come, generations earlier, from the
          Brahmi-derived scripts of southern India (the Pallava script). So the
          letters you are about to learn are a distant cousin of the scripts of
          India, by way of Cambodia.
        </p>
        <p>
          By tradition, King Ramkhamhaeng of Sukhothai devised the first Thai
          alphabet in <span className="font-medium text-foreground">1283 CE</span>,
          recorded on a famous stone inscription. Historians still argue about
          whether that stone is genuinely that old &mdash; some suspect it was
          made later &mdash; but the 13th century is the standard date for when
          Thai first had its own letters.
        </p>
        <p>
          Look at almost any Thai letter and you will see a small loop: the{" "}
          <span className="font-thai text-foreground">หัว</span>, or &ldquo;head.&rdquo;
          It marks where the pen starts, and it is the main thing your eye uses
          to tell similar letters apart. The loops are a later Thai handwriting
          habit, not something inherited from the parent scripts.
        </p>
        <p>
          Thai has <span className="font-medium text-foreground">44 consonant
          letters for only about 21 distinct sounds</span> &mdash; many are
          duplicates left over from older pronunciations, and two (ฃ and ฅ) fell
          out of everyday use about a century ago. The tone marks you will meet
          later came later still; the script began with fewer of them. Over the
          next units you will meet these letters in class order, starting here
          with the nine mid-class consonants.
        </p>
      </div>
    </section>
  );
}
