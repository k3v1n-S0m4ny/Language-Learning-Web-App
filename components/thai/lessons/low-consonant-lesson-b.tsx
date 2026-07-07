import type { ConsonantItem } from "@/seed/thai/types";
import { ConsonantClassLesson } from "./consonant-class-lesson";

// Unit 5 (M11) — the remaining twelve low-class letters (low-class group B: the
// continuants and sonorants น…ฮ), plus the second dead letter ฅ. Supplies the
// closing low-class copy to the shared ConsonantClassLesson shell. Like units 3
// and 4 it does NOT re-render the full ThaiScriptHistory primer (that is a
// one-time thing on unit 2); its per-unit history callout is the obsolete
// letter ฅ (kho khon) — the twin of unit 3's ฃ, which unit 3 and unit 4 already
// forward-reference as arriving here. Mechanics prose is distilled from
// seed/thai/research/reading-thai-script.html §3 "Reading the consonants" and
// §4 "Consonants at the end of a syllable".
export function LowConsonantLessonB({ items }: { items: ConsonantItem[] }) {
  return (
    <ConsonantClassLesson
      items={items}
      tableHeading="The remaining twelve low-class consonants"
      callout={
        <section className="flex flex-col gap-2 rounded-[var(--r-lg)] border border-border-base bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground">
            The last dead letter: <span className="font-thai">ฅ</span>
          </h2>
          <p className="text-sm leading-relaxed text-foreground-muted">
            The first letter in the table below,{" "}
            <span className="font-thai text-foreground">ฅ</span>{" "}
            <span className="font-mono text-xs">[kʰ]</span>{" "}
            (its name <span className="font-thai text-foreground">ฅ ฅน</span>{" "}
            means &ldquo;person&rdquo;), is the twin of the{" "}
            <span className="font-thai text-foreground">ฃ</span> you met in unit 3
            &mdash; the second and last of the alphabet&rsquo;s two dead letters.
            It once marked a low-class{" "}
            <span className="font-mono text-xs">kʰ</span> that Thai later merged
            into ordinary <span className="font-thai text-foreground">ค</span>,
            and like <span className="font-thai text-foreground">ฃ</span> it fell
            out of everyday writing about a century ago. Modern Thai spells the
            word &ldquo;person&rdquo; <span className="font-thai text-foreground">คน</span>{" "}
            with <span className="font-thai text-foreground">ค</span>. We show{" "}
            <span className="font-thai text-foreground">ฅ</span> so the inventory
            is complete, but you will never be drilled on it &mdash; with it, you
            have now seen every one of the forty-four Thai consonant letters.
          </p>
        </section>
      }
      sections={[
        {
          heading: "The sonorants — the letters you can hum",
          body: (
            <>
              <p>
                Where unit 4 gathered the low-class{" "}
                <span className="font-medium text-foreground">stops, affricates
                and nasals</span>, this unit finishes the class with its{" "}
                <span className="font-medium text-foreground">continuants</span>{" "}
                &mdash; sounds you can hold: the nasal{" "}
                <span className="font-thai text-foreground">ม</span>{" "}
                <span className="font-mono text-xs">m</span>, the nasal-ish{" "}
                <span className="font-thai text-foreground">น</span>{" "}
                <span className="font-mono text-xs">n</span>, the liquids{" "}
                <span className="font-thai text-foreground">ร</span>{" "}
                <span className="font-mono text-xs">r</span> and{" "}
                <span className="font-thai text-foreground">ล</span>{" "}
                <span className="font-mono text-xs">l</span>, and the glides{" "}
                <span className="font-thai text-foreground">ย</span>{" "}
                <span className="font-mono text-xs">j</span> and{" "}
                <span className="font-thai text-foreground">ว</span>{" "}
                <span className="font-mono text-xs">w</span>. A handful of noisier
                low-class letters ride along:{" "}
                <span className="font-thai text-foreground">พ</span>,{" "}
                <span className="font-thai text-foreground">ภ</span>{" "}
                <span className="font-mono text-xs">pʰ</span>,{" "}
                <span className="font-thai text-foreground">ฟ</span>{" "}
                <span className="font-mono text-xs">f</span> and the{" "}
                <span className="font-thai text-foreground">ฮ</span>{" "}
                <span className="font-mono text-xs">h</span>.
              </p>
              <p>
                As always, <span className="font-medium text-foreground">low</span>{" "}
                is a historical class name, not a pitch instruction &mdash; and a
                bare low-class letter-name is said on a flat{" "}
                <span className="font-medium text-foreground">mid</span> tone,{" "}
                <span className="font-thai text-foreground">ม</span>{" "}
                <span className="font-mono text-xs">[mɔ̄ː]</span>.
              </p>
            </>
          ),
        },
        {
          heading: "The last twins — same sound, different class",
          body: (
            <>
              <p>
                Several letters here are the{" "}
                <span className="font-medium text-foreground">low-class twins</span>{" "}
                of high-class letters you already know, kept apart only by class
                (which is what steers their tone). Low{" "}
                <span className="font-thai text-foreground">ฟ</span> is the twin of
                high <span className="font-thai text-foreground">ฝ</span> (both{" "}
                <span className="font-mono text-xs">f</span>); low{" "}
                <span className="font-thai text-foreground">พ</span> and{" "}
                <span className="font-thai text-foreground">ภ</span> twin high{" "}
                <span className="font-thai text-foreground">ผ</span> (all{" "}
                <span className="font-mono text-xs">pʰ</span>); and low{" "}
                <span className="font-thai text-foreground">ฮ</span> twins high{" "}
                <span className="font-thai text-foreground">ห</span> (both{" "}
                <span className="font-mono text-xs">h</span>).
              </p>
              <p>
                A different kind of doubling happens inside this unit itself:{" "}
                <span className="font-thai text-foreground">ล</span> and the rare{" "}
                <span className="font-thai text-foreground">ฬ</span> both say{" "}
                <span className="font-mono text-xs">l</span> &mdash;{" "}
                <span className="font-thai text-foreground">ฬ</span>{" "}
                <span className="font-thai text-foreground">จุฬา</span> survives
                almost only in Sanskrit-derived words and names. Keeping these
                &ldquo;redundant&rdquo; letters is, once again, the whole point:
                class is spelled into the letter.
              </p>
            </>
          ),
        },
        {
          heading: "Start vs end: sonorants that also close a syllable",
          body: (
            <>
              <p>
                Many of this unit&rsquo;s letters are happy at{" "}
                <span className="font-medium text-foreground">both ends</span> of a
                syllable. <span className="font-thai text-foreground">น</span>,{" "}
                <span className="font-thai text-foreground">ม</span>,{" "}
                <span className="font-thai text-foreground">ย</span> and{" "}
                <span className="font-thai text-foreground">ว</span> keep their own
                sound as a final &mdash;{" "}
                <span className="font-mono text-xs">n</span>,{" "}
                <span className="font-mono text-xs">m</span>,{" "}
                <span className="font-mono text-xs">j</span>,{" "}
                <span className="font-mono text-xs">w</span> &mdash; and are four of
                the eight endings Thai allows.
              </p>
              <p>
                The rest fall into the same collapsing pattern you saw before. The
                liquids <span className="font-thai text-foreground">ร</span>,{" "}
                <span className="font-thai text-foreground">ล</span> and{" "}
                <span className="font-thai text-foreground">ฬ</span> all end as an{" "}
                <span className="font-mono text-xs">n</span>; the{" "}
                <span className="font-mono text-xs">pʰ</span>/
                <span className="font-mono text-xs">f</span> group{" "}
                <span className="font-thai text-foreground">พ</span>,{" "}
                <span className="font-thai text-foreground">ภ</span>,{" "}
                <span className="font-thai text-foreground">ฟ</span> ends as an
                unreleased <span className="font-mono text-xs">p</span>; and{" "}
                <span className="font-thai text-foreground">ฮ</span> &mdash; like
                its high twin <span className="font-thai text-foreground">ห</span>{" "}
                &mdash; only ever starts a syllable. The{" "}
                <span className="font-medium text-foreground">Initial</span> and{" "}
                <span className="font-medium text-foreground">Final</span> columns
                below give each letter&rsquo;s two jobs.
              </p>
            </>
          ),
        },
      ]}
      closing={
        <p className="text-sm text-foreground-muted">
          In the drill below you will practise these letters &mdash; all except the
          obsolete <span className="font-thai">ฅ</span> &mdash; until you can recall
          each one&rsquo;s name and sound on sight. That completes the consonants.
        </p>
      }
    />
  );
}
