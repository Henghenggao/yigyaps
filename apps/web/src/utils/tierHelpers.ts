/**
 * Tier Helper Functions
 *
 * Utilities for user tier checking and tier name formatting.
 *
 * License: Apache 2.0
 */

/**
 * Tier rank mapping for comparison.
 * Higher rank = higher privilege level.
 */
export const TIER_RANK: Record<string, number> = {
  free: 0,
  pro: 1,
  epic: 2,
  legendary: 3,
};

/**
 * Convert numeric tier to display name.
 * @param tier - Numeric tier value (0-3)
 * @returns Human-readable tier name
 */
export function getTierName(tier: number): string {
  const tierMap: Record<number, string> = {
    0: "Free",
    1: "Pro",
    2: "Epic",
    3: "Legendary",
  };
  return tierMap[tier] || "Unknown";
}

/**
 * Check if user's tier meets the required tier level.
 * @param userTier - User's tier string (e.g., 'free', 'pro')
 * @param requiredTier - Required numeric tier (0-3)
 * @returns True if user can access, false otherwise
 */
export function canAccessTier(userTier: string, requiredTier: number): boolean {
  const userRank = TIER_RANK[userTier.toLowerCase()];
  if (userRank === undefined) {
    return false; // Unknown tier = no access
  }
  return userRank >= requiredTier;
}
