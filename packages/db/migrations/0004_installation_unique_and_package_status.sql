-- Migration 0004: Installation uniqueness constraint + Package status field
-- Prevents concurrent double-installs at DB level and enables soft-delete

-- 1. Add unique constraint on (user_id, package_id) for active installations
--    Prevents race-condition double installs that application-layer check can miss
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_user_installation"
  ON "yy_skill_package_installations" USING btree ("user_id", "package_id")
  WHERE status != 'uninstalled';
--> statement-breakpoint

-- 2. Add status column to skill_packages for soft-delete / content moderation
--    active: published and discoverable
--    archived: owner-initiated unpublish (still accessible via direct link)
--    banned: admin-initiated ban (not accessible, not searchable)
ALTER TABLE "yy_skill_packages" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
--> statement-breakpoint

-- 3. Index on status for fast active-package filtering in search
CREATE INDEX IF NOT EXISTS "idx_skill_packages_status" ON "yy_skill_packages" USING btree ("status");
