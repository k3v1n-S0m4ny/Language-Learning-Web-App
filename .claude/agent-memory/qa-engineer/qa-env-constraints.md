---
name: qa-env-constraints
description: QA environment constraints — OAuth and prod Neon DB are not automatable locally; how to validate query logic without live DB
metadata:
  type: project
---

Full click-through testing requires live Google OAuth (Google SSO) and the prod Neon DB (us-east-1), neither of which is available in the local dev environment. This constraint was accepted explicitly in M6 and carried into M7.

**Why:** The app uses NextAuth with Google OAuth only — no test credentials. The database is a prod-only Neon Postgres instance.

**How to apply:**
- For query/selection logic: drive the real TypeScript/JavaScript logic via `node --input-type=module` probes against the installed npm packages (ts-fsrs, drizzle predicates replicated as plain JS). This is sufficient to verify predicate correctness.
- For UI assertions: verify via code inspection of `app/page.tsx` render paths (card vs EmptyState branching).
- For auth assertions: use curl to observe redirect behavior to `/api/auth/signin`.
- Mark anything that genuinely requires a live authenticated session as "not behaviorally verifiable locally" in the QA report.
- After deployment, a manual prod smoke test is always recommended.

**ts-fsrs probe pattern (M7/M8):**
```
node --input-type=module << 'EOF'
import { fsrs, generatorParameters, createEmptyCard, Rating } from "ts-fsrs";
// ... probe scheduler.repeat() or generatorParameters() directly
EOF
```
This pattern works in M7 and M8. In M7 the explicit `./node_modules/ts-fsrs/dist/index.mjs` path was used; in M8 bare `"ts-fsrs"` also resolved successfully (Node ESM resolves via package.json exports). Either form works.

**Watch out for:** When probing ts-fsrs Review+Again intraday eligibility, always compare the resulting `due` against the `dayEnd` of the **session day** (the card's due date), not against today's `dayEnd`. Getting this wrong produces a false `intraday:false` result.

**M8: Audio auto-play validation approach:** Because `HTMLAudioElement.play()` is a browser-only API, A1's "auto-plays exactly once" claim cannot be exercised in Node. Use static analysis instead: grep for `useEffect` in `components/` (must be zero matches), confirm `playAudio` is called only inside the user-gesture click handler (not in any effect or on-mount path), and verify `CardFront` is unmounted after first reveal (preventing double-play). This approach was accepted as sufficient — code path is simple enough that code inspection + static analysis is high-confidence.

**M8: FSRS retention parameter reach:** To confirm `REQUEST_RETENTION` flows into ts-fsrs, compare `generatorParameters({ request_retention: 0.85 }).request_retention` vs `0.9`. For a new card the only rating that shows a difference is Easy; for cards with review history all non-Again ratings differ materially.

**Seed refresh QA (post-M8):** For DB assertions against the Neon prod DB, write a small `npx tsx scripts/qa-db-probe.ts` file that imports `neon` + drizzle + schema (mirrors `scripts/seed-db.ts` connection pattern), run it, then delete it. This approach worked cleanly for the seed-data refresh QA — all 8 DB sub-checks ran in one shot (card count, headword presence/absence, tag existence, card_tags join counts, orphan words, orphan review_states). The DB is live and reachable without extra setup when `DATABASE_URL` is in `.env.local`.

**M9: Compiled CSS inspection pattern:** Tailwind v4 (Turbopack dev) outputs a single CSS chunk in `.next/static/chunks/*.css`. Use `readdirSync('.next/static/chunks').filter(f => f.endsWith('.css'))` to find it. After `npm run build`, the chunk is reliably present and can be inspected for: (a) palette hex values, (b) `prefers-reduced-motion` gate, (c) `@keyframes` names and positions, (d) absence of old/banned hex values. To verify keyframes are INSIDE the media query: record char-offset positions of all `@keyframes` and the media query open/close braces using a brace-depth walk — much more reliable than regex.

**M9: Comment-only `@keyframes` false positives:** When searching for `@keyframes` in CSS source with regex, be aware that CSS comments (like `/* @keyframes blocks are gated */`) can produce false positives. Use brace-depth position tracking rather than simple string count to distinguish actual keyframe definitions from comment references.

**M9: FSRS 3-tier queue validation pattern:** To verify "Again does not immediately repeat" without a live auth session, (1) probe ts-fsrs to get the failed card's `due` (+1 min), (2) run the 3 tier queries against the real DB as plain SQL via `neon` directly, (3) confirm the failed card's `due` falls in Tier 3 not Tier 1. Also simulate the single-card scenario by checking if `failedCard.due > now AND failedCard.due <= dayEnd` — this confirms the no-dead-end guarantee analytically.

**M10: `npx tsx -e "..."` is unreliable on this Windows/Git-Bash setup for async output.** A `.then()` callback's `console.log` can silently fail to flush before process exit even though the command reports exit 0 with no error — this bit both the implementer and reviewer in M10 (implementer's pasted `-e` output looked fine; reviewer re-ran the identical command and got zero output). Always write a real scratch file (`.mts`/`.mjs`) in the OS temp scratch dir and run it with `npx tsx <file>` instead of `-e`. To import a project TS module (e.g. `seed/languages.ts`) from a scratch file living outside the repo, use an absolute `file://` URL import (`import { x } from "file:///C:/full/path/to/module.ts"`) — bare relative imports won't resolve across drive/dir boundaries. Delete the scratch file after use.

