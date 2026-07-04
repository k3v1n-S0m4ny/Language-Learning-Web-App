---
name: tailwind-scans-claude-plans-docs
description: Tailwind v4 auto content-detection scans .claude/plans/*.md (not gitignored), so bracket-arbitrary-value-shaped prose in handoff docs can leak spurious/invalid CSS into every build
metadata:
  type: project
---

This repo's `app/globals.css` has no `@source`/`@source not` exclusions (just `@import "tailwindcss";`),
so Tailwind v4's default content auto-detection scans the whole working tree respecting `.gitignore`.
`.gitignore` only excludes `.claude/worktrees/` — `.claude/plans/*.md` is NOT excluded. Confirmed
(2026-07-04, glass-redesign Phase 2 review): an implementer handoff doc
(`glass-redesign-phase2.impl.md`) contained the prose shorthand `rounded-[var(--r-lg/md/pill)]`
(summarizing three separate real classes used in actual code) and Tailwind picked this up as a
candidate utility class, generating broken CSS (`Unexpected token Delim('/')`) and a build warning
that did not appear in the implementer's pasted "clean" build output.

**Why:** `npm run build` still exits 0 and no real DOM node carries the broken class, so this is
currently harmless — but it means (a) any future doc prose that looks like bracket-arbitrary Tailwind
syntax can inject dead/invalid CSS rules into every build silently, and (b) an implementer's "build was
clean" claim can be stale/wrong for reasons that have nothing to do with their actual code changes,
purely because of what's sitting in an untracked/tracked `.md` file elsewhere in the repo.

**How to apply:** When re-running `npm run build` for this project, always scan the full verbatim
output for a "Found N warning(s) while optimizing generated CSS" block, not just the exit code —
don't assume warnings before "Compiled successfully" belong to a pre-existing/unrelated issue. If one
appears, grep the exact offending selector text across the whole repo (not just `components`/`app`) to
find the source before concluding it's a real component bug — it may be `.claude/plans/*.md` prose.
Recommend (not yet done) either gitignoring `.claude/plans/` or adding a Tailwind
`@source not "../.claude"` exclusion in `globals.css` as a follow-up.
