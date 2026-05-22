# CONTEXT — Ubiquitous Language

> Glossary for the Chinese spaced-repetition flashcard app ("I Hate My 9-5").
> This file is a glossary only — no implementation details, no specs, no decisions.
> Each term has a single agreed meaning we use everywhere: code, UI, conversation.

## Terms

### Learner
One of the two people using the app (you and your girlfriend). Each Learner has
their own login and their own Review State. Learners do **not** see each other's
schedules.

### Card Library
The single shared pool of Cards both Learners study from. There is exactly one
Library, and it is the same for both Learners. Cards are authored by the developers
during development and seeded into the database — there is no in-app card creation.
Learners only review existing Cards.

### Card
One learnable item in the Library. The front shows only the Chinese (the Card's
Headword). The back reveals everything else. A Card is either a single Word or a
multi-word Phrase.

### Headword
The Chinese text shown on the front of a Card — the thing being tested. Could be one
Word (e.g. 茶) or a whole Phrase (e.g. 我喜欢喝茶).

### Phrase
A Card whose Headword contains more than one Word. A Phrase is broken into its Words
for study (the "word-by-word" view), and also has its own whole-Phrase gloss and audio.

### Word
The unit of breakdown inside a Card. The smallest meaningful chunk we translate and
voice (我 / 喜欢 / 喝 / 茶). We break down to Words, not individual characters. Each
Word carries its own Gloss, Pinyin, and Audio Clip.

### Gloss
The English meaning of a Word or of a whole Phrase. A Phrase Card therefore has many
Word Glosses plus one whole-Phrase Gloss.

### Pinyin
The romanized pronunciation with tone marks for a Word or whole Phrase. Hidden on the
back of the Card until the Learner chooses to reveal it.

### Audio Clip
A spoken pronunciation, generated once and stored. Exists per Word and for the whole
Phrase, so a Learner can hear it word-by-word or all at once.

### Tag
A free-form label attached to a Card (e.g. "food", "travel", "HSK1"). A Card may have
many Tags or none. Tags are shared (they live on the Card, not per-Learner) and are
used to filter what a Learner studies. There are no named decks; Tags are the only
grouping.

### Review State
A Learner's private spaced-repetition progress for a single Card: when it is next
due, how well they know it, and their review history. Each (Learner, Card) pair has
its own Review State, so a Card you have mastered can still be due for her.
