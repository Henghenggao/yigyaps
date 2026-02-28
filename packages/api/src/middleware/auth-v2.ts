/**
 * YigYaps Authentication Middleware (Phase 2)
 *
 * Validates JWT tokens and API keys.
 * Attaches user information to request.user.
 *
 * License: Apache 2.0
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyJWT } from "../lib/jwt.js";
import { ApiKeyDAL, UserDAL } from "@yigyaps/db";
import crypto from "crypto";
import { AUTH_COOKIE_NAME } from "../lib/constants.js";

// ─── User Context ─────────────────────────────────────────────────────────────

export interface UserContext {
  userId: string;
  userName: string;
  githubUsername?: string;
  tier: "free" | "pro" | "epic" | "legendary";
  role: "user" | "admin";
  authMethod: "jwt" | "apikey";
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
  } catch {
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
    apiKeyDAL.updateLastUsed(apiKey.id).catch((err: unknown) => {
      request.log.debug({ err }, "Failed to update API key last-used timestamp");
    });

    // Get user info from database
    const userDAL = new UserDAL(request.server.db);
    const user = await userDAL.getById(apiKey.userId);

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      userName: user.displayName,
      tier: user.tier as "free" | "pro" | "epic" | "legendary",
      role: user.role as "user" | "admin",
      authMethod: "apikey",
    };
  } catch {
    return null;
  }
}

// ─── Authentication Middleware ────────────────────────────────────────────────

/**
 * Optional authentication middleware
 * Extracts user info if present, but doesn't require it
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  let tokenToValidate: string | undefined;

  const authHeader = request.headers.authorization;
  if (authHeader) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme === "Bearer" && token) {
      tokenToValidate = token;
    }
  }

  if (!tokenToValidate && request.cookies?.[AUTH_COOKIE_NAME]) {
    tokenToValidate = request.cookies[AUTH_COOKIE_NAME];
  }

  if (!tokenToValidate) {
    return; // No valid auth format found, continue without user context
  }

  // Try validation in order: JWT -> API Key
  let userContext: UserContext | null;
  const token = tokenToValidate;

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

  // No valid authentication, continue without user context
}

/**
 * Required authentication middleware
 * Validates JWT or API key
 * @param scopes Optional scopes to check (for API keys)
 */
export function requireAuth(scopes?: string[]) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    let tokenToValidate: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [scheme, token] = authHeader.split(" ");
      if (scheme === "Bearer" && token) {
        tokenToValidate = token;
      }
    }

    if (!tokenToValidate && request.cookies?.[AUTH_COOKIE_NAME]) {
      tokenToValidate = request.cookies[AUTH_COOKIE_NAME];
    }

    if (!tokenToValidate) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Missing or invalid authentication token",
      });
    }

    // Try validation in order: JWT -> API Key
    let userContext: UserContext | null;
    const token = tokenToValidate;

    // Try JWT first
    userContext = await validateJWT(token);
    if (!userContext) {
      // Try API key
      userContext = await validateApiKey(request, token);
    }

    if (!userContext) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Invalid credentials",
      });
    }

    // Check scopes (role verification)
    if (scopes && scopes.includes("admin") && userContext.role !== "admin") {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Requires admin privileges",
      });
    }

    // For API keys specifically, other scope checks could go here in future

    request.user = userContext;
    return;
  };
}
