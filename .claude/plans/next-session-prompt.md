# Next-Session Prompt — Language Learning Web App (Chinese SRS flashcards)

> Paste everything below into a FRESH Claude Code session opened in
> `C:\Users\User\Software Projects\Language-Learning-App`. It assumes ZERO prior context.
> The point of a fresh session is to run the full `/dev-cycle` with the real agents without
> context bloat.

---

You are picking up a **Chinese spaced-repetition flashcard web app** for a couple (the user and
his girlfriend) to study together. **M1–M6 are DONE and live in production**
(`https://thepolyglot.vercel.app`, deployed 2026-05-23, commit `a482c58`). Your job is
**Milestone 7: same-day requeue for failed / learning cards**, and the Validation Contract is
already written and approved.

## 0. First action — run the dev-cycle
The M7 contract is in `.claude/plans/active-plan.md` (status `DRAFT` → flip to `IN_PROGRESS`
when you start; it is **already approved by the user**, do not re-litigate scope).
Implementation has NOT started. Run `/dev-cycle` to execute Phase 2 (implement) → Phase 3
(review) → Phase 4 (QA) → Phase 5 (wrap up), delegating to the `implementer`, `code-reviewer`,
and `qa-engineer` agents. Confirm the Agent tool lists those three; if not, ask the user before
falling back to `general-purpose`.

## 1. The complaint being fixed
Rating **Again** does not bring the card back within the session. Root cause (confirmed): the
study queue selects the earliest card where `due <= now` (`lib/review/queries.ts`). ts-fsrs
schedules Again (and short Hard) as a same-day learning step `due ≈ now + ~1 min` — a *future*
time — so `due <= now` excludes it; the card vanishes for ~1 real minute, or the session shows
"done" if it was the last card.

**The agreed fix** (full detail + assertions A1–A11 in `active-plan.md`): broaden queue
eligibility to `due <= endOfThailandDay(now)`, keep `due ASC` ordering (so a failed card returns
*after* genuinely-overdue cards — "soon, after a few cards" — and immediately if it's the only
one left). Applies to **any same-day step**, not just Again. Graduated multi-day cards must NOT
be pulled forward. Align the header `dueCount` with the same predicate so the screen never shows
a card while reading "0 due / 0 new".

## 2. User decisions already made (do not re-ask)
- Again behavior: **"soon, after a few cards"** (not immediate-next).
- Scope: **any same-day learning step** (Again + short Hard/Good), not Again only.

## 3. Read these first (durable context in the repo)
- `.claude/plans/active-plan.md` — the M7 Validation Contract (assertions A1–A11). THIS IS THE SPEC.
- `CONTEXT.md` — glossary (Learner, Card, Word, Gloss, Pinyin, Review State, …). Use exact terms.
- `AGENTS.md` — **CRITICAL: this is Next.js 16, not your training data.** Read the relevant
  guides in `node_modules/next/dist/docs/` before writing Next code.
- `lib/review/{queries,scheduler,actions,time,types}.ts`, `lib/db/schema.ts`, `app/page.tsx` —
  the code you'll touch / match. `startOfThailandDay` lives in `lib/review/time.ts`.
- `.claude/plans/m6-archive--*` — prior milestone handoffs (context only; do not redo).

## 4. Hard rules (the user cares a lot)
- **No placeholders, stubs, mocks, or fake/sample data.** Every count/card from real DB queries.
- **Verify third-party behavior before relying on it.** Specifically (A5): confirm against the
  *installed* ts-fsrs that Again/Hard yield a same-day `due` and Good/Easy graduate to ≥ 1 day.
  If Review intervals can be intra-day in this config, fall back to an explicit FSRS-state filter
  (`state ∈ {Learning, Relearning}`) and record the finding. Don't assume from training data.
- Simple > clever; comment the "why", not the "what".
- Keep the `.claude/plans/` handoff chain current with canonical YAML frontmatter:
  `active-plan.md` → `implementation-summary.md` → `review-summary.md` → `qa-summary.md`.

## 5. Verification (A10)
`npx tsc --noEmit`, `npx eslint .`, `npm run build` — all exit 0. Build fetches Google Fonts; a
font-fetch failure is environmental — retry and note it.

## 6. Git / deploy state
- Branch `main`. M6 is committed (`a482c58`) and live in production.
- Plan scaffolding for M7 (this prompt, the new `active-plan.md`, and the `m6-archive--*`
  renames) may be uncommitted on disk — that's fine, the files are present. Do NOT push or
  deploy without the user explicitly asking. Decide deployment separately after QA passes.

## 7. Stack quick reference
Next.js 16.2.6 (App Router, Turbopack, no `src/`), React 19, Tailwind v4, TypeScript. Neon
Postgres (us-east-1) via Drizzle (`drizzle-orm/neon-http`, `lib/db/index.ts`, `DATABASE_URL`).
Auth.js v5 Google sign-in, allowlist of two emails, route protection in `proxy.ts` (Next 16 uses
`proxy.ts`, not `middleware.ts`). ts-fsrs for scheduling (`lib/review/scheduler.ts`).
