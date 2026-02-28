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

import "dotenv/config";
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
import { apiKeysRoutes } from "./routes/api-keys.js";
import { securityRoutes } from "./routes/security.js";
import { adminRoutes } from "./routes/admin.js";
import { exportRoutes } from "./routes/export.js";
import { stripeRoutes } from "./routes/stripe.js";
import { env } from "./lib/env.js";

const { Pool } = pg;

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  // ── Security ──────────────────────────────────────────────────────────────
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // CSS-in-JS requires unsafe-inline
        imgSrc: ["'self'", "https:", "data:"], // Allow external avatars and data URIs
        connectSrc: [
          "'self'",
          ...(env.CORS_ORIGIN || "").split(",").filter(Boolean),
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  });
  await fastify.register(cors, {
    origin: env.NODE_ENV === "development" ? true : (env.CORS_ORIGIN || "").split(",").filter(Boolean),
    credentials: true,
  });
  await fastify.register(rateLimit, {
    // Default rate limit for authenticated write operations (POST/PATCH/DELETE).
    // Public GET routes and auth routes override this per-route via config.rateLimit.
    max: 30,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.user?.userId ?? request.ip,
    // Allow higher limits on public GET routes (set per-route with config: { rateLimit: { max, timeWindow } })
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
    ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  fastify.log.info(
    {
      db: env.DATABASE_URL.replace(/:[^:@]+@/, ":****@"),
      ssl: !!(env.NODE_ENV === "production"),
    },
    "Initializing database connection pool",
  );

  const db = drizzle(pool, { schema });
  fastify.decorate("db", db);

  // ── CSRF Protection (Origin Validation) ───────────────────────────────────
  const allowedOrigins = (env.CORS_ORIGIN || "").split(",").filter(Boolean);
  fastify.addHook("preHandler", async (request, reply) => {
    const method = request.method;

    // Skip CSRF check for safe methods
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return;
    }

    // Skip CSRF check for clients using Bearer tokens (CLI, API keys)
    // as these are not subject to traditional CSRF attacks.
    if (request.headers.authorization) {
      return;
    }

    // For state-changing methods (POST, PUT, PATCH, DELETE), verify Origin
    const origin = request.headers.origin;
    const referer = request.headers.referer;

    // Extract origin from referer if origin header is not present
    let requestOrigin = origin;
    if (!requestOrigin && referer) {
      try {
        const refererUrl = new URL(referer);
        requestOrigin = refererUrl.origin;
      } catch {
        // Invalid referer URL, skip
      }
    }

    // If no origin/referer, reject (prevents CSRF from untracked sources)
    if (!requestOrigin) {
      fastify.log.warn(
        { method, url: request.url },
        "CSRF check failed: No origin or referer header",
      );
      return reply.code(403).send({
        error: "Forbidden",
        message: "Origin verification failed",
      });
    }

    // Verify origin is in allowed list
    const isAllowed = allowedOrigins.some((allowed) => {
      // Normalize trailing slashes
      const normalizedAllowed = allowed.replace(/\/$/, "");
      const normalizedRequest = requestOrigin.replace(/\/$/, "");
      return normalizedRequest === normalizedAllowed;
    });

    if (!isAllowed) {
      fastify.log.warn(
        { method, url: request.url, origin: requestOrigin },
        "CSRF check failed: Origin not allowed",
      );
      return reply.code(403).send({
        error: "Forbidden",
        message: "Origin verification failed",
      });
    }
  });

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
  await fastify.register(apiKeysRoutes, { prefix: "/v1/auth" });
  await fastify.register(adminRoutes, { prefix: "/v1/admin" });
  await fastify.register(exportRoutes, { prefix: "/v1/packages" });
  await fastify.register(stripeRoutes, { prefix: "/v1" });

  // ── Error Handling ─────────────────────────────────────────────────────────
  fastify.setErrorHandler(function (err, request, reply) {
    // Add request context for better error logging
    const requestContext = {
      method: request.method,
      url: request.url,
      userId: request.user?.userId || "anonymous",
    };

    if (err instanceof z.ZodError) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Validation failed",
        details: err.issues,
        requestId: request.id,
      });
    }

    const error = err as Error & {
      code?: string;
      statusCode?: number;
      constraint?: string;
    };

    // Database / Postgres error heuristics
    if (
      error.code &&
      typeof error.code === "string" &&
      error.code.match(/^[A-Z0-9]{5}$/)
    ) {
      // Handle unique constraint violations (23505)
      if (error.code === "23505") {
        const constraintName = error.constraint || "unknown";
        let message = "A record with these values already exists";

        // Provide user-friendly messages for known constraints
        if (constraintName.includes("author_pkg")) {
          message = "You have already published a package with this name";
        } else if (constraintName.includes("user_review")) {
          message = "You have already reviewed this package";
        } else if (constraintName.includes("package_id")) {
          message = "This package ID is already in use";
        }

        request.log.warn(
          { err: error, constraint: constraintName, ...requestContext },
          "Unique constraint violation",
        );
        return reply.status(409).send({
          error: "Conflict",
          message,
          constraint: constraintName,
          requestId: request.id,
        });
      }

      // Other database errors
      request.log.error({ err: error, ...requestContext }, "Database error");
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "A database error occurred",
        requestId: request.id,
      });
    }

    // Default error handling
    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.name || "Error",
        message: error.message,
        requestId: request.id,
      });
    }

    // Log unexpected errors with request context
    request.log.error(
      { err: error, ...requestContext },
      "Unhandled server error",
    );
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
      requestId: request.id,
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

  // ── Graceful Shutdown (E6) ────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}, starting graceful shutdown...`);
    try {
      // Stop accepting new requests; wait up to 30s for in-flight requests
      await server.close();
      server.log.info("Server closed successfully");
      process.exit(0);
    } catch (err) {
      server.log.error({ err }, "Error during graceful shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGUSR2", () => shutdown("SIGUSR2")); // nodemon restart
}

main();
