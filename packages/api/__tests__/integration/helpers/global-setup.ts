/**
 * Integration Test Global Setup
 *
 * Manages PostgreSQL container lifecycle for API integration tests.
 * Container is started once for all integration tests.
 *
 * License: Apache 2.0
 */

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setup() {
  console.log("🚀 Starting PostgreSQL container for integration tests...");

  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("yigyaps_test")
    .withUsername("test_user")
    .withPassword("test_password")
    .start();

  const connectionString = container.getConnectionUri();
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  // Run migrations
  const migrationsPath = path.resolve(__dirname, "../../../../db/migrations");
  console.log(`📂 Migrations folder: ${migrationsPath}`);

  try {
    await migrate(db, { migrationsFolder: migrationsPath });
    console.log("✅ Migrations completed successfully");

    // Verify tables exist
    const result = await pool.query(`
      SELECT tablename FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log(
      "📋 Created tables:",
      result.rows.map((r) => r.tablename).join(", "),
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }

  console.log("✅ Integration test database ready");

  // Save connection info to environment variable
  process.env.TEST_DATABASE_URL = connectionString;
  process.env.JWT_SECRET = "test-jwt-secret-for-integration-tests";

  return async () => {
    await pool.end();
    await container.stop();
    console.log("🛑 Integration test container stopped");
  };
}

export async function teardown() {
  // Cleanup is handled in setup's return function
}
