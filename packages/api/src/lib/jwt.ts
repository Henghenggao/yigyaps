/**
 * YigYaps JWT Utilities
 *
 * JWT token generation and validation for user authentication.
 * Part of Phase 2 authentication system.
 *
 * License: Apache 2.0
 */

import jwt from "jsonwebtoken";
import { env } from "./env.js";

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JWTPayload {
  userId: string;
  userName: string;
  githubUsername: string;
  tier: "free" | "pro" | "epic" | "legendary";
  role: "user" | "admin";
  iat?: number; // Issued at
  exp?: number; // Expiration
}

// ─── JWT Functions ────────────────────────────────────────────────────────────

/**
 * Sign a JWT token with user claims
 * @param payload User claims to include in token
 * @param expiresIn Token expiration (default: 7 days)
 * @returns Signed JWT token
 */
export function signJWT(
  payload: Omit<JWTPayload, "iat" | "exp">,
  expiresIn: string | number = "7d",
): string {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not configured");
  }

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as string,
    issuer: "yigyaps-api",
    audience: "yigyaps-clients",
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 * @param token JWT token to verify
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export function verifyJWT(token: string): JWTPayload {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not configured");
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: "yigyaps-api",
      audience: "yigyaps-clients",
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token has expired", { cause: error });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token", { cause: error });
    }
    throw error;
  }
}

/**
 * Decode a JWT token without verification (for debugging/inspection)
 * @param token JWT token to decode
 * @returns Decoded payload or null if invalid
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
