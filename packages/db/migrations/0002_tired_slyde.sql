CREATE INDEX "idx_yy_skill_packages_install_count" ON "yy_skill_packages" USING btree ("install_count");--> statement-breakpoint
CREATE INDEX "idx_yy_skill_packages_rating" ON "yy_skill_packages" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_yy_skill_packages_released_at" ON "yy_skill_packages" USING btree ("released_at");