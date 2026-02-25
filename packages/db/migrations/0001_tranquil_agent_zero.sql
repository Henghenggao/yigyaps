CREATE TABLE "yy_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"scopes" text[] NOT NULL,
	"last_used_at" bigint,
	"expires_at" bigint,
	"created_at" bigint NOT NULL,
	"revoked_at" bigint,
	CONSTRAINT "yy_api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "yy_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_token" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"last_active_at" bigint NOT NULL,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "yy_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "yy_users" (
	"id" text PRIMARY KEY NOT NULL,
	"github_id" text NOT NULL,
	"github_username" text NOT NULL,
	"email" text,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"tier" text DEFAULT 'free' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"bio" text,
	"website_url" text,
	"is_verified_creator" boolean DEFAULT false NOT NULL,
	"total_packages" integer DEFAULT 0 NOT NULL,
	"total_earnings_usd" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"last_login_at" bigint NOT NULL,
	CONSTRAINT "yy_users_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
CREATE TABLE "yy_encrypted_knowledge" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_package_id" text NOT NULL,
	"encrypted_dek" text NOT NULL,
	"content_ciphertext" "bytea" NOT NULL,
	"content_hash" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yy_invocation_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_package_id" text NOT NULL,
	"api_client_id" text NOT NULL,
	"cost_usd" numeric(10, 4),
	"expert_split" numeric(10, 4),
	"inference_ms" integer,
	"conclusion_hash" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yy_ip_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_package_id" text NOT NULL,
	"content_hash" text NOT NULL,
	"blockchain_tx" text NOT NULL,
	"registered_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "yy_skill_packages" ADD COLUMN "kek_id" text;--> statement-breakpoint
ALTER TABLE "yy_api_keys" ADD CONSTRAINT "yy_api_keys_user_id_yy_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."yy_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yy_sessions" ADD CONSTRAINT "yy_sessions_user_id_yy_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."yy_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yy_encrypted_knowledge" ADD CONSTRAINT "yy_encrypted_knowledge_skill_package_id_yy_skill_packages_id_fk" FOREIGN KEY ("skill_package_id") REFERENCES "public"."yy_skill_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yy_ip_registrations" ADD CONSTRAINT "yy_ip_registrations_skill_package_id_yy_skill_packages_id_fk" FOREIGN KEY ("skill_package_id") REFERENCES "public"."yy_skill_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_yy_api_keys_user" ON "yy_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_yy_api_keys_hash" ON "yy_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_yy_api_keys_prefix" ON "yy_api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "idx_yy_sessions_user" ON "yy_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_yy_sessions_token" ON "yy_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "idx_yy_sessions_expires" ON "yy_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_yy_users_github_id" ON "yy_users" USING btree ("github_id");--> statement-breakpoint
CREATE INDEX "idx_yy_users_github_username" ON "yy_users" USING btree ("github_username");--> statement-breakpoint
CREATE INDEX "idx_yy_users_email" ON "yy_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_yy_encrypted_knowledge_package" ON "yy_encrypted_knowledge" USING btree ("skill_package_id");--> statement-breakpoint
CREATE INDEX "idx_yy_invocation_logs_package" ON "yy_invocation_logs" USING btree ("skill_package_id");--> statement-breakpoint
CREATE INDEX "idx_yy_invocation_logs_client" ON "yy_invocation_logs" USING btree ("api_client_id");--> statement-breakpoint
CREATE INDEX "idx_yy_ip_registrations_package" ON "yy_ip_registrations" USING btree ("skill_package_id");