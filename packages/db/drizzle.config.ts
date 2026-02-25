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
  schema: "./dist/schema/index.js",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/yigyaps",
  },
});
