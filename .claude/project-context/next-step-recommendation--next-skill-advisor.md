# Next-Step Recommendation

## 1. Where you are
NODE 1 — "We have an idea but haven't validated it on paper yet." The project is a clean greenfield (`.git` only); nothing about the idea, customer, or value has been written down, so by artifacts you are at the very start of the delivery sequence — even though you tell me the value is already validated in your head.

## 2. Evidence
- Project-context artifacts found: **none** (`.claude/project-context/` did not exist before this run)
- Filesystem signals: code=**no**, CI=**no**, tests=**no** (repository contains only `.git/`)
- Live work-state:
  - active-plan: **none**
  - kanban: **none**
  - last session activity: **none**
  - legacy `Status:` line detected? **no**
- User's stated pain/goal: "Already know what to build — the value is validated; I want to start defining features/requirements or begin building."
- Pain keywords detected: **none** (artifact classifier applies; not routed to NODE 8)
- Classifier note: artifact classifier row 1 → NODE 1. Your *intent* is NODE 2/3. The honest read is that the validation may be real but is **undocumented** — there is no `discovery-test-results` or `discovery-framing` artifact for the requirements-* and story-mapping-* skills to consume.

## 3. Recommended next
- **PRIMARY:** `pm-discovery-framing` — capture the validated idea as your *first* artifact in one short pass (Startup Canvas mode, since "I Hate My 9-5" reads like a brand-new business/product). This is the cheapest way to turn "I know what to build" into something downstream skills can read.
- **PARALLEL TRACK:** `requirements-foundation` — pin down measurable business objectives, the solution boundary, and the stakeholder list. This is NODE 1.7 and feeds NODE 2 elicitation directly, so it moves you toward your stated goal of defining requirements.
- **PREREQUISITE GAP:** `pm-discovery-testing` — you assert the value is validated but no `discovery-test-results` exists. If validation was rigorous, framing will record it in minutes. If it was really "people said they liked the idea," close the value/demand risk here *before* specifying — this is the single most common false-validation trap.

## 4. Why this order
Rule 1: don't spec until you've validated value — the `pm-*` family gates the `requirements-*` family. Rule 2: don't build until you know what to build. You may genuinely be past Rule 1, but with zero artifacts there is nothing for `requirements-elicit` or `story-mapping-build` to point at; framing the effort first gives every later skill a foundation and takes far less time than the rework caused by skipping it.

## 5. What you should NOT do here
- Don't write detailed user stories or a functional spec yet — there's no captured strategy for them to trace back to.
- Don't pick a tech stack or set up CI now — that's NODE 2 Stream B plumbing, premature against an empty repo.
- Don't draft a long SRS; once framed, slice with story-mapping (NODE 4), don't write a 200-page document.

## 6. Anti-patterns to watch
- **Writing detailed requirements before validating the four risks** — specs an unvalidated idea precisely. Run `pm-discovery-testing` (or confirm it via framing) before `requirements-elicit`.
- **"15 people said they love it" = validated** — people say nice things and don't buy. If that's the basis of your validation, treat value/demand risk as still open.
