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
  fastify.get("/health", async (_request, reply) => {
    return reply.send({ status: "ok", service: "yigyaps-api", version: "0.1.0" });
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
