-- Add unique constraint to prevent duplicate reviews from same user
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_user_review" ON "yy_skill_package_reviews" USING btree ("user_id", "package_id");--> statement-breakpoint

-- Add unique constraint for author + packageId (defensive, packageId is already globally unique)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_author_pkg" ON "yy_skill_packages" USING btree ("author", "package_id");
