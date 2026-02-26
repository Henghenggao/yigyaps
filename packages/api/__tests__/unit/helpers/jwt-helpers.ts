/**
 * JWT Testing Helpers
 *
 * Utilities for generating test JWT tokens with various user profiles.
 * Used across authentication and API integration tests.
 *
 * License: Apache 2.0
 */

import { signJWT, type JWTPayload } from "../../../src/lib/jwt.js";

// ─── Test JWT Generation ──────────────────────────────────────────────────────

/**
 * Create a test JWT token with custom user claims
 * @param overrides Partial user claims to override defaults
 * @returns Signed JWT token
 */
export function createTestJWT(
  overrides: Partial<Omit<JWTPayload, "iat" | "exp">> = {},
): string {
  return signJWT({
    userId: overrides.userId || "usr_test_123",
    userName: overrides.userName || "Test User",
    githubUsername: overrides.githubUsername || "testuser",
    tier: overrides.tier || "free",
    role: overrides.role || "user",
  });
}

/**
 * Create a JWT token for an admin user
 * @returns Signed JWT token with admin role
 */
export function createAdminJWT(): string {
  return signJWT({
    userId: "usr_admin_001",
    userName: "Admin User",
    githubUsername: "admin",
    tier: "legendary",
    role: "admin",
  });
}

/**
 * Create a JWT token for a free tier user
 * @returns Signed JWT token with free tier
 */
export function createFreeTierJWT(userId?: string): string {
  return signJWT({
    userId: userId || "usr_free_001",
    userName: "Free User",
    githubUsername: "freeuser",
    tier: "free",
    role: "user",
  });
}

/**
 * Create a JWT token for a pro tier user
 * @returns Signed JWT token with pro tier
 */
export function createProTierJWT(userId?: string): string {
  return signJWT({
    userId: userId || "usr_pro_001",
    userName: "Pro User",
    githubUsername: "prouser",
    tier: "pro",
    role: "user",
  });
}

/**
 * Create a JWT token for an epic tier user
 * @returns Signed JWT token with epic tier
 */
export function createEpicTierJWT(userId?: string): string {
  return signJWT({
    userId: userId || "usr_epic_001",
    userName: "Epic User",
    githubUsername: "epicuser",
    tier: "epic",
    role: "user",
  });
}

/**
 * Create a JWT token for a legendary tier user
 * @returns Signed JWT token with legendary tier
 */
export function createLegendaryTierJWT(userId?: string): string {
  return signJWT({
    userId: userId || "usr_legendary_001",
    userName: "Legendary User",
    githubUsername: "legendaryuser",
    tier: "legendary",
    role: "user",
  });
}

/**
 * Create an expired JWT token for testing expiration handling
 * @returns Signed JWT token that is already expired
 */
export function createExpiredJWT(): string {
  return signJWT(
    {
      userId: "usr_expired_001",
      userName: "Expired User",
      githubUsername: "expireduser",
      tier: "free",
      role: "user",
    },
    "0s", // Expires immediately
  );
}
