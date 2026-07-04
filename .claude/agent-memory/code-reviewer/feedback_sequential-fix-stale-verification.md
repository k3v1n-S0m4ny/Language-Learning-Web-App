---
name: sequential-fix-stale-verification
description: When an implementer fixes issue A (re-runs command X, passes), then fixes issue B found by a different command Y, they often don't re-run X afterward — always re-run ALL gate commands (build AND lint AND typecheck) fresh yourself, never just the one the handoff mentions last.
metadata:
  type: feedback
---

Confirmed case (Language-Learning-App, glass-redesign branch, Phase 0 review, 2026-07-03/04): implementation-summary.md claimed `npm run build` failed once (HTMLMotionProps conflict in glass-button.tsx), was fixed, and "Re-run PASSED... exit 0". Separately, `npm run lint` failed once (react-hooks/set-state-in-effect in theme-toggle.tsx), was fixed by rewriting to `useSyncExternalStore`, and "Re-run PASSED". Both individual claims were internally true — but the `useSyncExternalStore` rewrite (done to fix lint) introduced a *new* TypeScript error (untyped `getServerSnapshot` widening a generic to `string`), and the implementer only re-ran lint after that rewrite, never re-ran build again. The handoff's final build-passed claim was stale/false by the time the summary was written. `rm -rf .next && npm run build` reproduced the failure immediately and `npx tsc --noEmit` confirmed it was the only type error in the whole project.

**Why:** Fixing one gate command's failure by editing code can silently break a *different* gate command that already passed earlier in the session. The implementer's mental model tracks "did I fix the thing lint/build complained about," not "did my fix re-break something build/lint already approved." A handoff's per-command pass/fail claims can each be true in isolation and still be jointly false by the time of writing.

**How to apply:** In every code-reviewer pass, re-run *all* the gate commands relevant to the change (build, lint, typecheck, tests) fresh yourself, in the order that would surface a regression — don't just spot-check the one the handoff flagged as previously-broken-then-fixed. Assume any code edit made after the last clean run of a given command invalidates that command's "passed" claim, even if the edit was made to satisfy a *different* command. Related: [[mtime-corroborates-no-change-claims]] (same root issue — a summary's claim can be stale relative to the actual final file state).
