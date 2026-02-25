/**
 * YigYaps API Server — Standalone Fastify application
 *
 * The YigYaps API is a completely independent service with its own PostgreSQL database.
 * It has no runtime dependency on Yigcore. Yigstudio publishes skills to YigYaps
 * via this HTTP API, just like any third-party creator would.
 *
 * Endpoints:
 *   /v1/auth              — GitHub OAuth & user authentication (Phase 2)
 *   /v1/users             — User profile management (Phase 2)
 *   /v1/packages          — Skill package registry (CRUD + search)
 *   /v1/installations     — Skill installation management
 *   /v1/reviews           — Package reviews
 *   /v1/mints             — Limited edition minting
 *   /.well-known/mcp.json — MCP Registry discovery
 *   /v1/health            — Health check
 *
 * License: Apache 2.0
 */

import Fastify from "fastify";
import { z } from "zod";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@yigyaps/db";
import { packagesRoutes } from "./routes/packages.js";
import { installationsRoutes } from "./routes/installations.js";
import { reviewsRoutes } from "./routes/reviews.js";
import { mintsRoutes } from "./routes/mints.js";
import { registryRoutes, wellKnownRoutes } from "./routes/registry.js";
import { authRoutes } from "./routes/auth.js";
import { usersRoutes } from "./routes/users.js";
import { securityRoutes } from "./routes/security.js";
import { env } from "./lib/env.js";

const { Pool } = pg;

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  // ── Security ──────────────────────────────────────────────────────────────
  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: (env.CORS_ORIGIN || "").split(",").filter(Boolean),
    credentials: true,
  });
  await fastify.register(rateLimit, {
    max: 20, // Strict MVP Limit for scraping protection
    timeWindow: "1 minute",
  });
  await fastify.register(cookie, {
    secret: env.SESSION_SECRET,
  });

  // ── Database ──────────────────────────────────────────────────────────────
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT,
    connectionTimeoutMillis: env.DB_POOL_CONN_TIMEOUT,
  });
  const db = drizzle(pool, { schema });
  fastify.decorate("db", db);

  // ── OpenAPI ────────────────────────────────────────────────────────────────
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "YigYaps API",
        description: "YigYaps skill registry and deployment platform API",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  // ── Routes ─────────────────────────────────────────────────────────────────
  await fastify.register(wellKnownRoutes, { prefix: "/.well-known" });
  await fastify.register(registryRoutes, { prefix: "/v1" });
  await fastify.register(authRoutes, { prefix: "/v1/auth" });
  await fastify.register(usersRoutes, { prefix: "/v1/users" });
  await fastify.register(packagesRoutes, { prefix: "/v1/packages" });
  await fastify.register(installationsRoutes, { prefix: "/v1/installations" });
  await fastify.register(reviewsRoutes, { prefix: "/v1/reviews" });
  await fastify.register(mintsRoutes, { prefix: "/v1/mints" });
  await fastify.register(securityRoutes, { prefix: "/v1/security" });

  // ── Error Handling ─────────────────────────────────────────────────────────
  fastify.setErrorHandler(function (err, request, reply) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Validation failed",
        details: err.issues,
      });
    }

    const error = err as Error & { code?: string; statusCode?: number };

    // Database / Postgres error heuristics
    if (error.code && typeof error.code === 'string' && error.code.match(/^[A-Z0-9]{5}$/)) {
      request.log.error({ err: error }, "Database error");
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "A database error occurred",
      });
    }

    // Default error handling
    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.name || "Error",
        message: error.message,
      });
    }

    // Log unexpected errors
    request.log.error({ err: error }, "Unhandled server error");
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  });

  fastify.setNotFoundHandler(function (request, reply) {
    return reply.status(404).send({
      error: "Not Found",
      message: `Route ${request.method}:${request.url} not found`,
    });
  });

  return fastify;
}

async function main() {
  const server = await buildServer();
  const port = env.PORT;
  const host = env.HOST;

  try {
    await server.listen({ port, host });
    server.log.info(`YigYaps API listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
