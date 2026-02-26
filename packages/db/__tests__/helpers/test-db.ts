import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";

import * as schema from "../../src/schema/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("🚀 Starting PostgreSQL container for DB test run...");
const container = await new PostgreSqlContainer("postgres:16-alpine")
  .withDatabase("yigyaps_test")
  .withUsername("test_user")
  .withPassword("test_password")
  .start();

const connectionString = container.getConnectionUri();
const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

// Run migrations
const migrationsPath = path.resolve(__dirname, "../../migrations");
await migrate(db, { migrationsFolder: migrationsPath });

export { db, pool, container };
