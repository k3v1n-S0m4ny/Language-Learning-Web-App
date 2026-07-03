---
name: doc-vs-plan-paraphrase-gap
description: when a plan's plain-English summary of a curriculum/source doc's rule omits a caveat, verify branching/drill logic against the actual source doc, not the plan's paraphrase
metadata:
  type: feedback
---

For content-driven features (esp. the Read-Thai course), the active-plan.md's
prose description of a source doc's rule can be an incomplete paraphrase that
drops a caveat the doc itself states explicitly. Implementers who code from
the plan's summary rather than re-reading the cited doc section will
faithfully implement the *incomplete* version.

Concrete instance (M13, `.claude/plans/review-summary.md`): active-plan.md's
A2 text said the `tone-assembly` branch was "unmarked → live/dead → (dead:)
vowel length → tone" with no class-gating mentioned. The actual source doc
(`seed/thai/research/reading-thai-script.html`) explicitly annotates its
flowchart: "Dead: how long is the vowel? (length only matters for the Low
class)" — mid/high class dead syllables should skip the length step entirely
and go straight to tone (always `low` for those two classes). The implemented
`buildToneAssemblySteps` asked the length step unconditionally, contradicting
both the doc and the implementer's own lesson-page prose written in the same
PR. This didn't break scoring (the step is client-side-feedback-only, final
answer still correct) but was a genuine curriculum-accuracy bug affecting 20%
of the unit's content (20/100 words were unmarked+dead+mid/high class).

**Why:** the plan is a compressed summary written for scoping/approval, not a
verbatim transcription of the source doc; nuance loss is expected and not the
plan-writer's fault, but it means "the code matches the plan" is not the same
guarantee as "the code matches the source of truth."

**How to apply:** whenever a validation contract says a drill/lesson/branching
mechanic should "mirror" or be "derived from" a cited source doc, grep the
actual doc for the relevant section (flowchart captions, "note:"/parenthetical
asides, worked examples) rather than relying on the plan's paraphrase, and
cross-check the implementation against the doc's own words. Also check for
internal contradiction: if the same PR ships both a lesson page (prose) and a
drill (interactive logic) for the same rule, diff their descriptions of the
rule against each other — an implementer who wrote correct lesson prose but
incorrect drill logic (or vice versa) is a strong, cheap-to-check signal of
exactly this class of bug. See also [[probe-table-completeness]] (both are
about not trusting a summary/subset as if it were the exhaustive source).
