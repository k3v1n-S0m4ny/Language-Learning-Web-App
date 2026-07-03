---
name: mtime-corroborates-no-change-claims
description: when an implementer claims a file "needed no changes" for a fix, corroborate with file-mtime evidence, not just a source read
metadata:
  type: feedback
---

When a round-2/re-review handoff claims a file required no changes to
support a fix elsewhere (e.g. "the UI component derives everything from
`steps.length`, so it needed no changes"), a source read confirming the
current logic is correct is good but doesn't by itself prove nothing was
quietly touched and reverted, or that the claim is honest about scope. On
Windows/Git Bash, `Get-Item <path> | Select-Object LastWriteTime` (via
`powershell -NoProfile -Command`) gives a cheap, independent corroboration:
compare the claimed-untouched files' mtimes against the mtimes of the files
that *were* genuinely edited this round. If the "untouched" files predate the
edited ones, that's hard evidence the claim holds, not just plausible.

**Why:** used successfully in the M13 Read-Thai round-2 re-review — the
implementer claimed `tone-assembly-question.tsx`/`drill-session.tsx` needed
no changes to support a variable-length (4-vs-5-step) branching sequence.
Grepping the tree for hardcoded step-count assumptions (none found) plus
comparing `LastWriteTime` (1:33-1:34 PM, predating the same round's edits to
`drill.ts`/`actions.ts`/`reachability.ts` at 2:48 PM) gave two independent,
cheap confirmations rather than relying on the pasted handoff text alone.

**How to apply:** in any re-review round where the implementer claims a file
was untouched/didn't need changes, run a quick mtime comparison across the
claimed-changed vs. claimed-untouched files before accepting the claim at
face value — especially useful when the working tree has no intermediate
git commits between rounds (so `git diff` against HEAD conflates all rounds
together and can't isolate what changed in *this* round on its own).
