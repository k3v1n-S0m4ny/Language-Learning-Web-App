---
feature: read-thai-lesson-content
created: 2026-07-05T08:05:10.028392+00:00
source-session: 16b487f2-906c-46b3-9822-861f27324bd3
context-at-handoff: 221k (red)
---

# Handoff: Make Read-Thai lessons actually TEACH (units 2–8 explanatory content + culture/history)

## Goal
Owner directive (2026-07-05): the Read-Thai **lesson** pages "are not explanatory AT ALL." Units 2–8 render a nice table and nothing else, so a learner can't look at the table and understand the *logic* of Thai script. Add a **minimum viable amount of explanatory prose** to each foundational lesson so the table becomes legible on its own — and so it scaffolds the drills. **Must include culture and history**, not just mechanics. Memory: `read-thai-lessons-need-explanation.md` (indexed in MEMORY.md).

This is content authoring → per `prefers-direct-build-for-content`, build directly (skip /dev-cycle). BUT owner's global rule = **research-first, cited** for any history/culture claims — do NOT ship parametric history. The curriculum source of truth already exists: `seed/thai/research/reading-thai-script.html` (gitignored) — draw from it and cite external sources for history.

## Concrete gap (verified this session)
- `app/thai/[unit]/lesson/page.tsx` branches per unit. Units **2–5 → `ConsonantTable`**, **6 → `FinalsTable`**, **7–8 → `VowelTable`** — these components are **pure `<table>`, zero prose** (`components/thai/lessons/consonant-table.tsx` is ~48 lines, all table).
- Units **9–14 already have richer lesson components** with structure/prose (`tone-rules-lesson.tsx` 134 ln, `special-signs-lesson.tsx` 154, `syllable-decode-lesson.tsx` 107) — use one as the **style/pattern template**. Unit 1 has `Unit1Lesson` (IPA primer).
- So the work is concentrated in units **2–8** (consonant classes, finals, vowels).

## What the explanation should cover (owner intent)
Mechanics: why consonants have **classes** (mid/high/low) and that classes exist to encode **tone**; the **acrophonic naming** system (ก ไก่ = letter + memory-word); why a letter's sound **differs initial vs final** (finals collapse — many letters → /t/, etc.); how vowels wrap **around** the consonant (before/after/above/below).
Culture & history (CITE): Thai script's descent (Brahmi → Old Mon/Khmer), King Ramkhamhaeng's **1283** inscription, why the **loops/หัว** exist, why there are **redundant/obsolete** letters (ฃ ฅ), the late addition of **tone marks**, etc.

## Decisions to confirm with owner BEFORE building (real forks)
1. **Scope now:** build unit 2 as the pattern and get sign-off, then fan out to 3–8? Or all at once? (Recommend: unit 2 first, approve, then replicate.)
2. **Dose:** "minimum" — a few short sections above/around the table? A collapsible "Why?" panel? History as a short callout per unit vs a one-time intro (maybe on unit 2 / the course landing)?
3. **Where content lives:** new small explainer components + prose as JSX (like units 9–14), vs a structured content field in the seed. Prose-in-component is simplest and matches the existing richer lessons; keep it there unless owner wants it seed-driven.
4. **Model for history research:** owner picks the Perplexity/Firecrawl model (never auto-pick — global rule).

## Next steps (start here)
1. Read the memory + `app/thai/[unit]/lesson/page.tsx` + `components/thai/lessons/consonant-table.tsx` (the gap) and `components/thai/lessons/tone-rules-lesson.tsx` (the style to match).
2. Skim `seed/thai/research/reading-thai-script.html` — the curriculum source; most mechanics prose can be distilled from it.
3. Ask the owner the 4 scoping questions above (esp. dose + unit-2-first).
4. Research Thai-script **history/culture** with a cited source (owner picks the model) — keep a short cited summary.
5. Draft **unit 2's** explanatory sections as the reusable pattern (mechanics from the research doc + a short cited history/culture callout), wire into the lesson page, show the owner.
6. On approval, replicate for units 3–8 (consonant classes 3–5, finals 6, vowels 7–8), adapting per unit.

## Current repo state (this feature branch) — all COMMITTED, nothing mid-flight
- Worktree `C:\Users\User\Software Projects\Language-Learning-App\.claude\worktrees\thai-unit2-flashcards`, branch `worktree-thai-unit2-flashcards` (off main).
- Two commits, **NOT merged, NOT deployed**:
  - `6b1d0bf` — unit-2 self-graded flashcard pilot + ป audio fix (ป regen is LIVE in prod DB regardless of merge).
  - `a9097ba` — flashcard refinements: Classical⇄Modern font switcher (IBM Plex Sans Thai looped/loopless), initial+final sound tiles, name IPA for the 9 mid consonants, gloss removed, and a pre-existing hydration-mismatch fix (seeded shuffle).
- Only uncommitted change: `.claude/settings.local.json` (machine-local permissions — intentionally never staged).
- A `next dev` server was running on **localhost:3001** (prod DB via .env.local); it likely dies on /clear — relaunch with `npm run dev` if needed.
- Verified green at last commit: `npx tsc --noEmit` (0), `npm test` (37/37), `npx eslint` (0).

## Key context / cautions
- **`.env.local` DATABASE_URL IS PRODUCTION** (`vercel-prod-db-is-dev-db`). Lessons read seed content, but if any lesson content moves into the seed + a re-seed is needed, that WRITES PROD — branch the Neon DB first. Pure prose-in-component needs no DB touch.
- **Blob/prod auth gotcha** (`read-thai-unit2-flashcard-pilot.md`): if Blob 403s, it's a stale `VERCEL_OIDC_TOKEN` in .env.local — fix is `vercel link` in the MAIN checkout, then copy env to the worktree. (Not needed for lesson prose.)
- AGENTS.md: this is a modified Next.js — read `node_modules/next/dist/docs/` before writing framework code.

## Read before starting
- `C:\Users\User\.claude\projects\C--Users-User-Software-Projects-Language-Learning-App\memory\read-thai-lessons-need-explanation.md`
- `app\thai\[unit]\lesson\page.tsx`
- `components\thai\lessons\consonant-table.tsx` (the gap) and `components\thai\lessons\tone-rules-lesson.tsx` (the pattern)
- `seed\thai\research\reading-thai-script.html` (curriculum source of truth)
