-- Migration 0015: Capture & Validation System
-- Adds tables for blind interviewer architecture + knowledge_type routing

-- knowledge_type column on skill_packages for dual-path routing
ALTER TABLE "yy_skill_packages" ADD COLUMN IF NOT EXISTS "knowledge_type" text DEFAULT 'rules' NOT NULL;--> statement-breakpoint

-- Capture sessions table (state machine)
CREATE TABLE IF NOT EXISTS "yy_capture_sessions" (
  "id" text PRIMARY KEY,
  "skill_package_id" text NOT NULL REFERENCES "yy_skill_packages"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "domain_template_id" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "current_round" integer DEFAULT 0 NOT NULL,
  "session_encrypted_dek" text,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL,
  "paused_at" bigint,
  "completed_at" bigint,
  "published_at" bigint
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_yy_capture_sessions_user" ON "yy_capture_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_capture_sessions_package" ON "yy_capture_sessions" USING btree ("skill_package_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_capture_sessions_status" ON "yy_capture_sessions" USING btree ("status");--> statement-breakpoint

-- Skill corpus table (per-QA encrypted entries with knowledge graph)
CREATE TABLE IF NOT EXISTS "yy_skill_corpus" (
  "id" text PRIMARY KEY,
  "skill_package_id" text NOT NULL REFERENCES "yy_skill_packages"("id") ON DELETE CASCADE,
  "session_id" text NOT NULL REFERENCES "yy_capture_sessions"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "encrypted_answer" bytea NOT NULL,
  "tags" text[] DEFAULT '{}' NOT NULL,
  "scenario_type" text NOT NULL,
  "complexity" text DEFAULT 'L1' NOT NULL,
  "source" text NOT NULL,
  "parent_qa_id" text,
  "related_qa_ids" text[],
  "cached_encrypted_dek" text,
  "created_at" bigint NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_yy_skill_corpus_package" ON "yy_skill_corpus" USING btree ("skill_package_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_skill_corpus_session" ON "yy_skill_corpus" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_skill_corpus_tags" ON "yy_skill_corpus" USING btree ("tags");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_skill_corpus_scenario" ON "yy_skill_corpus" USING btree ("scenario_type");--> statement-breakpoint

-- Skill tests table (validation records)
CREATE TABLE IF NOT EXISTS "yy_skill_tests" (
  "id" text PRIMARY KEY,
  "skill_package_id" text NOT NULL REFERENCES "yy_skill_packages"("id") ON DELETE CASCADE,
  "source_qa_id" text NOT NULL REFERENCES "yy_skill_corpus"("id"),
  "variation_type" text NOT NULL,
  "generated_question" text NOT NULL,
  "ai_answer" text NOT NULL,
  "expert_verdict" text NOT NULL,
  "expert_correction" text,
  "correction_qa_id" text,
  "created_at" bigint NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_yy_skill_tests_package" ON "yy_skill_tests" USING btree ("skill_package_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_skill_tests_source" ON "yy_skill_tests" USING btree ("source_qa_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_skill_tests_verdict" ON "yy_skill_tests" USING btree ("expert_verdict");
