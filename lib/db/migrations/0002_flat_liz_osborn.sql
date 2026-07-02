CREATE TABLE "thai_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" text NOT NULL,
	"item_id" text NOT NULL,
	"drill_type" text NOT NULL,
	"expected" text NOT NULL,
	"chosen" text NOT NULL,
	"correct" boolean NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thai_items" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"unit" integer NOT NULL,
	"display" text NOT NULL,
	"initial_ipa" text,
	"final_ipa" text,
	"consonant_class" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"audio_url" text,
	"drillable" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thai_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" text NOT NULL,
	"item_id" text NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_seen" timestamp with time zone,
	"mastered_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "learner_settings" ADD COLUMN "active_mode" text DEFAULT 'mandarin' NOT NULL;--> statement-breakpoint
ALTER TABLE "thai_attempts" ADD CONSTRAINT "thai_attempts_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thai_attempts" ADD CONSTRAINT "thai_attempts_item_id_thai_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."thai_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thai_progress" ADD CONSTRAINT "thai_progress_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thai_progress" ADD CONSTRAINT "thai_progress_item_id_thai_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."thai_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "thai_attempts_learner_idx" ON "thai_attempts" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "thai_attempts_learner_item_idx" ON "thai_attempts" USING btree ("learner_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "thai_progress_learner_item_uq" ON "thai_progress" USING btree ("learner_id","item_id");--> statement-breakpoint
CREATE INDEX "thai_progress_learner_idx" ON "thai_progress" USING btree ("learner_id");