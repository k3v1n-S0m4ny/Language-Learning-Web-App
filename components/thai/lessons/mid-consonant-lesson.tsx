import type { ConsonantItem } from "@/seed/thai/types";
import { ConsonantClassLesson } from "./consonant-class-lesson";
import { ThaiScriptHistory } from "./thai-script-history";

// Unit 2 (M11) — the first consonant unit: the nine mid-class letters.
// Supplies the mid-class copy to the shared ConsonantClassLesson shell, and
// carries the one-time Thai-script history primer as the shell's `intro` (unit
// 2 is the first place a learner meets the alphabet — units 3+ get only a short
// per-unit callout instead). Mechanics prose is distilled from
// seed/thai/research/reading-thai-script.html §3 "Reading the consonants" and
// §4 "Consonants at the end of a syllable"; history is cited inside
// ThaiScriptHistory.
export function MidConsonantLesson({ items }: { items: ConsonantItem[] }) {
  return (
    <ConsonantClassLesson
      items={items}
      intro={<ThaiScriptHistory />}
      tableHeading="The nine mid-class consonants"
      sections={[
        {
          heading: "Why the letters come in classes",
          body: (
            <>
              <p>
                Every Thai consonant belongs to one of three classes &mdash;{" "}
                <span className="font-medium text-foreground">mid, high, or low</span>.
                The names are historical, not instructions about pitch: do not read
                &ldquo;high&rdquo; as &ldquo;say it high.&rdquo; A letter&rsquo;s
                class does not change how it sounds. Instead it is one of the
                ingredients that later decides a syllable&rsquo;s{" "}
                <span className="font-medium text-foreground">tone</span> &mdash; the
                full rules come in unit 10.
              </p>
              <p>
                The classes are a fossil of an older stage of the language, when
                these letters carried sound differences Thai has since lost. This
                unit covers all <span className="font-medium text-foreground">nine
                mid-class letters</span> &mdash; the smallest class, and the easiest
                place to start.
              </p>
            </>
          ),
        },
        {
          heading: "How to read the Name column",
          body: (
            <>
              <p>
                Because so many letters share a sound, each one has an{" "}
                <span className="font-medium text-foreground">acrophonic name</span>{" "}
                &mdash; a fixed stock word that pins down which letter you mean, the
                way English says &ldquo;A is for apple.&rdquo; The letter{" "}
                <span className="font-thai text-foreground">ก</span> is known as{" "}
                <span className="font-thai text-foreground">ก ไก่</span>{" "}
                <span className="font-mono text-xs">[kɔ̄ː kàj]</span> &mdash;
                &ldquo;<span className="font-mono text-xs">k</span>, as in{" "}
                <span className="font-thai text-foreground">ไก่</span> &lsquo;chicken&rsquo;.&rdquo;
              </p>
              <p>
                You do not need to memorise the names to read, but Thai speakers use
                them constantly to spell things out loud &mdash; and they are the
                reason the <span className="font-medium text-foreground">Meaning</span>{" "}
                column exists in the table below.
              </p>
            </>
          ),
        },
        {
          heading: "One letter, two jobs: start vs end",
          body: (
            <>
              <p>
                A consonant&rsquo;s sound at the <span className="font-medium text-foreground">start</span>{" "}
                of a syllable is not always its sound at the{" "}
                <span className="font-medium text-foreground">end</span>. Thai allows
                only a handful of endings, so at the end many letters collapse onto
                the same sound. Among this unit&rsquo;s letters,{" "}
                <span className="font-thai text-foreground">ด</span> and{" "}
                <span className="font-thai text-foreground">ต</span> both end as an
                unreleased <span className="font-mono text-xs">t</span>;{" "}
                <span className="font-thai text-foreground">บ</span> and{" "}
                <span className="font-thai text-foreground">ป</span> both end as{" "}
                <span className="font-mono text-xs">p</span>; and{" "}
                <span className="font-thai text-foreground">ก</span> ends as{" "}
                <span className="font-mono text-xs">k</span>.
              </p>
              <p>
                The odd one out is <span className="font-thai text-foreground">อ</span>,
                which never ends a syllable at all &mdash; it is a special carrier
                letter, and you will see what it does when we reach the vowels. The{" "}
                <span className="font-medium text-foreground">Initial</span> and{" "}
                <span className="font-medium text-foreground">Final</span> columns
                below show each letter&rsquo;s two jobs; a dash means the letter
                cannot close a syllable.
              </p>
            </>
          ),
        },
      ]}
      closing={
        <p className="text-sm text-foreground-muted">
          In the drill below you will practise these nine letters until you can
          recall each one&rsquo;s name and sound on sight.
        </p>
      }
    />
  );
}
