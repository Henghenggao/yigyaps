ALTER TABLE "yy_users" ALTER COLUMN "github_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "yy_users" ALTER COLUMN "github_username" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "yy_users" ADD COLUMN "google_id" text;--> statement-breakpoint
CREATE INDEX "idx_yy_users_google_id" ON "yy_users" USING btree ("google_id");--> statement-breakpoint
ALTER TABLE "yy_users" ADD CONSTRAINT "yy_users_google_id_unique" UNIQUE("google_id");