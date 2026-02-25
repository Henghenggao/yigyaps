/**
 * YigYaps API Server — Standalone Fastify application
 *
 * The YigYaps API is a completely independent service with its own PostgreSQL database.
 * It has no runtime dependency on Yigcore. Yigstudio publishes skills to YigYaps
 * via this HTTP API, just like any third-party creator would.
 *
 * Endpoints:
 *   /v1/packages          — Skill package registry (CRUD + search)
 *   /v1/installations     — Skill installation management
 *   /v1/reviews           — Package reviews
 *   /v1/mints             — Limited edition minting
 *   /.well-known/mcp.json — MCP Registry discovery
 *   /health               — Health check
 *
 * License: Apache 2.0
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@yigyaps/db";
import { packagesRoutes } from "./routes/packages.js";
import { installationsRoutes } from "./routes/installations.js";
import { reviewsRoutes } from "./routes/reviews.js";
import { mintsRoutes } from "./routes/mints.js";
import { registryRoutes, wellKnownRoutes } from "./routes/registry.js";

const { Pool } = pg;

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  // ── Security ──────────────────────────────────────────────────────────────
  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "*",
  });
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // ── Database ──────────────────────────────────────────────────────────────
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://localhost:5432/yigyaps",
  });
  const db = drizzle(pool, { schema });
  fastify.decorate("db", db);

  // ── Routes ─────────────────────────────────────────────────────────────────
  await fastify.register(wellKnownRoutes, { prefix: "/.well-known" });
  await fastify.register(registryRoutes, { prefix: "/v1" });
  await fastify.register(packagesRoutes, { prefix: "/v1/packages" });
  await fastify.register(installationsRoutes, { prefix: "/v1/installations" });
  await fastify.register(reviewsRoutes, { prefix: "/v1/reviews" });
  await fastify.register(mintsRoutes, { prefix: "/v1/mints" });

  return fastify;
}

async function main() {
  const server = await buildServer();
  const port = Number(process.env.PORT ?? 3100);
  const host = process.env.HOST ?? "0.0.0.0";

  try {
    await server.listen({ port, host });
    server.log.info(`YigYaps API listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
