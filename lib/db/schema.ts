import {
  pgTable,
  text,
  integer,
  boolean,
  real,
  jsonb,
  uuid,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// --- Auth.js (NextAuth) adapter tables -------------------------------------
// A Learner is a row in `user`. Sign-in is restricted to an email allowlist.

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// --- Domain: shared Card Library -------------------------------------------

export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  headword: text("headword").notNull(),
  isPhrase: boolean("is_phrase").notNull().default(false),
  wholeGloss: text("whole_gloss").notNull(),
  wholePinyin: text("whole_pinyin").notNull(),
  wholeAudioUrl: text("whole_audio_url"),
  // Preserves CSV row order so new cards surface in deck-file sequence (M9/A5).
  deckOrder: integer("deck_order").notNull().default(0),
  // HSK 3.0 band (2021 standard), derived from the official wordlist in
  // seed/mandarin/hsk30-wordlist.json: the band of the hardest Word on the Card,
  // raised when the grammar outruns the vocabulary. 1-6 are as published; 7 means
  // the merged "HSK 7-9" advanced band, which HSK itself does not subdivide — so
  // 8 and 9 are never stored. Nullable: a Card may have no confident level.
  hskLevel: integer("hsk_level"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One row per Word. Single-Word cards have exactly one row; Phrases have many,
// ordered by `position`.
export const words = pgTable(
  "words",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    hanzi: text("hanzi").notNull(),
    gloss: text("gloss").notNull(),
    pinyin: text("pinyin").notNull(),
    audioUrl: text("audio_url"),
  },
  (t) => [uniqueIndex("words_card_position_uq").on(t.cardId, t.position)],
);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
});

export const cardTags = pgTable(
  "card_tags",
  {
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.tagId] })],
);

// --- Domain: per-Learner Review State (FSRS) -------------------------------
// `fsrsCard` holds the full ts-fsrs Card object (robust to library field
// changes); `due` mirrors fsrsCard.due as an indexed column for the
// "what's due for this Learner" query.

export const reviewStates = pgTable(
  "review_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    due: timestamp("due", { withTimezone: true }).notNull(),
    fsrsCard: jsonb("fsrs_card").notNull(),
    lastReview: timestamp("last_review", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("review_states_learner_card_uq").on(t.learnerId, t.cardId),
    index("review_states_learner_due_idx").on(t.learnerId, t.due),
  ],
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    log: jsonb("log").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("review_logs_learner_idx").on(t.learnerId),
    // The HSK gate resolves mastery by scanning this Learner's logs on every study
    // render (lib/review/queries.ts::fetchGateRows). review_logs is append-only and
    // grows by one row per rating forever, so without this the gate would get
    // steadily slower for the Learners who use the app most.
    index("review_logs_learner_card_idx").on(t.learnerId, t.cardId),
  ],
);

