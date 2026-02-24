/**
 * YigYaps Skill Mint Types — Limited Edition Economy
 *
 * Defines the "Limited Edition" minting model for YigYaps:
 * - Rarity tiers: common, rare, epic, legendary
 * - Graduation certificate integration (quality gate)
 * - Creator royalty tracking
 *
 * License: Apache 2.0
 */

/**
 * Rarity tier for limited edition skill mints.
 * Higher rarity = lower max editions = higher collector value.
 */
export type RarityTier = "common" | "rare" | "epic" | "legendary";

/**
 * A mint record for a limited edition skill package.
 *
 * Rare and above tiers require a GraduationCertificate (quality gate)
 * issued by Yigstudio Lab or equivalent quality assurance system.
 */
export interface SkillMint {
  id: string;
  skillPackageId: string;
  rarity: RarityTier;
  /** NULL = unlimited editions */
  maxEditions: number | null;
  mintedCount: number;
  creatorId: string;
  /** Creator royalty percentage (default 70.00) */
  creatorRoyaltyPercent: string;
  /**
   * Graduation certificate (JSON) — required for Rare+ tiers.
   * Must be issued by an approved quality-assurance system
   * (e.g., Yigstudio Lab, or third-party equivalent).
   */
  graduationCertificate: unknown | null;
  origin: "manual" | "extracted" | "beta-lab" | "community";
  createdAt: number;
  updatedAt: number;
}

/**
 * Royalty ledger entry — immutable record of a premium skill installation.
 *
 * Each premium installation creates one entry.
 * The ledger is append-only for audit integrity.
 */
export interface RoyaltyLedgerEntry {
  id: string;
  skillPackageId: string;
  creatorId: string;
  buyerId: string;
  installationId: string;
  /** Full sale price paid by buyer (USD) */
  grossAmountUsd: string;
  /** Creator share = grossAmountUsd × (royaltyPercent / 100) */
  royaltyAmountUsd: string;
  /** Royalty split percentage */
  royaltyPercent: string;
  createdAt: number;
}
