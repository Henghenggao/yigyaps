-- Migration 0009: Stripe Connect integration
-- Adds stripe_account_id to yy_users, creates yy_subscriptions and yy_usage_ledger
-- Sprint 7B #4

-- 1. Add Stripe Connect account ID to users
ALTER TABLE "yy_users" ADD COLUMN IF NOT EXISTS "stripe_account_id" text;

--> statement-breakpoint

-- 2. Subscriptions table
CREATE TABLE IF NOT EXISTS "yy_subscriptions" (
  "id"                      text PRIMARY KEY,
  "user_id"                 text NOT NULL REFERENCES "yy_users"("id") ON DELETE CASCADE,
  "stripe_customer_id"      text NOT NULL,
  "stripe_subscription_id"  text NOT NULL UNIQUE,
  "tier"                    text NOT NULL DEFAULT 'free',
  "status"                  text NOT NULL DEFAULT 'active',
  "calls_used"              integer NOT NULL DEFAULT 0,
  "calls_limit"             integer NOT NULL DEFAULT 0,
  "current_period_start"    bigint NOT NULL,
  "current_period_end"      bigint NOT NULL,
  "canceled_at"             bigint,
  "created_at"              bigint NOT NULL,
  "updated_at"              bigint NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_yy_subscriptions_user"
  ON "yy_subscriptions" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "idx_yy_subscriptions_stripe_customer"
  ON "yy_subscriptions" USING btree ("stripe_customer_id");

CREATE INDEX IF NOT EXISTS "idx_yy_subscriptions_status"
  ON "yy_subscriptions" USING btree ("status");

--> statement-breakpoint

-- 3. Usage ledger table
CREATE TABLE IF NOT EXISTS "yy_usage_ledger" (
  "id"                      text PRIMARY KEY,
  "user_id"                 text NOT NULL REFERENCES "yy_users"("id") ON DELETE CASCADE,
  "skill_package_id"        text NOT NULL REFERENCES "yy_skill_packages"("id") ON DELETE CASCADE,
  "stripe_subscription_id"  text,
  "cost_usd"                numeric(10, 4) NOT NULL,
  "creator_royalty_usd"     numeric(10, 4) NOT NULL,
  "stripe_usage_record_id"  text,
  "created_at"              bigint NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_yy_usage_ledger_user"
  ON "yy_usage_ledger" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "idx_yy_usage_ledger_skill"
  ON "yy_usage_ledger" USING btree ("skill_package_id");

CREATE INDEX IF NOT EXISTS "idx_yy_usage_ledger_created"
  ON "yy_usage_ledger" USING btree ("created_at");
