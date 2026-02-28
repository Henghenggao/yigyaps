-- Migration 0008: Add is_active flag to yy_encrypted_knowledge
-- Enables soft-archive versioning: old versions are preserved for legal evidence
-- and version history instead of being deleted on update (Sprint 7A)

ALTER TABLE "yy_encrypted_knowledge" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_yy_encrypted_knowledge_active"
  ON "yy_encrypted_knowledge" USING btree ("skill_package_id", "is_active");
