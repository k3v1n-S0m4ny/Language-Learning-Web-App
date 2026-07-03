---
name: shared-serialization-eliminates-mismatch
description: When a drill/widget needs client and server to agree on a serialized value (e.g. a boundary-index set), check whether both sides import the SAME exported function rather than each writing their own formatter
metadata:
  type: feedback
---

Confirmed as a genuinely strong pattern in Read-Thai M14's `phrase-split`
widget: `lib/thai/types.ts` exports `serializeBoundaries()`, and BOTH
`components/thai/drill/phrase-split-question.tsx` (client) and
`lib/thai/drill.ts::expectedAnswerFor` (server) import and call that exact
function, rather than each hand-rolling their own "sort + join" logic.

**Why:** the obvious alternative bug class for any "client builds an answer
string, server independently re-derives the expected string, then string-
compares" drill type (mirrors [[client-supplied-correct-answer]]'s general
shape but one level more subtle) is a serialization-format drift — different
separator, different sort order, one side deduping and the other not, etc.
— which would silently mark every submission wrong (or, worse, right for the
wrong reason) without an obvious symptom. A shared, single-source-of-truth
serializer eliminates this bug class *by construction*, not by careful
parallel implementation that has to be kept in sync by discipline alone.

**How to apply:** when reviewing any new drill/exercise type whose "answer"
is a derived/composite value (not a single atomic choice) — sets of indices,
multi-select answers, ordered sequences, etc. — always check whether the
client and server share one imported serialization function. If they each
implement their own formatter independently, treat that as at least a MEDIUM
finding even if the two implementations currently happen to agree, since
future edits to either side can silently desync them. Recommend refactoring
to a shared function (as this codebase's `lib/thai/types.ts` pattern does)
rather than accepting "we checked they match today."
