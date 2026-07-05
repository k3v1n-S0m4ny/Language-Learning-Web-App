import type { ConsonantItem } from "@/seed/thai/types";
import { ConsonantClassLesson } from "./consonant-class-lesson";

// Unit 3 (M11) — the eleven high-class letters. Supplies high-class copy to the
// shared ConsonantClassLesson shell. Unlike unit 2 it does NOT re-render the
// full ThaiScriptHistory primer (that is a one-time thing); instead its
// per-unit history callout is the obsolete letter ฃ (kho khuat) — one of the
// two dead letters (ฅ arrives in unit 5), which the table already renders with
// an "obsolete, not drilled" badge. Mechanics prose is distilled from
// seed/thai/research/reading-thai-script.html §3 "Reading the consonants" and
// §4 "Consonants at the end of a syllable".
export function HighConsonantLesson({ items }: { items: ConsonantItem[] }) {
  return (
    <ConsonantClassLesson
      items={items}
      tableHeading="The eleven high-class consonants"
      callout={
        <section className="flex flex-col gap-2 rounded-[var(--r-lg)] border border-border-base bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground">
            The letter that fell out of use: <span className="font-thai">ฃ</span>
          </h2>
          <p className="text-sm leading-relaxed text-foreground-muted">
            One high-class letter in the table below,{" "}
            <span className="font-thai text-foreground">ฃ</span>{" "}
            <span className="font-mono text-xs">[kʰ]</span>{" "}
            (its name means &ldquo;bottle&rdquo;), is a museum piece. It once stood
            for a slightly different{" "}
            <span className="font-mono text-xs">kʰ</span>{" "}
            sound that Thai later merged into ordinary{" "}
            <span className="font-thai text-foreground">ข</span>, and it dropped out
            of everyday writing about a century ago (roughly the 1920s). It is one
            of just two dead letters in the alphabet &mdash; you will meet the
            other, <span className="font-thai text-foreground">ฅ</span>, in unit 5.
            We show <span className="font-thai text-foreground">ฃ</span>{" "}
            so the inventory is complete, but you will never be drilled on it.
          </p>
        </section>
      }
      sections={[
        {
          heading: "Why this class is called “high”",
          body: (
            <>
              <p>
                As with the mid class, the label{" "}
                <span className="font-medium text-foreground">high</span> is a
                historical name, not an instruction to raise your pitch. What these
                eleven letters actually share is that every one begins a syllable
                with a{" "}
                <span className="font-medium text-foreground">voiceless</span>{" "}
                sound &mdash; the aspirated stops and the voiceless fricatives:{" "}
                <span className="font-mono text-xs">kʰ, tɕʰ, tʰ, pʰ, f, s, h</span>.
                There is no voicing in the whole set.
              </p>
              <p>
                The high class exists as a partner to the{" "}
                <span className="font-medium text-foreground">low</span>{" "}
                class (units 4&ndash;5): between them they carve up the tone space,
                which is why so many sounds appear in more than one class. A
                letter&rsquo;s class is just one ingredient of a syllable&rsquo;s
                tone &mdash; the full recipe comes in unit 10.
              </p>
            </>
          ),
        },
        {
          heading: "The names — and a tone worth noticing",
          body: (
            <>
              <p>
                Each high-class letter carries the same kind of{" "}
                <span className="font-medium text-foreground">acrophonic name</span>{" "}
                you met in unit 2 &mdash; a stock word that pins down which letter
                you mean. <span className="font-thai text-foreground">ข</span> is{" "}
                <span className="font-thai text-foreground">ข ไข่</span>{" "}
                <span className="font-mono text-xs">[kʰɔ̌ː kàj]</span> &mdash;
                &ldquo;<span className="font-mono text-xs">kʰ</span>, as in{" "}
                <span className="font-thai text-foreground">ไข่</span> &lsquo;egg&rsquo;.&rdquo;
              </p>
              <p>
                Listen to the bare letter-name itself and you will hear the class at
                work: a high-class letter&rsquo;s name is said on a{" "}
                <span className="font-medium text-foreground">rising</span>{" "}
                tone &mdash; <span className="font-thai text-foreground">ข</span>{" "}
                <span className="font-mono text-xs">[kʰɔ̌ː]</span>, the pitch
                sweeping up like a question &mdash; where a mid-class name such as{" "}
                <span className="font-thai text-foreground">ก</span>{" "}
                <span className="font-mono text-xs">[kɔ̄ː]</span> sits flat in the
                middle. That is your first taste of a class steering a tone.
              </p>
            </>
          ),
        },
        {
          heading: "Front-of-word specialists: start vs end",
          body: (
            <>
              <p>
                High-class letters are mostly{" "}
                <span className="font-medium text-foreground">front-of-word specialists</span>: many of them cannot end a syllable at all.{" "}
                <span className="font-thai text-foreground">ฉ</span>,{" "}
                <span className="font-thai text-foreground">ผ</span>,{" "}
                <span className="font-thai text-foreground">ฝ</span> and{" "}
                <span className="font-thai text-foreground">ห</span>{" "}
                only ever appear at the start &mdash; a dash in the{" "}
                <span className="font-medium text-foreground">Final</span>{" "}
                column marks each one.
              </p>
              <p>
                The letters that <em>can</em> close a syllable collapse onto just two
                endings. <span className="font-thai text-foreground">ข</span>{" "}
                ends as an unreleased{" "}
                <span className="font-mono text-xs">k</span>; and{" "}
                <span className="font-thai text-foreground">ฐ</span>,{" "}
                <span className="font-thai text-foreground">ถ</span>,{" "}
                <span className="font-thai text-foreground">ศ</span>,{" "}
                <span className="font-thai text-foreground">ษ</span> and{" "}
                <span className="font-thai text-foreground">ส</span>{" "}
                all end as an unreleased{" "}
                <span className="font-mono text-xs">t</span>, no matter how
                different they sound at the front. The{" "}
                <span className="font-medium text-foreground">Initial</span> and{" "}
                <span className="font-medium text-foreground">Final</span>{" "}
                columns below show each letter&rsquo;s two jobs.
              </p>
            </>
          ),
        },
      ]}
      closing={
        <p className="text-sm text-foreground-muted">
          In the drill below you will practise these letters &mdash; all except the
          obsolete <span className="font-thai">ฃ</span> &mdash; until you can recall
          each one&rsquo;s name and sound on sight.
        </p>
      }
    />
  );
}
