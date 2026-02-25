/**
 * YigYaps API Authentication Middleware
 *
 * Phase 1: Simple ADMIN_SECRET for write operations
 * Phase 2: Will be replaced with GitHub OAuth + API key validation
 *
 * License: Apache 2.0
 */

import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Validates ADMIN_SECRET for write operations (Phase 1 only)
 *
 * Expects: Authorization: Bearer <ADMIN_SECRET>
 *
 * @example
 * // In route handler:
 * fastify.post("/v1/packages", { preHandler: requireAdminAuth }, handler);
 */
export async function requireAdminAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const adminSecret = process.env.ADMIN_SECRET;

  // If ADMIN_SECRET is not configured, reject all write operations
  if (!adminSecret) {
    request.log.error("ADMIN_SECRET environment variable is not configured");
    return reply.status(500).send({
      error: "Server misconfiguration",
      message: "Authentication is not properly configured",
    });
  }

  // Extract Authorization header
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Missing Authorization header",
    });
  }

  // Validate Bearer token format
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid Authorization header format. Expected: Bearer <token>",
    });
  }

  // Validate token matches ADMIN_SECRET
  if (token !== adminSecret) {
    return reply.status(403).send({
      error: "Forbidden",
      message: "Invalid credentials",
    });
  }

  // Authentication successful - continue to route handler
  request.log.info("Admin authentication successful");
}
