/**
 * Drizzle Kit Configuration for YigYaps Database
 *
 * Generates SQL migrations from the TypeScript schema definitions.
 * Run: npm run db:generate (from packages/db/)
 *
 * License: Apache 2.0
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/yigyaps",
  },
});
