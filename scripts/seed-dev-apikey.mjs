#!/usr/bin/env node
/**
 * Seed a dev user + API key into YigYaps DB for local Yigcore integration testing.
 *
 * Usage:
 *   node scripts/seed-dev-apikey.mjs
 *
 * Output: prints the plaintext API key (yg_dev_...) to stdout.
 * Set this as YIGYAPS_API_KEY in Yigcore's .env.
 */

import crypto from "crypto";
import pg from "pg";
import { fileURLToPath } from "url";
import { join } from "path";
import dotenv from "dotenv";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set in .env");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("railway") ? { rejectUnauthorized: false } : false,
});

async function main() {
  const client = await pool.connect();
  try {
    const now = Date.now();
    const userId = "user_yigcore_dev";
    const apiKeyId = `ak_dev_${now}`;

    // 1. Upsert dev user
    await client.query(
      `INSERT INTO yy_users (id, display_name, tier, role, created_at, updated_at, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $5, $5)
       ON CONFLICT (id) DO UPDATE SET last_login_at = $5`,
      [userId, "Yigcore Dev Service", "pro", "admin", now],
    );

    // 2. Generate API key
    const rawKey = "yg_" + crypto.randomBytes(32).toString("hex");
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.substring(0, 10);

    // 3. Insert API key (upsert by prefix to avoid duplicates on re-run)
    await client.query(
      `INSERT INTO yy_api_keys (id, user_id, name, key_hash, key_prefix, scopes, created_at, terms_accepted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       ON CONFLICT (key_hash) DO NOTHING`,
      [apiKeyId, userId, "yigcore-local-dev", keyHash, keyPrefix, ["registry:read", "registry:write"], now],
    );

    console.log("=== YigYaps Dev API Key Generated ===");
    console.log(`YIGYAPS_API_KEY=${rawKey}`);
    console.log("");
    console.log("Add this to Yigcore/.env:");
    console.log(`YIGYAPS_API_KEY=${rawKey}`);
    console.log(`YIGYAPS_API_URL=http://localhost:3200`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