export const learnerSettings = pgTable("learner_settings", {
  learnerId: text("learner_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  newCardsPerDay: integer("new_cards_per_day").notNull().default(10),
  // A today-only top-up on top of newCardsPerDay, requested from the Advanced
  // Thai "all caught up" screen. `bonusNewCardsDate` stamps the Thailand day the
  // bonus belongs to (thaiDateKey, "YYYY-MM-DD"); the read layer honors the bonus
  // only when that stamp equals today, so it expires overnight with no cleanup.
  // Deliberately read only by the Advanced Thai queries — a top-up taken there
  // must not inflate the Mandarin/Read-Thai new-card intake.
  bonusNewCards: integer("bonus_new_cards").notNull().default(0),
  bonusNewCardsDate: text("bonus_new_cards_date"),
  // Vestigial — the scheduler now uses the global REQUEST_RETENTION constant
  // (lib/review/config.ts). This column is kept to avoid a destructive DROP.
  requestRetention: real("request_retention").notNull().default(0.85),
  // Which course a Learner currently sees on the home screen (M11/A3).
  // 'mandarin' is the existing FSRS flashcard flow; 'thai' is the Read-Thai
  // unit map. Default 'mandarin' so existing/new learners see no change.
  activeMode: text("active_mode").notNull().default("mandarin"),
});

// --- Domain: Read Thai course (M11) -----------------------------------------
// Thai content lives in its own tables so the Mandarin cards/words/review_states
// pipeline is completely untouched. Content itself is seeded from the typed
// module in seed/thai/ (single source of truth, shared by lessons and drills);
// these tables mirror it plus per-Learner progress/attempts.

// One row per teachable unit-1..8 item: a consonant letter, a final sound
// bucket, a vowel form, or a curated real-word drill example. `kind` is
// intentionally a plain text column (no pg enum) so it can grow with future
// milestones — see note in the M11 handoff about the extra 'final' kind not
// in the original Validation Contract's enum list.
export const thaiItems = pgTable("thai_items", {
  id: text("id").primaryKey(), // stable slug, e.g. "consonant:ก", "final:k"
  kind: text("kind").notNull(), // consonant|vowel|final|tone-rule|numeral|special-sign|syllable|phrase
  unit: integer("unit").notNull(),
  display: text("display").notNull(),
  initialIpa: text("initial_ipa"),
  finalIpa: text("final_ipa"),
  consonantClass: text("consonant_class"), // mid|high|low, consonants only
  metadata: jsonb("metadata").notNull().default({}),
  audioUrl: text("audio_url"),
  drillable: boolean("drillable").notNull().default(true),
});

export const thaiProgress = pgTable(
  "thai_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => thaiItems.id, { onDelete: "cascade" }),
    // Per-drill-type streak dimension (M12/A1) — a consonant's letter-sound,
    // letter-class, letter-final, and audio-letter streaks no longer blend
    // into one row. See lib/db/migrations/*_thai_progress_drill_type.sql for
    // the data migration (existing rows assigned their dominant drillType
    // from thai_attempts history).
    drillType: text("drill_type").notNull(),
    streak: integer("streak").notNull().default(0),
    lastSeen: timestamp("last_seen", { withTimezone: true }),
    masteredAt: timestamp("mastered_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("thai_progress_learner_item_drill_uq").on(t.learnerId, t.itemId, t.drillType),
    index("thai_progress_learner_idx").on(t.learnerId),
  ],
);

export const thaiAttempts = pgTable(
  "thai_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => thaiItems.id, { onDelete: "cascade" }),
    drillType: text("drill_type").notNull(),
    expected: text("expected").notNull(),
    chosen: text("chosen").notNull(),
    correct: boolean("correct").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("thai_attempts_learner_idx").on(t.learnerId),
    index("thai_attempts_learner_item_idx").on(t.learnerId, t.itemId),
  ],
);

// Consonant Review Exam (Stage 2, M11 plan): a cumulative "clear the deck"
// checkpoint between unit 5 and unit 6, drilling every consonant learned so
// far (units 2-5) across four modes. `state` is the whole live session
// (seed, ordered queue, clearedCount, first-try stats, slips) — saved after
// EVERY answer so the session survives a reload mid-deck. The unique index
// on (learnerId, examKey, status) guarantees at most one `in_progress` row
// per learner per exam — startOrResumeExam relies on this to find "the"
// active session without an ORDER BY/LIMIT race. `examKey` is a plain text
// column (not a pg enum), same rationale as thaiItems.kind, so future exams
// (finals, vowels, tones) can reuse this same table via a different key
// without a schema migration.
export const thaiExamSessions = pgTable(
  "thai_exam_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    examKey: text("exam_key").notNull(),
    status: text("status").notNull(), // "in_progress" | "completed"
    state: jsonb("state").notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("thai_exam_sessions_learner_key_status_uq").on(
      t.learnerId,
      t.examKey,
      t.status,
    ),
    index("thai_exam_sessions_learner_idx").on(t.learnerId),
  ],
);

