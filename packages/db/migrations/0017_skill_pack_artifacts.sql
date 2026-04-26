-- Migration 0017: SkillPack Bridge artifact storage
-- Stores mountable Skill Packs and their generated artifacts under a YAP.

CREATE TABLE IF NOT EXISTS "yy_skill_packs" (
  "id" text PRIMARY KEY,
  "yap_id" text NOT NULL REFERENCES "yy_yaps"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "version" text NOT NULL,
  "display_name" text NOT NULL,
  "description" text NOT NULL,
  "pack_type" text DEFAULT 'extension' NOT NULL,
  "contract_version" text DEFAULT '1.0' NOT NULL,
  "compatibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "manifest" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "source" text DEFAULT 'manual' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL,
  "released_at" bigint NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_skill_pack_version" ON "yy_skill_packs" USING btree ("yap_id", "name", "version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_skill_packs_yap" ON "yy_skill_packs" USING btree ("yap_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_skill_packs_name" ON "yy_skill_packs" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_skill_packs_status" ON "yy_skill_packs" USING btree ("status");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "yy_skill_pack_artifacts" (
  "id" text PRIMARY KEY,
  "skill_pack_id" text NOT NULL REFERENCES "yy_skill_packs"("id") ON DELETE CASCADE,
  "artifact_type" text NOT NULL,
  "artifact_path" text NOT NULL,
  "media_type" text DEFAULT 'application/json' NOT NULL,
  "content" jsonb NOT NULL,
  "content_sha256" text NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_skill_pack_artifact" ON "yy_skill_pack_artifacts" USING btree ("skill_pack_id", "artifact_type", "artifact_path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_skill_pack_artifacts_pack" ON "yy_skill_pack_artifacts" USING btree ("skill_pack_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_skill_pack_artifacts_type" ON "yy_skill_pack_artifacts" USING btree ("artifact_type");--> statement-breakpoint
