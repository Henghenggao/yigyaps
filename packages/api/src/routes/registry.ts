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

import type { FastifyInstance } from "fastify";

export async function registryRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async (request, reply) => {
    // Test database connection
    let dbStatus = "disconnected";
    try {
      await fastify.db.execute("SELECT 1");
      dbStatus = "connected";
    } catch (error) {
      request.log.error({ error }, "Database health check failed");
    }

    const response = {
      status: dbStatus === "connected" ? "healthy" : "degraded",
      service: "yigyaps-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || "development",
    };

    const statusCode = dbStatus === "connected" ? 200 : 503;
    return reply.status(statusCode).send(response);
  });
}

export async function wellKnownRoutes(fastify: FastifyInstance) {
  fastify.get("/mcp.json", async (_request, reply) => {
    return reply.send({
      registries: [
        {
          name: "YigYaps",
          description: "The open marketplace for YAP skills — MCP-compatible skill registry",
          url: `${process.env.YIGYAPS_API_URL ?? "https://api.yigyaps.com"}/v1`,
          version: "1.0.0",
        },
      ],
    });
  });
}
