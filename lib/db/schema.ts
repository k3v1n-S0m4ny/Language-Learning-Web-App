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
  (t) => [index("review_logs_learner_idx").on(t.learnerId)],
);

export const learnerSettings = pgTable("learner_settings", {
  learnerId: text("learner_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  newCardsPerDay: integer("new_cards_per_day").notNull().default(10),
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
