/**
 * @yigyaps/types — Public API
 *
 * All shared TypeScript types for the YigYaps open skill marketplace.
 *
 * License: Apache 2.0
 */

export type {
  SkillPackageLicense,
  SkillPackageCategory,
  SkillPackageMaturity,
  SkillPackage,
  SkillPackageInstallation,
  SkillPackageReview,
  SkillPackageSearchQuery,
  SkillPackageSearchResult,
} from "./skill-package.js";

export type {
  RarityTier,
  SkillMint,
  RoyaltyLedgerEntry,
} from "./skill-mint.js";

export type {
  McpRegistryEntry,
  McpRegistryDiscovery,
  ApiListResponse,
  ApiErrorResponse,
  PublishSkillRequest,
} from "./registry.js";

export type {
  SkillDimensionScore,
  SkillEvaluationDetails,
  SkillInvokeMode,
  SkillInvokeResult,
} from "./invoke.js";
