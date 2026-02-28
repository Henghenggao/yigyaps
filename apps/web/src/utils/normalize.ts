import type { SkillPackage } from "@yigyaps/types";

/**
 * Normalize numeric fields from PostgreSQL string representation to actual numbers.
 * PostgreSQL numeric/decimal types return strings in JS (e.g., "0.00" instead of 0).
 * This ensures .toFixed() and numeric comparisons work correctly.
 */
export function normalizePackage(
  pkg: Record<string, unknown>,
): SkillPackage {
  return {
    ...pkg,
    rating: Number(pkg.rating || 0),
    priceUsd: Number(pkg.priceUsd || 0),
    installCount: Number(pkg.installCount || 0),
  } as SkillPackage;
}
