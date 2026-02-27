-- Migration 0005: Content reports table for admin moderation

CREATE TABLE IF NOT EXISTS "yy_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "reporter_id" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text NOT NULL,
  "reason" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'pending',
  "admin_note" text,
  "resolved_by" text,
  "resolved_at" bigint,
  "created_at" bigint NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_yy_reports_status" ON "yy_reports" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_reports_reporter" ON "yy_reports" USING btree ("reporter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_reports_target" ON "yy_reports" USING btree ("target_id");
