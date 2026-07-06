import type { ConsonantItem } from "@/seed/thai/types";
import { ConsonantClassLesson } from "./consonant-class-lesson";

// Unit 4 (M11) — the first twelve low-class letters (low-class group A: the
// stops, affricates and nasals ค…ธ; the continuants น…ฮ come in unit 5).
// Supplies low-class copy to the shared ConsonantClassLesson shell. Like unit 3
// it does NOT re-render the full ThaiScriptHistory primer (that is one-time on
// unit 2); its per-unit history callout is the cluster of Indic (Sanskrit/Pali)
// letters. Mechanics prose is distilled from
// seed/thai/research/reading-thai-script.html §3 "Reading the consonants"
// (esp. the "Many letters, one sound" table) and §4 "Consonants at the end of
// a syllable". The Sanskrit-origin note in the callout is cited from Wikipedia,
// "Thai script" (the Sanskrit "vargaḥ" plosive-comparison tables) —
// https://en.wikipedia.org/wiki/Thai_script.
export function LowConsonantLesson({ items }: { items: ConsonantItem[] }) {
  return (
    <ConsonantClassLesson
      items={items}
      tableHeading="The first twelve low-class consonants"
      callout={
        <section className="flex flex-col gap-2 rounded-[var(--r-lg)] border border-border-base bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground">
            The letters that came from Sanskrit
          </h2>
          <p className="text-sm leading-relaxed text-foreground-muted">
            When Thai borrowed heavily from{" "}
            <span className="font-medium text-foreground">Pali and Sanskrit</span>{" "}
            &mdash; the classical languages of Buddhism and scholarship &mdash;
            it kept extra letters so those words could preserve their original
            spelling, even where the letter marked no separate Thai sound.
            Several letters in this unit are exactly these Indic imports:{" "}
            <span className="font-thai text-foreground">ฆ</span>,{" "}
            <span className="font-thai text-foreground">ฌ</span> and{" "}
            <span className="font-thai text-foreground">ธ</span> come from the
            Sanskrit voiced-aspirates <em>gha, jha, dha</em>, while{" "}
            <span className="font-thai text-foreground">ฑ</span>,{" "}
            <span className="font-thai text-foreground">ฒ</span> and{" "}
            <span className="font-thai text-foreground">ณ</span> are the old
            Indian <span className="font-medium text-foreground">retroflex</span>{" "}
            row.
          </p>
          <p className="text-sm leading-relaxed text-foreground-muted">
            Thai has no retroflex sounds of its own, so today those letters
            simply collapse onto their plain cousins &mdash;{" "}
            <span className="font-thai text-foreground">ฒ</span> is said like{" "}
            <span className="font-thai text-foreground">ธ</span>,{" "}
            <span className="font-thai text-foreground">ณ</span> like{" "}
            <span className="font-thai text-foreground">น</span>, and{" "}
            <span className="font-thai text-foreground">ฑ</span> usually like{" "}
            <span className="font-thai text-foreground">ท</span> (though{" "}
            <span className="font-thai text-foreground">ฑ</span> also keeps a
            split value, <span className="font-mono text-xs">tʰ</span> or{" "}
            <span className="font-mono text-xs">d</span>). They survive mainly to
            spell Sanskrit- and Pali-derived vocabulary &mdash; fittingly,{" "}
            <span className="font-thai text-foreground">ฑ</span> is spelled out
            with the Ramayana name{" "}
            <span className="font-thai text-foreground">ฑ มณโฑ</span>{" "}
            <span className="font-mono text-xs">[tʰɔ̄ː mōntʰōː]</span> (Montho).
          </p>
        </section>
      }
      sections={[
        {
          heading: "Why this class is called “low” — and why it’s the biggest",
          body: (
            <>
              <p>
                As with mid and high, the label{" "}
                <span className="font-medium text-foreground">low</span> is a
                historical name, not a direction to drop your pitch. The low
                class is by far the{" "}
                <span className="font-medium text-foreground">largest</span> of
                the three &mdash; twenty-four letters in all. This unit covers
                the first twelve (the stops, affricates and nasals); the
                remaining low-class letters follow in unit 5.
              </p>
              <p>
                The low class exists as the{" "}
                <span className="font-medium text-foreground">partner</span> to
                the high class you met in unit 3. Between them the two classes
                carve up the tone space, and a letter&rsquo;s class is one
                ingredient of a syllable&rsquo;s{" "}
                <span className="font-medium text-foreground">tone</span> &mdash;
                the full rules arrive in unit 10.
              </p>
            </>
          ),
        },
        {
          heading: "Same sound, different class: the twin letters",
          body: (
            <>
              <p>
                Most low-class letters{" "}
                <span className="font-medium text-foreground">duplicate</span> a
                sound that a mid- or high-class letter already spells &mdash; and
                that is exactly the point. <span className="font-thai text-foreground">ค</span>{" "}
                and <span className="font-thai text-foreground">ฆ</span> are the
                low-class twins of high-class{" "}
                <span className="font-thai text-foreground">ข</span> (all three
                are <span className="font-mono text-xs">kʰ</span>);{" "}
                <span className="font-thai text-foreground">ท</span>,{" "}
                <span className="font-thai text-foreground">ธ</span> and{" "}
                <span className="font-thai text-foreground">ฒ</span> join
                high-class <span className="font-thai text-foreground">ฐ</span>,{" "}
                <span className="font-thai text-foreground">ถ</span> for{" "}
                <span className="font-mono text-xs">tʰ</span>; and{" "}
                <span className="font-thai text-foreground">ซ</span> is the low
                twin of the high <span className="font-mono text-xs">s</span>{" "}
                letters. Class is the whole reason Thai keeps these
                &ldquo;redundant&rdquo; letters at all.
              </p>
              <p>
                One thing to notice with your ear: a low-class letter&rsquo;s
                bare name is said on a flat{" "}
                <span className="font-medium text-foreground">mid</span> tone
                &mdash; <span className="font-thai text-foreground">ค</span>{" "}
                <span className="font-mono text-xs">[kʰɔ̄ː]</span>, the same
                level pitch as a mid-class name &mdash; <em>not</em> the rising
                sweep of its high-class twin{" "}
                <span className="font-thai text-foreground">ข</span>{" "}
                <span className="font-mono text-xs">[kʰɔ̌ː]</span>.{" "}
                <span className="font-thai text-foreground">ข</span> and{" "}
                <span className="font-thai text-foreground">ค</span> sound
                identical at the start of a word; it is the tone rules (unit 10)
                that finally pull them apart.
              </p>
            </>
          ),
        },
        {
          heading: "Start vs end: still just eight endings",
          body: (
            <>
              <p>
                At the <span className="font-medium text-foreground">end</span>{" "}
                of a syllable Thai allows only eight sounds, so many of this
                unit&rsquo;s letters collapse together. The whole{" "}
                <span className="font-mono text-xs">tʰ</span>/
                <span className="font-mono text-xs">tɕʰ</span>/
                <span className="font-mono text-xs">s</span> group &mdash;{" "}
                <span className="font-thai text-foreground">ช</span>,{" "}
                <span className="font-thai text-foreground">ซ</span>,{" "}
                <span className="font-thai text-foreground">ฌ</span>,{" "}
                <span className="font-thai text-foreground">ฑ</span>,{" "}
                <span className="font-thai text-foreground">ฒ</span>,{" "}
                <span className="font-thai text-foreground">ท</span>,{" "}
                <span className="font-thai text-foreground">ธ</span> &mdash; ends
                as an unreleased <span className="font-mono text-xs">t</span>,
                while <span className="font-thai text-foreground">ค</span> and{" "}
                <span className="font-thai text-foreground">ฆ</span> end as{" "}
                <span className="font-mono text-xs">k</span>. The nasals keep
                their own sound: <span className="font-thai text-foreground">ณ</span>{" "}
                and <span className="font-thai text-foreground">ญ</span> end as{" "}
                <span className="font-mono text-xs">n</span>.
              </p>
              <p>
                <span className="font-thai text-foreground">ง</span> is the one
                to watch: its sound{" "}
                <span className="font-mono text-xs">ŋ</span> (the &ldquo;ng&rdquo;
                in &ldquo;sing&rdquo;) both{" "}
                <span className="font-medium text-foreground">starts and
                ends</span> a syllable &mdash; and unlike English, Thai lets a
                word <em>begin</em> with it, as its own name{" "}
                <span className="font-thai text-foreground">ง งู</span>{" "}
                <span className="font-mono text-xs">[ŋɔ̄ː ŋūː]</span> shows. The{" "}
                <span className="font-medium text-foreground">Initial</span> and{" "}
                <span className="font-medium text-foreground">Final</span>{" "}
                columns below give each letter&rsquo;s two jobs.
              </p>
            </>
          ),
        },
      ]}
      closing={
        <p className="text-sm text-foreground-muted">
          In the drill below you will practise these twelve letters until you can
          recall each one&rsquo;s name and sound on sight.
        </p>
      }
    />
  );
}
