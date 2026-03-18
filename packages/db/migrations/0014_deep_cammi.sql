ALTER TABLE "yy_users" ADD COLUMN IF NOT EXISTS "google_username" text;--> statement-breakpoint
ALTER TABLE "yy_users" ADD COLUMN IF NOT EXISTS "password_hash" text;--> statement-breakpoint
ALTER TABLE "yy_users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "yy_users" ADD COLUMN IF NOT EXISTS "verification_token" text;--> statement-breakpoint
ALTER TABLE "yy_users" ADD COLUMN IF NOT EXISTS "verification_token_expires_at" bigint;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_yy_users_google_username" ON "yy_users" USING btree ("google_username");--> statement-breakpoint
ALTER TABLE "yy_users" DROP CONSTRAINT IF EXISTS "yy_users_email_unique";--> statement-breakpoint
ALTER TABLE "yy_users" ADD CONSTRAINT "yy_users_email_unique" UNIQUE("email");
