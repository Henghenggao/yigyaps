/**
 * YigYaps MCP Registry Discovery Routes
 *
 * GET /.well-known/mcp.json — MCP Registry discovery endpoint
 * GET /v1/health             — Health check
 *
 * The discovery endpoint makes YigYaps auto-discoverable by any
 * MCP-compatible client (Claude Code, Cursor, Windsurf, etc.).
 *
 * @see https://spec.modelcontextprotocol.io/specification/server/registry/
 *
 * License: Apache 2.0
 */

import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

export async function registryRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/health",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
    // 1. Check if database configuration exists
    const hasDbConfig = !!process.env.DATABASE_URL;

    // 2. Test database connection
    let dbStatus = "disconnected";
    let dbError: string | null = null;

    if (!hasDbConfig) {
      dbError = "DATABASE_URL environment variable is missing";
      request.log.warn(
        "Database health check skipped: No connection string provided",
      );
    } else {
      try {
        await fastify.db.execute(sql`SELECT 1`);
        dbStatus = "connected";
      } catch (error) {
        dbError = error instanceof Error ? error.message : String(error);
        request.log.error({ error }, "Database health check failed");
      }
    }

    const memMB = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;
    const mem = process.memoryUsage();

    const response = {
      status: dbStatus === "connected" ? "healthy" : "degraded",
      service: "yigyaps-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      database: {
        status: dbStatus,
        configured: hasDbConfig,
        error: dbError,
      },
      memory: {
        heapUsed: memMB(mem.heapUsed),
        heapTotal: memMB(mem.heapTotal),
        rss: memMB(mem.rss),
      },
      environment: process.env.NODE_ENV || "development",
    };

    // Return 200 even if degraded if explicitly allowed, otherwise 503
    // This helps services stay up for debugging even if DB is flaky
    const allowDegraded = process.env.ALLOW_DEGRADED_HEALTH === "true";
    const statusCode = dbStatus === "connected" || allowDegraded ? 200 : 503;

    return reply.status(statusCode).send(response);
    },
  );
}

export async function wellKnownRoutes(fastify: FastifyInstance) {
  fastify.get("/mcp.json", async (_request, reply) => {
    return reply.send({
      registries: [
        {
          name: "YigYaps",
          description:
            "The open marketplace for YAP skills — MCP-compatible skill registry",
          url: `${process.env.YIGYAPS_API_URL ?? "https://api.yigyaps.com"}/v1`,
          version: "1.0.0",
        },
      ],
    });
  });
}
