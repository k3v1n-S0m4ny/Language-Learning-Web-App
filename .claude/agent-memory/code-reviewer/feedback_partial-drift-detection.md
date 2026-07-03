---
name: partial-drift-detection
description: Re-sync scripts often check only top-level/parent fields for drift and silently miss child/nested field changes
metadata:
  type: feedback
---

In maintenance scripts that compare DB state to a source-of-truth file and re-sync on difference, implementers commonly check only the parent-row fields (e.g. card.wholeGloss, card.wholePinyin) and omit child-row fields (e.g. words[].gloss, words[].audioUrl). The script then rewrites child rows only when a parent field changes, leaving child drift silently undetected.

**Why:** Seen in refresh-seed-db.ts (2026-05-23 seed refresh): drift detection checked 4 card-level fields but not the words table. The script's own comment said "re-syncs any retained card whose generated content drifted" — broader than the actual behavior.

**How to apply:** When reviewing a re-sync/reconciliation script, enumerate all tables that are rewritten and verify each one has a corresponding drift predicate. If child rows are rewritten unconditionally when parent drift is detected, confirm that all meaningful child-level changes also surface as parent-level changes (if they do not, the gap should be documented or the drift check extended).
