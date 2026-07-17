# Implementation summary — Advanced Thai theme 2: phu-chiao-chan-prachum (2026-07-17)

Direct content build (owner's standing preference for single-file/content work — no dev-cycle).
Plan: `~/.claude/plans/for-the-advanced-thai-serene-thunder.md` (approved 2026-07-17).

## Completed work

- **New theme seeded to prod**: `phu-chiao-chan-prachum` — ผู้เชี่ยวชาญด้านการจัดประชุมนานาชาติ (International Convention Specialist). 175 cards: 40 vocab, 13 grammar, 122 phrases. Source: owner-supplied occupational markdown (Downloads, same shape as นักโฆษณา).
- **Cross-theme grammar dedupe** (new, in `scripts/generate-advanced-thai-deck.ts`): other themes' `*.generated.json` grammar frames are loaded, injected into the grammar prompt as an exclusion list, and enforced after generation by a Thai-marker signature check (`markerSignature`: sorted unique Thai-script runs of the frame). Owner's rule: exact-marker duplicates only; near-synonym markers (รวมทั้ง vs รวมถึง) are allowed.
- **Crash-safe resume fix** (same script): output JSON is now written after every phrase batch and after vocab, not only at end-of-run. The documented resume feature previously could not survive a crash during the phrase phase — which is exactly what happened on the first paid run (8 batches lost, ~US$0.15–0.20 wasted).
- **Audio**: 162 clips (150 synthesized, 12 reused), Google `th-TH-Neural2-C`, Vercel Blob `audio/advanced-thai/`; `audio_url` set on all 40 vocab + 122 phrase cards; grammar cards none (by design). Ledger: `.artifacts/advanced-thai-audio/ledger.json`.
- **Stale-token fix**: Blob 403 (known stale `VERCEL_OIDC_TOKEN` issue) — refreshed `VERCEL_OIDC_TOKEN` + `BLOB_READ_WRITE_TOKEN` in `.env.local` (main checkout + worktree) via `vercel env pull` to a temp file; local-only secrets untouched.

## Commands run (exit codes)

- `generate-advanced-thai-deck.ts --dry` → 0 (135 clauses, 14 requests, 12 taught frames excluded)
- `generate-advanced-thai-deck.ts` (run 1) → **1** (mid-run API crash at batch 97–108; nothing persisted → resume fix above)
- `generate-advanced-thai-deck.ts` (run 2) → 0 — 122 phrases / 40 vocab / 13 grammar; 13,306 in / 14,314 out tokens (gpt-5.4)
- Independent dedupe check (node signature script) → 0: **0 marker clashes** (13 new vs 12 taught frames)
- `seed-advanced-thai-db.ts --dry` → 0: all assertions passed, 175 new / 0 updated / 0 orphans / 0 FSRS
- `seed-advanced-thai-db.ts` → 0: "Seeded. at_cards now holds 175 card(s)" (no `--prune`)
- `generate-advanced-thai-audio.ts` (run 1) → 1 (Blob 403, failed pre-spend at list()); (run 2) → 0: 162 clips, 162 audio_url updates
- DB sanity SQL → both themes present (nak-kosana orders first via id tie-break at deck_order 0); counts 40/13/122; audio 40/0/122
- `npm run lint` → 0 (clean); `npm run build` → 0 (all routes incl. /advanced-thai/[theme])

## Spend (approved per gate)

Extractor gpt-5.4: two runs ≈ US$0.30–0.40 total (incl. lost first run). Audio: $0.07 (4,235 chars @ $16/1M). Total ≈ **US$0.40–0.50**.

## Left undone / residual

- UI click-through as the owner (Google OAuth — cannot be automated): verify theme card on /advanced-thai, study flow, audio playback on prod after deploy.
- Two deliberately-kept basic grammar cards (owner's call at seed gate): `เป็น + N`, `อาจจะเป็น + N` — prune later via JSON edit + `--prune` if unwanted.
- Model returned 13 grammar patterns against a prompt cap of 12 (`MAX_GRAMMAR`) — kept; cap is a prompt hint, not a schema bound.

## Spec deviations

None vs the approved plan, beyond the two unplanned fixes above (resume persistence, token refresh), both forced by observed failures.
