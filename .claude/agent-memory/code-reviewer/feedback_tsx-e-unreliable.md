---
name: tsx-e-unreliable
description: npx tsx -e "...async IIFE/then chain..." can exit 0 with silently swallowed stdout on this Windows/Git-Bash setup; use a real temp .mjs file with a file:// URL import for reproducible probe evidence instead
metadata:
  type: feedback
---

`npx tsx -e "import('./x.ts').then(m => console.log(...))"` sometimes exits 0 but
prints nothing on this project's Windows/Git-Bash environment — the async callback
doesn't appear to flush before the process exits. This happened re-running an
implementer's exact `resolveLanguage()` probe command verbatim in M10 (seed/
multi-language restructure review): identical command, implementer's paste showed
correct JSON, the reviewer's re-run showed empty output at exit 0.

**Why:** A code reviewer's job is to independently reproduce claimed command output,
not just re-paste it. An unreliable one-liner invocation method undermines that even
when the underlying code is correct — the reviewer must not conflate "the command exited
0" with "the command's output was reproduced."

**How to apply:** When verifying a TS module's runtime behavior (e.g. a
`resolveLanguage()`-style probe) via `tsx`, prefer writing a real scratch `.mjs`/`.ts`
file (in the scratchpad dir) that imports the target module via an absolute
`file:///` URL (Windows requires the `file://` scheme — a bare `C:/...` import path
throws `ERR_UNSUPPORTED_ESM_URL_SCHEME`), rather than `tsx -e "...promise chain..."`.
This reproduced the implementer's claimed values exactly once switched. Flag the
discrepancy in the review summary even when the underlying code is fine — it's a
process/tooling finding, not just a footnote.
