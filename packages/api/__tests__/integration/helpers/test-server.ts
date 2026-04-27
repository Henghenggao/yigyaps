/**
 * Test Server Helper
 *
 * Creates a Fastify test instance with database connection for integration tests.
 * Used to test API routes and endpoints with real database.
 *
 * License: Apache 2.0
 */

import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@yigyaps/db";
import { packagesRoutes } from "../../../src/routes/packages.js";
import { yapsRoutes } from "../../../src/routes/yaps.js";
import { skillPacksRoutes } from "../../../src/routes/skill-packs.js";
import { yapMountsRoutes } from "../../../src/routes/yap-mounts.js";
import { yapAssemblyRoutes } from "../../../src/routes/yap-assembly.js";
import { yapRuntimePlanRoutes } from "../../../src/routes/yap-runtime-plans.js";
import { yapRemoteManifestRoutes } from "../../../src/routes/yap-remote-manifest.js";
import { yapImportRoutes } from "../../../src/routes/yap-imports.js";
import { installationsRoutes } from "../../../src/routes/installations.js";
import { reviewsRoutes } from "../../../src/routes/reviews.js";
import { mintsRoutes } from "../../../src/routes/mints.js";
import {
  registryRoutes,
  wellKnownRoutes,
} from "../../../src/routes/registry.js";
import { authRoutes } from "../../../src/routes/auth.js";
import { usersRoutes } from "../../../src/routes/users.js";
import { securityRoutes } from "../../../src/routes/security.js";
import { stripeRoutes } from "../../../src/routes/stripe.js";
import { adminRoutes } from "../../../src/routes/admin.js";
import { apiKeysRoutes } from "../../../src/routes/api-keys.js";

// ─── Test Server Creation ─────────────────────────────────────────────────────

export interface TestServerContext {
  fastify: FastifyInstance;
  pool: Pool;
  db: ReturnType<typeof drizzle>;
}

/**
 * Create a test Fastify server with database connection
 * @param databaseUrl PostgreSQL connection string
 * @returns Test server context
 */
export async function createTestServer(
  databaseUrl: string,
): Promise<TestServerContext> {
  const fastify = Fastify({
    logger: false, // Disable logging in tests
  });

  // ── Security (minimal for tests) ──────────────────────────────────────────
  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: "*",
  });
  await fastify.register(cookie, {
    secret: "test-cookie-secret",
  });

  // ── Database ──────────────────────────────────────────────────────────────
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  fastify.decorate("db", db);

  // ── Routes ─────────────────────────────────────────────────────────────────
  await fastify.register(wellKnownRoutes, { prefix: "/.well-known" });
  await fastify.register(registryRoutes, { prefix: "/v1" });
  await fastify.register(authRoutes, { prefix: "/v1/auth" });
  await fastify.register(usersRoutes, { prefix: "/v1/users" });
  await fastify.register(yapsRoutes, { prefix: "/v1/yaps" });
  await fastify.register(skillPacksRoutes, { prefix: "/v1/yaps" });
  await fastify.register(yapMountsRoutes, { prefix: "/v1/yaps" });
  await fastify.register(yapAssemblyRoutes, { prefix: "/v1/yaps" });
  await fastify.register(yapRuntimePlanRoutes, { prefix: "/v1/yaps" });
  await fastify.register(yapRemoteManifestRoutes, { prefix: "/v1/yaps" });
  await fastify.register(yapImportRoutes, { prefix: "/v1/yap-imports" });
  await fastify.register(packagesRoutes, { prefix: "/v1/packages" });
  await fastify.register(installationsRoutes, { prefix: "/v1/installations" });
  await fastify.register(reviewsRoutes, { prefix: "/v1/reviews" });
  await fastify.register(mintsRoutes, { prefix: "/v1/mints" });
  await fastify.register(securityRoutes, { prefix: "/v1/security" });
  await fastify.register(stripeRoutes, { prefix: "/v1" });
  await fastify.register(adminRoutes, { prefix: "/v1/admin" });
  await fastify.register(apiKeysRoutes, { prefix: "/v1/auth" });

  return { fastify, pool, db };
}

/**
 * Clean up test server and close connections
 * @param context Test server context
 */
export async function closeTestServer(
  context: TestServerContext,
): Promise<void> {
  await context.fastify.close();
  await context.pool.end();
}
