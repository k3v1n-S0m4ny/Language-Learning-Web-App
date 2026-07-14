CREATE TABLE "at_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"theme_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"deck_order" integer DEFAULT 0 NOT NULL,
	"audio_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "at_review_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" text NOT NULL,
	"card_id" text NOT NULL,
	"rating" integer NOT NULL,
	"log" jsonb NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "at_review_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" text NOT NULL,
	"card_id" text NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"fsrs_card" jsonb NOT NULL,
	"last_review" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "at_themes" (
	"id" text PRIMARY KEY NOT NULL,
	"title_thai" text NOT NULL,
	"title_english" text NOT NULL,
	"summary" text NOT NULL,
	"deck_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "at_cards" ADD CONSTRAINT "at_cards_theme_id_at_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."at_themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "at_review_logs" ADD CONSTRAINT "at_review_logs_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "at_review_logs" ADD CONSTRAINT "at_review_logs_card_id_at_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."at_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "at_review_states" ADD CONSTRAINT "at_review_states_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "at_review_states" ADD CONSTRAINT "at_review_states_card_id_at_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."at_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "at_cards_theme_order_idx" ON "at_cards" USING btree ("theme_id","deck_order");--> statement-breakpoint
CREATE INDEX "at_cards_kind_idx" ON "at_cards" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "at_review_logs_learner_idx" ON "at_review_logs" USING btree ("learner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "at_review_states_learner_card_uq" ON "at_review_states" USING btree ("learner_id","card_id");--> statement-breakpoint
CREATE INDEX "at_review_states_learner_due_idx" ON "at_review_states" USING btree ("learner_id","due");