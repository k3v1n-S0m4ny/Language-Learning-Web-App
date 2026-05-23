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
});
