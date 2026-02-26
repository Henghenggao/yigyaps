/**
 * YigYaps Database Migration Runner
 *
 * Runs Drizzle migrations against PostgreSQL.
 * Used during Railway deployment and local development.
 *
 * Usage: node scripts/migrate.js
 * Requires: DATABASE_URL environment variable
 *
 * License: Apache 2.0
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { Pool } = pg;

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("🚀 Starting YigYaps database migrations...");
  console.log(`📍 Database: ${databaseUrl.replace(/:[^:@]+@/, ":****@")}`); // Hide password

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });
  const db = drizzle(pool);

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationsFolder = join(__dirname, "../packages/db/migrations");

    console.log(`📂 Migrations folder: ${migrationsFolder}`);

    await migrate(db, { migrationsFolder });

    console.log("✅ Migrations completed successfully!");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
