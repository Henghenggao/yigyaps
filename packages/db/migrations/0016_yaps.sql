-- Migration 0016: YAP first-class model
-- Adds top-level YAP containers, distinct from legacy single skill packages.

CREATE TABLE IF NOT EXISTS "yy_yaps" (
  "id" text PRIMARY KEY,
  "slug" text NOT NULL,
  "version" text DEFAULT '0.1.0' NOT NULL,
  "display_name" text NOT NULL,
  "description" text NOT NULL,
  "readme" text,
  "owner_id" text NOT NULL,
  "owner_name" text NOT NULL,
  "category" text DEFAULT 'other' NOT NULL,
  "tags" text[] DEFAULT '{}' NOT NULL,
  "visibility" text DEFAULT 'public' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "assembly_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" bigint NOT NULL,
  "released_at" bigint NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_yap_slug" ON "yy_yaps" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_yaps_owner" ON "yy_yaps" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_yaps_status" ON "yy_yaps" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_yaps_visibility" ON "yy_yaps" USING btree ("visibility");--> statement-breakpoint
