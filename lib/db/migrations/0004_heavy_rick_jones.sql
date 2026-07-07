CREATE TABLE "thai_exam_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" text NOT NULL,
	"exam_key" text NOT NULL,
	"status" text NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "thai_exam_sessions" ADD CONSTRAINT "thai_exam_sessions_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "thai_exam_sessions_learner_key_status_uq" ON "thai_exam_sessions" USING btree ("learner_id","exam_key","status");--> statement-breakpoint
CREATE INDEX "thai_exam_sessions_learner_idx" ON "thai_exam_sessions" USING btree ("learner_id");