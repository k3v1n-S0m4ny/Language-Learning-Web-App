---
feature: advanced-thai-convention-theme
created: 2026-07-17T02:22:17.695940+00:00
source-session: 3c7ad1ce-1ff6-4ac2-a701-fe50f2836f3b
context-at-handoff: 172k (red)
---

# Handoff: Advanced Thai theme 2 — International Convention Specialist

## Goal
Add a second theme to the owner-only Advanced Thai course from the owner's source `C:\Users\User\Downloads\ผู้เชี่ยวชาญด้านการจัดประชุมนานาชาติ-international-convention-specialist.md`, with grammar cards that do NOT repeat nak-kosana's 12 taught rules. **The build is COMPLETE and SHIPPED** (prod DB + Blob audio + main commit `67a66ab`, pushed 2026-07-17). Only residual QA remains.

## Completed (this session)
- Theme `phu-chiao-chan-prachum` seeded to prod: 175 cards (40 vocab / 13 grammar / 122 phrases) — verified via seeder output + SQL (`at_cards` counts 40/13/122; audio 40/0/122; both themes in `at_themes`).
- Audio: 162 clips, Google `th-TH-Neural2-C`, Blob `audio/advanced-thai/`; `audio_url` on all vocab+phrase cards — verified (script output + SQL).
- `C:\Users\User\Software Projects\Language-Learning-App\scripts\generate-advanced-thai-deck.ts`: (a) cross-theme grammar exclusion — other themes' frames injected into the grammar prompt + `markerSignature` post-check (exact Thai-marker match only, owner's rule); (b) output JSON now persisted after every phrase batch and after vocab (resume previously lost mid-phrase crashes — bit us on run 1). Verified: lint 0, build 0, real run 0.
- New content file committed: `seed/advanced-thai/themes/phu-chiao-chan-prachum.generated.json`.
- Grammar dedupe verified independently: 0 marker clashes (13 new vs 12 taught frames).
- `.env.local` (main checkout): `VERCEL_OIDC_TOKEN` + `BLOB_READ_WRITE_TOKEN` refreshed 2026-07-17 (~02:00 UTC); OIDC expires ~12h.
- Implementation summary written: `.claude/plans/implementation-summary.md` (committed).
- Memory saved: `advanced-thai-theme-2-convention.md`.

## Remaining tasks
- Owner QA click-through on prod (cannot be automated — Google OAuth): thepolyglot.vercel.app → /advanced-thai shows both themes (nak-kosana first); new theme study flow serves vocab→grammar→phrases; audio plays; grammar cards render slots.
- Confirm the Vercel deploy of `67a66ab` succeeded (content is DB-side; deploy carries only the script change, so low risk).

## Next steps (start here)
1. Ask the owner whether prod QA passed. If yes: nothing else to do — optionally update memory `advanced-thai-theme-2-convention.md` with "owner QA passed".
2. If owner wants the two basic grammar cards removed (`เป็น + N`, `อาจจะเป็น + N` — kept deliberately at the seed gate): delete them from `seed/advanced-thai/themes/phu-chiao-chan-prachum.generated.json`, run `npx tsx scripts/seed-advanced-thai-db.ts --theme phu-chiao-chan-prachum --dry` to see the 2 orphans, then re-run with `--prune` (they have no FSRS history yet if done soon), commit the JSON edit.

## Key decisions + rationale
- Exact-marker dedupe only (owner's pick) — near-synonym markers (รวมทั้ง vs taught รวมถึง) are allowed as new cards; rejected synonym-level dedupe.
- Seed direct to prod (owner's pick) — additive assertion-guarded upsert, same flow as nak-kosana; rejected Neon-branch-first.
- Slug `phu-chiao-chan-prachum` (owner's pick) — sorts after `nak-kosana` by id, so both themes at `deck_order=0` still list correctly. A FUTURE theme whose slug sorts before "nak-" needs an explicit `at_themes.deck_order`.
- 13 grammar patterns kept though prompt cap was 12 — cap is a prompt hint, not a schema bound.

## Dead ends — do not retry
- Extractor run 1 crashed mid-phrases and lost all 8 completed batches (~$0.15–0.20): the old code wrote JSON only at end-of-run. FIXED (per-batch persist) — do not revert.
- `vercel env pull` output is NOT a full `.env.local` replacement: it lacks local-only secrets (AUTH_*, OPENAI_API_KEY, GOOGLE_TTS_API_KEY, ALLOWED_EMAILS). Only swap the two token lines.

## Verification evidence
- `npx tsx scripts/seed-advanced-thai-db.ts --theme phu-chiao-chan-prachum` → exit 0; `✓ Seeded. at_cards now holds 175 card(s)`.
- `npx tsx scripts/generate-advanced-thai-audio.ts --theme phu-chiao-chan-prachum` → exit 0; `Done. 162 clips (150 generated, 12 reused). at_cards.audio_url updated for 162 card(s).`
- `npm run lint` → exit 0 (clean); `npm run build` → exit 0 (routes incl. `/advanced-thai/[theme]`).
- `git push origin main` → `2333244..67a66ab main -> main`.

## Read before starting
- `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\implementation-summary.md`
- `C:\Users\User\Software Projects\Language-Learning-App\seed\advanced-thai\themes\phu-chiao-chan-prachum.generated.json` (only if editing grammar cards)
