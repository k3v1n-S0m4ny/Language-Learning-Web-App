---
name: probe-table-completeness
description: When a spec requires verifying third-party scheduling states, check all enumerated states (including edge/relearning states), not just the happy-path ones
metadata:
  type: feedback
---

When a Validation Contract says "MUST verify" third-party behavior across states, check that the embedded probe table covers **all** states the library can produce, not just the primary ones.

For ts-fsrs specifically, there are four card states: `New`, `Learning`, `Review`, `Relearning`. A probe table that only covers New/Learning/Review is missing one full row-set. The omission is low-risk if the missing state follows the same pattern (Relearning intraday steps also stay intraday) but it means the "MUST verify" contract is not fully satisfied.

**Why:** Found in M7 review — the A5 probe table had 12 rows covering 3 states × 4 ratings but omitted the 4 Relearning rows. Live re-probe during review confirmed the logic was correct, but the documentation gap meant the spec's explicit verification requirement was only partially met.

**How to apply:** When reviewing a probe table against a spec that says "MUST verify," enumerate all states the third-party library supports and check for coverage. Flag incompleteness as LOW if the logic conclusion still holds, MEDIUM if the missing state could plausibly change the conclusion.
