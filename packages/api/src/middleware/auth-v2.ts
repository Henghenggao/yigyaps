/**
 * YigYaps Authentication Middleware (Phase 2)
 *
 * Validates JWT tokens, API keys, and ADMIN_SECRET (backward compatibility).
 * Attaches user information to request.user.
 *
 * License: Apache 2.0
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyJWT } from "../lib/jwt.js";
import { ApiKeyDAL } from "@yigyaps/db";
import crypto from "crypto";

// ─── User Context ─────────────────────────────────────────────────────────────

export interface UserContext {
  userId: string;
  userName: string;
  githubUsername?: string;
  tier: "free" | "pro" | "epic" | "legendary";
  role: "user" | "admin";
  authMethod: "jwt" | "apikey" | "admin_secret";
}

// Extend Fastify Request to include user context
declare module "fastify" {
  interface FastifyRequest {
    user?: UserContext;
  }
}

// ─── Authentication Helpers ───────────────────────────────────────────────────

/**
 * Extract and validate JWT token
 */
async function validateJWT(token: string): Promise<UserContext | null> {
  try {
    const payload = verifyJWT(token);
    return {
      userId: payload.userId,
      userName: payload.userName,
      githubUsername: payload.githubUsername,
      tier: payload.tier,
      role: payload.role,
      authMethod: "jwt",
    };
  } catch (error) {
    return null;
  }
}

/**
 * Extract and validate API key
 */
async function validateApiKey(
  request: FastifyRequest,
  key: string,
): Promise<UserContext | null> {
  try {
    // API keys start with yg_prod_ or yg_dev_
    if (!key.startsWith("yg_")) {
      return null;
    }

    // Hash the key to look up in database
    const keyHash = crypto.createHash("sha256").update(key).digest("hex");

    const apiKeyDAL = new ApiKeyDAL(request.server.db);
    const apiKey = await apiKeyDAL.getByHash(keyHash);

    if (!apiKey) {
      return null;
    }

    // Check if key is expired
    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
      return null;
    }

    // Update last used timestamp (async, don't wait)
    apiKeyDAL.updateLastUsed(apiKey.id).catch(() => {});

    // Get user info from database (we'll need to implement this)
    // For now, return basic context
    return {
      userId: apiKey.userId,
      userName: `user_${apiKey.userId}`,
      tier: "free", // We'll get this from user table in future
      role: "user",
      authMethod: "apikey",
    };
  } catch (error) {
    return null;
  }
}

/**
 * Validate ADMIN_SECRET (Phase 1 backward compatibility)
 */
function validateAdminSecret(token: string): UserContext | null {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return null;
  }

  if (token === adminSecret) {
    return {
      userId: "usr_admin_legacy",
      userName: "Admin",
      tier: "legendary",
      role: "admin",
      authMethod: "admin_secret",
    };
  }

  return null;
}

// ─── Authentication Middleware ────────────────────────────────────────────────

/**
 * Optional authentication middleware
 * Extracts user info if present, but doesn't require it
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return; // No auth provided, continue without user context
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return; // Invalid format, continue without user context
  }

  // Try validation in order: JWT -> API Key -> ADMIN_SECRET
  let userContext: UserContext | null = null;

  // Try JWT first
  userContext = await validateJWT(token);
  if (userContext) {
    request.user = userContext;
    return;
  }

  // Try API key
  userContext = await validateApiKey(request, token);
  if (userContext) {
    request.user = userContext;
    return;
  }

  // Try ADMIN_SECRET (backward compatibility)
  userContext = validateAdminSecret(token);
  if (userContext) {
    request.user = userContext;
    return;
  }

  // No valid authentication, continue without user context
}

/**
 * Required authentication middleware
 * Validates JWT, API key, or ADMIN_SECRET (backward compatibility)
 * @param scopes Optional scopes to check (for API keys)
 */
export function requireAuth(scopes?: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Missing Authorization header",
      });
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid Authorization header format. Expected: Bearer <token>",
      });
    }

    // Try validation in order: JWT -> API Key -> ADMIN_SECRET
    let userContext: UserContext | null = null;

    // Try JWT first
    userContext = await validateJWT(token);
    if (userContext) {
      request.user = userContext;
      return;
    }

    // Try API key
    userContext = await validateApiKey(request, token);
    if (userContext) {
      // Check scopes if required
      if (scopes && scopes.length > 0) {
        // For now, API key scope checking is not fully implemented
        // We'll add this when we have the full API key system
      }
      request.user = userContext;
      return;
    }

    // Try ADMIN_SECRET (backward compatibility)
    userContext = validateAdminSecret(token);
    if (userContext) {
      // Log deprecation warning
      request.log.warn(
        "ADMIN_SECRET authentication is deprecated. Please migrate to JWT or API keys.",
      );
      request.user = userContext;
      return;
    }

    // No valid authentication found
    return reply.status(403).send({
      error: "Forbidden",
      message: "Invalid credentials",
    });
  };
}
