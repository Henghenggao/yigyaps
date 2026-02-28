CREATE TABLE "yy_skill_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"package_id" text NOT NULL,
	"path" text NOT NULL,
	"content" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yy_shamir_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_package_id" text NOT NULL,
	"share_index" integer NOT NULL,
	"share_data" text NOT NULL,
	"custodian" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yy_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"resolved_by" text,
	"resolved_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yy_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"tier" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"calls_used" integer DEFAULT 0 NOT NULL,
	"calls_limit" integer DEFAULT 0 NOT NULL,
	"current_period_start" bigint NOT NULL,
	"current_period_end" bigint NOT NULL,
	"canceled_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "yy_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "yy_usage_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"skill_package_id" text NOT NULL,
	"stripe_subscription_id" text,
	"cost_usd" numeric(10, 4) NOT NULL,
	"creator_royalty_usd" numeric(10, 4) NOT NULL,
	"stripe_usage_record_id" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "yy_skill_packages" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "yy_api_keys" ADD COLUMN "terms_accepted_at" bigint;--> statement-breakpoint
ALTER TABLE "yy_users" ADD COLUMN "stripe_account_id" text;--> statement-breakpoint
ALTER TABLE "yy_encrypted_knowledge" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "yy_invocation_logs" ADD COLUMN "prev_hash" text;--> statement-breakpoint
ALTER TABLE "yy_invocation_logs" ADD COLUMN "event_hash" text;--> statement-breakpoint
ALTER TABLE "yy_skill_rules" ADD CONSTRAINT "yy_skill_rules_package_id_yy_skill_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."yy_skill_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yy_shamir_shares" ADD CONSTRAINT "yy_shamir_shares_skill_package_id_yy_skill_packages_id_fk" FOREIGN KEY ("skill_package_id") REFERENCES "public"."yy_skill_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yy_subscriptions" ADD CONSTRAINT "yy_subscriptions_user_id_yy_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."yy_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yy_usage_ledger" ADD CONSTRAINT "yy_usage_ledger_user_id_yy_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."yy_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yy_usage_ledger" ADD CONSTRAINT "yy_usage_ledger_skill_package_id_yy_skill_packages_id_fk" FOREIGN KEY ("skill_package_id") REFERENCES "public"."yy_skill_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_yy_skill_rules_package" ON "yy_skill_rules" USING btree ("package_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_rule_path" ON "yy_skill_rules" USING btree ("package_id","path");--> statement-breakpoint
CREATE INDEX "idx_yy_shamir_shares_package" ON "yy_shamir_shares" USING btree ("skill_package_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_yy_shamir_shares_pkg_idx" ON "yy_shamir_shares" USING btree ("skill_package_id","share_index");--> statement-breakpoint
CREATE INDEX "idx_yy_reports_status" ON "yy_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_yy_reports_reporter" ON "yy_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "idx_yy_reports_target" ON "yy_reports" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "idx_yy_subscriptions_user" ON "yy_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_yy_subscriptions_stripe_customer" ON "yy_subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "idx_yy_subscriptions_status" ON "yy_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_yy_usage_ledger_user" ON "yy_usage_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_yy_usage_ledger_skill" ON "yy_usage_ledger" USING btree ("skill_package_id");--> statement-breakpoint
CREATE INDEX "idx_yy_usage_ledger_created" ON "yy_usage_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_user_review" ON "yy_skill_package_reviews" USING btree ("user_id","package_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_author_pkg" ON "yy_skill_packages" USING btree ("author","package_id");--> statement-breakpoint
CREATE INDEX "idx_yy_encrypted_knowledge_active" ON "yy_encrypted_knowledge" USING btree ("skill_package_id","is_active");