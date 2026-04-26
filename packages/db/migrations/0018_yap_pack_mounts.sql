-- Migration 0018: YAP pack mounts
-- Adds data-driven extension pack mounts for YAP assemblies.

CREATE TABLE IF NOT EXISTS "yy_yap_pack_mounts" (
  "id" text PRIMARY KEY,
  "yap_id" text NOT NULL REFERENCES "yy_yaps"("id") ON DELETE CASCADE,
  "skill_pack_id" text NOT NULL REFERENCES "yy_skill_packs"("id") ON DELETE CASCADE,
  "mount_key" text NOT NULL,
  "mount_point" text DEFAULT 'extensions' NOT NULL,
  "display_name" text NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "required" boolean DEFAULT false NOT NULL,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "constraints" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_yap_mount_key" ON "yy_yap_pack_mounts" USING btree ("yap_id", "mount_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_yap_pack_mounts_yap" ON "yy_yap_pack_mounts" USING btree ("yap_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_yap_pack_mounts_pack" ON "yy_yap_pack_mounts" USING btree ("skill_pack_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_yap_pack_mounts_enabled" ON "yy_yap_pack_mounts" USING btree ("enabled");--> statement-breakpoint
