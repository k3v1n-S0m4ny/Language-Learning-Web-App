---
source: https://github.com/open-spaced-repetition/ts-fsrs (README)
fetched: 2026-05-21
why_cached: FSRS scheduling implementation for per-Learner Review State
---

# ts-fsrs (cached summary)

TypeScript implementation of FSRS v6 (Free Spaced Repetition Scheduler).
Requires Node.js >= 20.

## Core usage

```ts
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';

const scheduler = fsrs();                       // optionally pass params
const card = createEmptyCard();                 // new card's initial FSRS state

// Preview all four outcomes (for showing "next interval" hints on buttons):
const preview = scheduler.repeat(card, new Date());

// Apply the learner's rating after they answer:
const { card: nextCard, log } = scheduler.next(card, new Date(), Rating.Good);
```

## Ratings (the 4 grade buttons)

`Rating.Again` (forgot) · `Rating.Hard` · `Rating.Good` · `Rating.Easy`.

## What we persist per (Learner, Card) = our Review State

The FSRS `Card` object's scheduling fields, e.g.:
`due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`,
`lapses`, `state`, `last_review`. Store these columns; rehydrate into ts-fsrs on
each review, call `next()`, persist the returned card. Optionally store `ReviewLog`
rows for history/analytics.

## Configurable params

`fsrs({ request_retention, maximum_interval, ... })`. Default request retention is
~0.9 (90% target recall). We'll start with defaults and a per-Learner new-cards/day cap.

## Fit

Each (Learner, Card) pair stores its own FSRS Card state — exactly our "separate
progress, shared cards" model. The query "what's due for Learner X" = rows where
`due <= now` for that learner.
