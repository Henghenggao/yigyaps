import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // 0009: stripe_account_id on users
    await pool.query('ALTER TABLE "yy_users" ADD COLUMN IF NOT EXISTS "stripe_account_id" text');
    console.log('✅ Added stripe_account_id to yy_users');

    // 0009: yy_subscriptions
    await pool.query(`CREATE TABLE IF NOT EXISTS "yy_subscriptions" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL REFERENCES "yy_users"("id") ON DELETE CASCADE,
      "stripe_customer_id" text NOT NULL,
      "stripe_subscription_id" text NOT NULL UNIQUE,
      "tier" text NOT NULL DEFAULT 'free',
      "status" text NOT NULL DEFAULT 'active',
      "calls_used" integer NOT NULL DEFAULT 0,
      "calls_limit" integer NOT NULL DEFAULT 0,
      "current_period_start" bigint NOT NULL,
      "current_period_end" bigint NOT NULL,
      "canceled_at" bigint,
      "created_at" bigint NOT NULL,
      "updated_at" bigint NOT NULL
    )`);
    console.log('✅ Created yy_subscriptions');

    // 0009: yy_usage_ledger
    await pool.query(`CREATE TABLE IF NOT EXISTS "yy_usage_ledger" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL REFERENCES "yy_users"("id") ON DELETE CASCADE,
      "skill_package_id" text NOT NULL REFERENCES "yy_skill_packages"("id") ON DELETE CASCADE,
      "stripe_subscription_id" text,
      "cost_usd" numeric(10,4) NOT NULL,
      "creator_royalty_usd" numeric(10,4) NOT NULL,
      "stripe_usage_record_id" text,
      "created_at" bigint NOT NULL
    )`);
    console.log('✅ Created yy_usage_ledger');

    // 0010: yy_shamir_shares
    await pool.query(`CREATE TABLE IF NOT EXISTS "yy_shamir_shares" (
      "id" text PRIMARY KEY,
      "skill_package_id" text NOT NULL REFERENCES "yy_skill_packages"("id") ON DELETE CASCADE,
      "share_index" integer NOT NULL,
      "share_holder" text NOT NULL DEFAULT 'platform',
      "encrypted_share" text NOT NULL,
      "created_at" bigint NOT NULL
    )`);
    console.log('✅ Created yy_shamir_shares');

    // 0011: yy_skill_rules
    await pool.query(`CREATE TABLE IF NOT EXISTS "yy_skill_rules" (
      "id" text PRIMARY KEY,
      "skill_package_id" text NOT NULL REFERENCES "yy_skill_packages"("id") ON DELETE CASCADE,
      "path" text NOT NULL DEFAULT 'rules.json',
      "content" text NOT NULL,
      "created_at" bigint NOT NULL,
      "updated_at" bigint NOT NULL,
      UNIQUE("skill_package_id", "path")
    )`);
    console.log('✅ Created yy_skill_rules');

    // Indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_yy_subscriptions_user ON "yy_subscriptions"("user_id")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_yy_subscriptions_stripe_customer ON "yy_subscriptions"("stripe_customer_id")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_yy_subscriptions_status ON "yy_subscriptions"("status")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_yy_usage_ledger_user ON "yy_usage_ledger"("user_id")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_yy_usage_ledger_skill ON "yy_usage_ledger"("skill_package_id")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_yy_usage_ledger_created ON "yy_usage_ledger"("created_at")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_yy_shamir_shares_skill ON "yy_shamir_shares"("skill_package_id")');
    console.log('✅ Created all indexes');

    await pool.end();
    console.log('🎉 All missing migrations applied successfully!');
  } catch(e) {
    console.error('❌ Error:', e.message);
    await pool.end();
    process.exit(1);
  }
}

run();
