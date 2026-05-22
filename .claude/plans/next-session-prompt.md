# Next-Session Prompt — Language Learning Web App (Chinese SRS flashcards)

> Paste everything below into a FRESH Claude Code session opened in
> `C:\Users\User\Software Projects\Language-Learning-App`. It assumes ZERO prior context.
> The point of a fresh session is to run the full `/dev-cycle` with the real agents without
> this build-up of context.

---

You are picking up a **Chinese spaced-repetition flashcard web app** for a couple (the user
and his girlfriend) to study together. **M1–M5 are DONE and live in production**
(`https://thepolyglot.vercel.app`). Your job is **Milestone 6: the Progress / Stats view**,
and the Validation Contract is already written and approved.

## 0. First action — run the dev-cycle
The M6 contract is in `.claude/plans/active-plan.md` (status `IN_PROGRESS`, **approved**).
Implementation has NOT started. Run `/dev-cycle` to execute Phase 2 (implement) → Phase 3
(review) → Phase 4 (QA) → Phase 5 (wrap up), delegating to the `implementer`,
`code-reviewer`, and `qa-engineer` agents.

**Agent availability check:** those three agents live in `~/.claude/agents/`. A UTF-8 BOM that
was preventing them from loading was stripped on 2026-05-22. Confirm the Agent tool lists
`implementer` / `code-reviewer` / `qa-engineer`. If it still does not, the agent definitions
are valid — it is an environment/runtime issue; fall back to `general-purpose` agents for each
role (ask the user first), keeping the same handoff files.

## 1. Read these first (durable context in the repo)
- `.claude/plans/active-plan.md` — the M6 Validation Contract (assertions A1–A13). This is the spec.
- `CONTEXT.md` — the glossary (Learner, Card, Word, Gloss, Pinyin, Review State, …). Use exact terms.
- `AGENTS.md` — **CRITICAL: this is Next.js 16, not your training data.** Read the relevant
  guides in `node_modules/next/dist/docs/` before writing Next code.
- `.claude/project-context/inspection-report--ast-code-inspection.md` — a recent bug-inspection
  of the review loop. Already-applied fixes are listed below; do NOT re-run that inspection.
- `lib/review/{queries,actions,scheduler,types}.ts`, `lib/db/schema.ts`, `app/page.tsx`,
  `proxy.ts`, `auth.ts` — existing patterns to match.

## 2. Hard rules (the user cares a lot)
- **No placeholders, stubs, mocks, or fake/sample data.** Every number comes from real DB queries.
- **Verify third-party tools before relying on them.** The contract calls for a charting
  library — actually install it and confirm it builds + renders under **React 19 / Next 16.2.6**
  (Recharts v3+ supports React 19; if not clean, pick a compatible alternative and record why).
- Ask clarifying questions before complex work; simple > clever; comment the "why", not the "what".
- Keep the `.claude/plans/` handoff chain current: `active-plan.md` → `implementation-summary.md`
  → `review-summary.md` → `qa-summary.md`, with the canonical YAML frontmatter.

## 3. Current git / deploy state (IMPORTANT)
- Branch `main`. Local commits NOT yet pushed and NOT yet deployed:
  - `aa83cf5` — M1–M4 review UI (this IS what production currently runs, deployed earlier)
  - `53c8c55` — M4/M5 milestone doc closeout
  - `c345041` — review-loop fixes (see §4)
- **Production runs the pre-fix code (`aa83cf5`).** The §4 fixes + M6 are intended to **deploy
  together later** via `vercel --prod` (CLI is installed, logged in as `k3v1n-s0m4ny`, repo
  linked). Do NOT deploy or push without the user asking.

## 4. Review-loop fixes already applied in `c345041` (baseline for reviewer/QA)
- `setNewCardsPerDay` now derives the learner from the session + validates input (was an
  unauthenticated server action taking a caller-supplied id).
- `submitReview` rejects ratings outside 1–4.
- New-card daily cap resets at **Thailand midnight** (UTC+7), not UTC — via `startOfThailandDay`
  in `lib/review/queries.ts` (M6 should reuse this same boundary for all day bucketing).
- `AudioButton` catches `play()` rejection; dead `getSessionCounts` removed.

## 5. M6 scope (full detail in active-plan.md)
A `/stats` route (auth-protected, linked from the study screen) showing **both learners side by
side**, with: cards seen/total/mature · reviews-per-day (30d) + streak · 7-day due forecast ·
Again/Hard/Good/Easy breakdown. Charts via a verified library. All day bucketing in Thailand tz.
**Privacy is intentional:** each learner sees both learners' stats (a couple). **Out of scope:**
deployment, card editing, settings UI, drill-downs.

## 6. Stack quick reference
Next.js 16.2.6 (App Router, Turbopack, no `src/`), React 19, Tailwind v4, TypeScript. Neon
Postgres (us-east-1) via Drizzle (`drizzle-orm/neon-http`, `lib/db/index.ts`, reads
`DATABASE_URL`). Auth.js v5 Google sign-in, allowlist of two emails, route protection in
`proxy.ts` (Next 16 uses `proxy.ts`, not `middleware.ts`). Verify: `npx tsc --noEmit`,
`npx eslint .`, `npm run build` (build fetches Google Fonts — a font-fetch failure is
environmental; retry).
