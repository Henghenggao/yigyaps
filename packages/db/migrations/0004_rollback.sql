-- Rollback for migration 0004
-- Removes installation uniqueness constraint and package status field

DROP INDEX IF EXISTS "idx_unique_user_installation";
ALTER TABLE "yy_skill_packages" DROP COLUMN IF EXISTS "status";
DROP INDEX IF EXISTS "idx_skill_packages_status";
