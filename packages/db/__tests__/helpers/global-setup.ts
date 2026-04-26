import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setup() {
  let container: StartedPostgreSqlContainer | null = null;
  let connectionString = process.env.TEST_DATABASE_URL;

  if (!connectionString) {
    console.log("Starting PostgreSQL test container...");

    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("yigyaps_test")
      .withUsername("test_user")
      .withPassword("test_password")
      .start();

    connectionString = container.getConnectionUri();
  } else {
    console.log("Using TEST_DATABASE_URL for DB tests.");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  const migrationsPath = path.resolve(__dirname, "../../migrations");
  console.log(`Migrations folder: ${migrationsPath}`);

  try {
    await migrate(db, { migrationsFolder: migrationsPath });
    console.log("Migrations completed successfully.");

    const result = await pool.query(`
      SELECT tablename FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log(
      "Created tables:",
      result.rows.map((r) => r.tablename).join(", "),
    );
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }

  process.env.TEST_DATABASE_URL = connectionString;

  return async () => {
    await pool.end();
    if (container) {
      await container.stop();
      console.log("Test container stopped.");
    }
  };
}

export async function teardown() {
  // Cleanup is handled in setup's return function.
}
