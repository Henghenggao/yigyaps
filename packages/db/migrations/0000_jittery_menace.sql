CREATE TABLE "yy_royalty_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_package_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"installation_id" text NOT NULL,
	"gross_amount_usd" numeric(10, 4) NOT NULL,
	"royalty_amount_usd" numeric(10, 4) NOT NULL,
	"royalty_percent" numeric(5, 2) DEFAULT '70.00' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yy_skill_mints" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_package_id" text NOT NULL,
	"rarity" text DEFAULT 'common' NOT NULL,
	"max_editions" integer,
	"minted_count" integer DEFAULT 0 NOT NULL,
	"creator_id" text NOT NULL,
	"creator_royalty_percent" numeric(5, 2) DEFAULT '70.00' NOT NULL,
	"graduation_certificate" jsonb,
	"origin" text DEFAULT 'manual' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yy_skill_package_installations" (
	"id" text PRIMARY KEY NOT NULL,
	"package_id" text NOT NULL,
	"package_version" text NOT NULL,
	"agent_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'installing' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"configuration" jsonb,
	"error_message" text,
	"installed_at" bigint NOT NULL,
	"uninstalled_at" bigint
);
--> statement-breakpoint
CREATE TABLE "yy_skill_package_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"package_id" text NOT NULL,
	"package_version" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"verified" boolean DEFAULT false NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yy_skill_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"package_id" text NOT NULL,
	"version" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text NOT NULL,
	"readme" text,
	"author" text NOT NULL,
	"author_name" text NOT NULL,
	"author_url" text,
	"license" text DEFAULT 'open-source' NOT NULL,
	"price_usd" numeric(10, 2) DEFAULT '0' NOT NULL,
	"requires_api_key" boolean DEFAULT false NOT NULL,
	"api_key_instructions" text,
	"category" text DEFAULT 'other' NOT NULL,
	"maturity" text DEFAULT 'experimental' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"min_runtime_version" text DEFAULT '0.1.0' NOT NULL,
	"required_tier" integer DEFAULT 0 NOT NULL,
	"mcp_transport" text DEFAULT 'stdio' NOT NULL,
	"mcp_command" text,
	"mcp_url" text,
	"system_dependencies" text[],
	"package_dependencies" text[],
	"install_count" integer DEFAULT 0 NOT NULL,
	"rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"origin" text DEFAULT 'manual' NOT NULL,
	"icon" text,
	"repository_url" text,
	"homepage_url" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"released_at" bigint NOT NULL,
	CONSTRAINT "yy_skill_packages_package_id_unique" UNIQUE("package_id")
);
--> statement-breakpoint
ALTER TABLE "yy_skill_mints" ADD CONSTRAINT "yy_skill_mints_skill_package_id_yy_skill_packages_id_fk" FOREIGN KEY ("skill_package_id") REFERENCES "public"."yy_skill_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yy_skill_package_installations" ADD CONSTRAINT "yy_skill_package_installations_package_id_yy_skill_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."yy_skill_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yy_skill_package_reviews" ADD CONSTRAINT "yy_skill_package_reviews_package_id_yy_skill_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."yy_skill_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_yy_royalty_creator" ON "yy_royalty_ledger" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_yy_royalty_package" ON "yy_royalty_ledger" USING btree ("skill_package_id");--> statement-breakpoint
CREATE INDEX "idx_yy_skill_mints_creator" ON "yy_skill_mints" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_yy_skill_mints_rarity" ON "yy_skill_mints" USING btree ("rarity");--> statement-breakpoint
CREATE INDEX "idx_yy_installations_agent" ON "yy_skill_package_installations" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_yy_installations_user" ON "yy_skill_package_installations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_yy_installations_package" ON "yy_skill_package_installations" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "idx_yy_reviews_package" ON "yy_skill_package_reviews" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "idx_yy_reviews_user" ON "yy_skill_package_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_yy_skill_packages_category" ON "yy_skill_packages" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_yy_skill_packages_author" ON "yy_skill_packages" USING btree ("author");--> statement-breakpoint
CREATE INDEX "idx_yy_skill_packages_maturity" ON "yy_skill_packages" USING btree ("maturity");--> statement-breakpoint
CREATE INDEX "idx_yy_skill_packages_origin" ON "yy_skill_packages" USING btree ("origin");