**M10: Comparing a moved/renamed file's content against its pre-move `HEAD` version.** Use `git show HEAD:<old-path>` piped to a temp file, then `JSON.stringify(head) === JSON.stringify(current)` (or a byte diff) in a real scratch script — do not rely on `git diff` alone for the renamed pair if you want an independent second check; `git diff -- <new-path>` against a rename with no content change correctly shows empty output, but doing an explicit deep-equal against the pre-move blob is a stronger, no-git-magic proof for a "pure rename, zero drift" claim.

**M10: Killing a background `npm run dev` cleanly on Windows from Git-Bash.** `pkill`/process-group signals from Bash don't reliably map to the Node process spawned via `(cmd &)`. Instead: `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess -Unique"` to get the PID, then `Stop-Process -Id <pid> -Force`. Confirm shutdown by re-running `Get-NetTCPConnection -LocalPort 3000` (exit 1 / empty = port free) and `Get-Process -Id <pid>` (empty = process gone). Also note: PowerShell one-liners piped through Bash's `-Command "...| Where-Object { $_.X }"` get `$_` mangled by Bash variable interpolation — avoid `$_` in inline PowerShell called from the Bash tool; use `Select-Object` alone instead.

**M12: Driving real Next.js Server Actions from a standalone script needs BOTH `tsx/cjs` and `tsx/esm`, plus dynamic imports after `dotenv.config()`.** The M11-documented recipe (`node --import tsx/esm --require <auth-stub>.cjs <script>.mts`) is NOT sufficient once the target module (e.g. `lib/thai/actions.ts`) transitively imports `@/lib/db` — because this repo's `.ts` files are CJS by default (no `"type": "module"` in `package.json`), so they load via Node's CJS-interop translator, which needs `tsx/cjs`'s own alias-resolution patch too (`--require tsx/cjs --require <auth-stub>.cjs --import tsx/esm`). Separately, ANY `@/lib/*` import in the driver script must be a dynamic `await import(...)` issued AFTER `dotenv.config({path:".env.local"})` runs — a static top-level `import` of a `@/lib/*` module gets hoisted-evaluated before the importing file's own `config()` call regardless of source-line order, throwing "No database connection string was provided" even though `config()` textually appears first. `scripts/seed-thai-db.ts` in this repo sidesteps the whole problem by constructing its own `neon()` client directly and never importing `@/lib/db`.

**M12: Auth-stub monkeypatch pattern for one-off scripts.** `Module._resolveFilename` patched via a `.cjs` file passed to `--require`, redirecting the bare specifier `@/auth` to an in-memory stub (`module.exports = { auth: async () => ({ user: { id: process.env.QA_LEARNER_ID } }) }`). Works for both driving mutating Server Actions (e.g. `submitThaiAttempt`, `markUnit1LessonRead`) for fast-forward/rejection tests AND combining with genuine Playwright/HTTP sessions for rendering checks — never use the stub to fabricate what gets rendered, only to drive state mutations, and always disclose it explicitly in the QA report.

**M12: Playwright browser automation against a Next.js app using Auth.js database sessions.** Insert a real `session` row directly (`INSERT INTO session ("sessionToken", "userId", expires) VALUES (...)` — note the column is literally `"sessionToken"`/`"userId"`, camelCase, quoted, not snake_case), then `context.add_cookies([{"name": "authjs.session-token", "value": <token>, "domain": "localhost", "path": "/", "httpOnly": True}])` in Playwright. This renders exactly what a signed-in browser would see, no OAuth needed. For MC-quiz-style UIs where the correct answer is embedded in server-rendered props (revealed only after answering): read the correct-answer values directly from the DB beforehand (same values `expectedAnswerFor` would compute) rather than guessing, and for audio-prompted questions with no visible identifying text, capture the network request fired by the "play" button via `page.on("request")` to learn which audio URL (and therefore which item) was asked about. Always `next_btn.wait_for(state="visible", timeout=8000)` after each click rather than a fixed `wait_for_timeout` — the server action is a real Neon round-trip and a short fixed sleep causes the loop to silently skip past unrendered reveals.
