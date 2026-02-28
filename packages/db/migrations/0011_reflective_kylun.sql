CREATE TABLE "yy_skill_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"package_id" text NOT NULL,
	"path" text NOT NULL,
	"content" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "yy_skill_rules" ADD CONSTRAINT "yy_skill_rules_package_id_yy_skill_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."yy_skill_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_yy_skill_rules_package" ON "yy_skill_rules" USING btree ("package_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_rule_path" ON "yy_skill_rules" USING btree ("package_id","path");
