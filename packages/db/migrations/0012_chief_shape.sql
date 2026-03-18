ALTER TABLE "yy_users" ALTER COLUMN "github_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "yy_users" ALTER COLUMN "github_username" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "yy_users" ADD COLUMN IF NOT EXISTS "google_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_users_google_id" ON "yy_users" USING btree ("google_id");--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'yy_users_google_id_unique') THEN ALTER TABLE "yy_users" ADD CONSTRAINT "yy_users_google_id_unique" UNIQUE("google_id"); END IF; END $$;
