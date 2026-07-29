---
name: tailwind-competing-text-color-cascade
description: When two text-color utility classes (e.g. a static text-foreground plus a dynamic ink-token class) coexist on one element, Tailwind's compiled rule order — not the className string order — decides which wins; verify in the actual compiled CSS, don't assume the "later in the string" or "more specific" one applies
metadata:
  type: feedback
---

Two same-specificity single-class Tailwind utilities targeting the same CSS
property (e.g. `text-foreground` and `text-[var(--heat-4-ink)]`, both setting
`color`) do NOT resolve by their order in the `className` string. They resolve
by the order the corresponding rules were emitted into the compiled
stylesheet, which is an internal Tailwind build detail unrelated to source
code layout. A class that looks like it "should" override (because it's a
dynamic, more-specific-looking arbitrary value, or because it's listed later
in the template literal) can silently lose to a plain named utility that
happens to be emitted later in the CSS file.

**Why:** Found in glass-redesign Phase 3 review — `tone-confusion-matrix.tsx`
combined a hardcoded `text-foreground` class with a per-cell
`text-[var(--heat-N-ink)]` class from a shared `cellColor()`/`heatCellClass()`
helper. The implementer computed and documented AA contrast ratios assuming
the ink token would render, but never checked the cascade: `.text-foreground`
was emitted AFTER all five `.text-[var(--heat-N-ink)]` rules in the actual
compiled `.next/static/chunks/*.css`, so `text-foreground` won every time.
For 4 of 5 stops this was accidentally harmless (the ink token happened to
equal `--foreground`'s hex in that theme), which is exactly why it went
unnoticed — but the top-of-ramp stop (the most important one to read) failed
AA in both themes (2.42:1 light, 2.65:1 dark) despite the globals.css table
claiming 7.20:1 / 5.66:1. This was a genuinely NEW regression introduced by
the diff (the prior code used one non-competing text class), not a
pre-existing issue.

**How to apply:** Whenever a reviewed diff puts two `text-*`/`bg-*`/`border-*`
utilities of the SAME CSS property on one element from two different sources
(one static in the JSX template, one returned from a helper function/lookup
table), don't reason about which "should" win from the source — grep the
actual compiled CSS (`npm run build` then search `.next/static/chunks/*.css`
for both full class selectors, e.g. via `indexOf`) and compare byte offsets.
Whichever rule's selector appears later in the file wins. This is the same
family of "computed value never actually reached the DOM" bug as
[[wcag-contrast-verify]] and [[alpha-composited-contrast]] — always verify a
claimed AA ratio against what's ACTUALLY rendered, not what the code intends.
