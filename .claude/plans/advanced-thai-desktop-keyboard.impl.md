# Advanced Thai — desktop theatre layout + keyboard answering

Implementation summary. Plan: `~/.claude/plans/2-things-for-the-agile-swan.md`.
Design chosen by the owner from a three-way HTML bake-off
(`.artifacts/desktop-card-bakeoff/index.html`, gitignored): **C — Theatre + rails**.

## Completed

**Desktop layout (Advanced Thai only, `lg:` / 1024px — the first non-`sm:` breakpoint in the codebase).**
Hero prompt centred, four answers in one horizontal bar beneath, session context in
edge rails. Below `lg:` every surface is byte-for-byte the mobile card that shipped before.

- `components/ladder/mc-question.tsx` — new `layout?: "stack" | "theatre"` (default `"stack"`)
  and `showKeys?: boolean` (default `false`). `"theatre"` returns the prompt card and the
  option grid as a **Fragment** rather than wrapping them, so the caller's grid places them
  directly; a fragment creates no DOM node, which is why this is a flag here instead of a
  wrapper component. Options gain their index for the key caps.
- `components/advanced-thai/advanced-review-session.tsx` — owns the theatre grid
  (`lg:grid-cols-[9.5rem_minmax(0,1fr)_9.5rem]`, card on row 1, answers row 2, Continue row 3),
  renders both rails, hosts every key binding.
- `components/advanced-thai/stage-rail.tsx` — NEW. `StageRail` / `RailStat` / `RailRule` /
  `KeyLegend`. All `hidden lg:flex`, so this file renders nothing on a phone. Not glass —
  rails sit beside script, and glass never goes behind a reading surface.
- `components/advanced-thai/vocab-lexeme-slab.tsx`, `phrase-slab.tsx` — flip box turns
  landscape from `lg:` (`lg:aspect-[1/0.5]` / `lg:aspect-[1/0.55]`). A fixed portrait ratio only
  gets taller as it gets wider; on a 46rem stage it would have stood 800px tall.
- Both screens supply the left rail's contents (the counts are theirs to know) and hide their
  inline count line at `lg:` so the two never show at once.

**Keyboard (full set).**

| Key | Action | Enabled when |
|---|---|---|
| `1`–`4` | pick that option | MC step, `!answered && !pending` |
| `space` / `enter` | reveal | flip step, `!revealed && !answered` |
| `1` / `2` | Missed it / Got it | flip step, `revealed && !answered && !pending` |
| `enter` | Continue after a miss | `held !== null` |

- `lib/ux/keyboard.ts` — NEW. `useAnswerKeys` / `useActionKeys` over one shared listener.
  Bails on `event.repeat`, on Ctrl/Meta/Alt, and on input/textarea/select/contenteditable
  targets. `preventDefault` only when a binding actually consumed the key.
- Key caps via `components/ui/kbd.tsx` (NEW), `hidden … sm:inline-flex` — the house
  desktop-only pattern. The **listener** stays active at every width, so an iPad with a
  keyboard works; it just is not advertised.
- The right rail's legend tracks the current step, so it never advertises an unbound key.

**Mandarin is untouched.** `mc-question.tsx` and `flashcard.tsx` are shared with
`components/review-session.tsx`, so both new behaviours are opt-in and default off.
Verified in the browser at 1440px — see below.

## Issue discovered and fixed (not in the original plan)

**Double-submit race, newly reachable via the keyboard.** `choose()` and `selfGrade()`
guarded with `if (answered) return;`, which reads React state from the current render's
closure. Two events dispatched in the same frame both read `false` and both reach the
server. With a pointer this was close enough to impossible to ignore — you cannot click two
option buttons at once — but pressing `1` and `2` inside one frame is something a keyboard
does by accident.

Fixed with a `committedFor` ref checked and set synchronously, holding the card **object**
(the `autoplayedFor` pattern already in `review-session.tsx`): a re-serve is always a new
object, so it stops matching on its own and needs no reset — which matters, because the
reset would otherwise have to happen during render, where refs must not be touched.

Measured, not assumed: firing `1` and `2` in the same frame produces **exactly one**
grading request (fetch counted in-page).

## Commands run

```
npx tsc --noEmit          → exit 0, no output
npm run lint  (eslint)    → exit 0, no output
npm run build             → ✓ Compiled successfully; TypeScript ✓; 7/7 static pages
```

## Browser verification (localhost:3000, signed in as owner)

Interactive testing was done in **practice mode**, which runs the identical component but
records nothing — `.env.local` DATABASE_URL is the production DB, so a round would have
written real ladder state. The multiple-choice layout was verified on a round page by
**viewing only**; no answer was committed there.

| Check | Result |
|---|---|
| Theatre layout, MC step @1440 | stage `152px 720px 152px`, options `4 × 171px`, rails `flex`, caps `1-4` |
| Theatre layout, flip step @1440 | landscape card, legend switches reveal → missed/got on reveal |
| `space` reveals | ✓ |
| `1` / `2` self-grade | ✓, card advances |
| `1`+`2` same frame | **1** grading request (latch holds) |
| Mandarin @1440 | option `display:block`, bare text label, wrapper `flex w-full max-w-md … gap-5 animate-slide-up-fade`, 2-col `218px 218px`, 0 rails, 0 caps — unchanged |
| Advanced Thai @390 | rails `none`, caps `none`, options `173px 173px`, inline count line back, **no horizontal overflow** |
| Dark + light | both read correctly |
| Focus order | 0 focusable elements inside the rails; flip container still not a tab stop; hidden face still `inert` |

Reduced motion was **not** re-tested: the ratio class sits on `FlipCard`'s outer container
(`kit.tsx`), outside the `reduceMotion` branch, so the instant-swap fallback is untouched by
this change.

## Left undone / notes

- **Practice pool serves no MC steps today** — every seen vocab card is at a flip rung — so
  the MC key path (`1`–`4` → commit) was exercised in the bake-off and by reading, not
  against a live practice card. The flip path's `1`/`2` commit was exercised live.
- The produce-step front face is sparse on a landscape card (one line of English in a wide
  box). Inherent to the chosen design and visible in the bake-off; left as-is.
- Scope was Advanced Thai only. Read-Thai drills and the Consonant Exam keep the mobile-width
  layout and stay pointer-only; `useAnswerKeys` already takes a `count` so their 3–5 option
  grids would work if extended later.
- Nothing committed; nothing deployed.
