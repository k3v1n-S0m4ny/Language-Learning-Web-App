---
name: celebration-effect-partial-gating
description: A "celebration" component with multiple sub-effects (confetti + spring bounce, toast + sound, etc.) can gate only ONE sub-effect on the trigger condition while the other fires unconditionally whenever motion is enabled — check every sub-effect's gating independently, not just the headline one
metadata:
  type: feedback
---

When a milestone/celebration component bundles multiple visual effects (e.g.
confetti particles + a spring "pop" entrance animation on the wrapped
content), verify EACH effect is independently gated on the actual milestone
condition (`show`), not just on `reduceMotion`. It's easy to correctly gate
the flashy effect (confetti) on `show` while leaving a subtler effect (an
entrance spring/scale-in) unconditional — i.e. it plays every time the
component mounts, motion-permitting, regardless of whether this is a genuine
milestone or a routine/idle render.

**Why:** Found in glass-redesign Phase 3 — `components/ui/celebration.tsx`
correctly gated its confetti burst on `show` (via a `burstId` that only
increments when `show` transitions true), but wrapped `children` in a
`motion.div` spring-pop animation purely on `!reduceMotion`, with no `show`
dependency at all. Because `components/empty-state.tsx` wraps its *entire*
card in `<Celebration show={celebrate}>`, every idle EmptyState revisit
(celebrate=false, no confetti) still got the spring bounce — a partial
violation of the "reserved for genuine milestones only, never on idle
revisits" constraint that wasn't caught by the implementer and wasn't listed
as a documented deviation (unlike other judgment calls in the same handoff,
which WERE flagged). The component's own docstring described "confetti +
spring bounce" as one combined effect, making the omission easy to miss on a
skim.

**How to apply:** For any multi-part celebration/toast/highlight component,
enumerate every animated sub-effect separately and trace each one's gating
condition back to the actual trigger prop, not just to the reduced-motion
flag. Cross-check the component's own code comments/docstring against what
it actually renders — a docstring claiming "X and Y are both gated by Z" is a
claim to verify line-by-line, not evidence.