// --- Domain: Advanced Thai course (M16) -------------------------------------
// The owner's personal third course: vocabulary, grammar and every phrase of a
// themed Thai occupational text. Its own at_* tables, for two reasons:
//
//   1. The shared Card Library above is Mandarin-shaped in its very column
//      names (`whole_pinyin`, `words.hanzi`) — scripts/refresh-seed-db.ts
//      already warns in writing that it is not split per language.
//   2. A card here is one of THREE different shapes (vocab / grammar / phrase),
//      not one. Modelling that as nullable columns on `cards` would make every
//      Mandarin row carry six always-null Thai columns.
//
// Content shapes live in seed/advanced-thai/types.ts (VocabEntry /
// GrammarPattern / PhraseEntry) — that module is the single source of truth,
// shared by the extractor, the seed assertions and the card components.

export const atThemes = pgTable("at_themes", {
  // Stable slug from the source document, e.g. "nak-kosana".
  id: text("id").primaryKey(),
  titleThai: text("title_thai").notNull(),
  titleEnglish: text("title_english").notNull(),
  summary: text("summary").notNull(),
  deckOrder: integer("deck_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One row per card. `kind` discriminates the `payload` jsonb, which holds the
// matching seed/advanced-thai/types.ts shape verbatim. Plain-text `kind` (no pg
// enum), same rationale as thai_items.kind: a future theme may want a fourth
// card shape without a migration.
//
// `id` IS A CONTENT-DERIVED SLUG, NOT A UUID, AND THAT IS LOAD-BEARING.
// The deck is regenerated by an LLM extractor whose JSON the owner then edits by
// hand, so re-seeding is the normal case, not the exception. With random UUIDs a
// re-seed could only be "delete the theme's rows and re-insert" — and
// at_review_states.card_id cascades ON DELETE, so every FSRS interval built up on
// those cards would be destroyed without a word. Keying on the card's own content
// (see cardIdFor in scripts/seed-advanced-thai-db.ts) makes a re-seed an UPSERT:
// fixing a gloss or a word split leaves the review history attached, and only a
// genuinely different phrase becomes a genuinely different card.
export const atCards = pgTable(
  "at_cards",
  {
    id: text("id").primaryKey(),
    themeId: text("theme_id")
      .notNull()
      .references(() => atThemes.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // vocab | grammar | phrase
    payload: jsonb("payload").notNull(),
    // Preserves the source document's own order, so new cards surface in the
    // sequence the text introduces them — the at_* analogue of cards.deck_order.
    deckOrder: integer("deck_order").notNull().default(0),
    // The whole-phrase (or whole-word) clip. Per-word clips are deliberately NOT
    // generated — owner's call, M16/B4: the word chips teach segmentation
    // visually, and per-word audio would multiply the blob count by ~8 for a
    // benefit the owner did not want.
    audioUrl: text("audio_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("at_cards_theme_order_idx").on(t.themeId, t.deckOrder),
    index("at_cards_kind_idx").on(t.kind),
  ],
);

// Mirror review_states / review_logs — same FSRS contract, same jsonb
// `fsrs_card` — differing only in that card_id points at at_cards (text) instead
// of cards (uuid). The SCHEDULER ITSELF IS NOT FORKED: lib/review/scheduler.ts
// is pure and database-agnostic, and this course calls straight into it.
//
// One index is deliberately NOT carried over. review_logs has a
// (learner_id, card_id) index that exists solely for the HSK gate, which
// re-derives mastery by scanning the log on every study render. Advanced Thai is
// UNGATED by owner's decision (M16/B4) — nothing scans these logs per render — so
// that index would be pure write cost. Add it if a gate is ever introduced.
export const atReviewStates = pgTable(
  "at_review_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => atCards.id, { onDelete: "cascade" }),
    due: timestamp("due", { withTimezone: true }).notNull(),
    fsrsCard: jsonb("fsrs_card").notNull(),
    lastReview: timestamp("last_review", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("at_review_states_learner_card_uq").on(t.learnerId, t.cardId),
    index("at_review_states_learner_due_idx").on(t.learnerId, t.due),
  ],
);

export const atReviewLogs = pgTable(
  "at_review_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => atCards.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    log: jsonb("log").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("at_review_logs_learner_idx").on(t.learnerId)],
);
