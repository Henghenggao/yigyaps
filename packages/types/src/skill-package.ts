/**
 * YigYaps Skill Package Types
 *
 * Core types for the open YAP skill marketplace registry.
 * These types define the shape of skill packages, installations,
 * and reviews stored in the YigYaps registry.
 *
 * License: Apache 2.0
 * @see https://github.com/Henghenggao/yigyaps
 */

/**
 * Skill package license type.
 * - 'open-source': Free, MIT/Apache/BSD licensed
 * - 'free': Free but proprietary (no source access)
 * - 'premium': Requires payment per installation
 * - 'enterprise': Requires enterprise subscription
 */
export type SkillPackageLicense =
  | "open-source"
  | "free"
  | "premium"
  | "enterprise";

/**
 * Skill package category for marketplace organization.
 */
export type SkillPackageCategory =
  | "development"
  | "communication"
  | "productivity"
  | "research"
  | "integration"
  | "data"
  | "automation"
  | "security"
  | "ai-ml"
  | "other";

/**
 * Skill package maturity level.
 * - 'experimental': Early development, unstable API
 * - 'beta': Feature-complete, seeking feedback
 * - 'stable': Production-ready, stable API
 * - 'deprecated': No longer recommended, use alternatives
 */
export type SkillPackageMaturity =
  | "experimental"
  | "beta"
  | "stable"
  | "deprecated";

/**
 * SkillPackage — A distributable MCP skill with marketplace metadata.
 *
 * A SkillPackage wraps:
 * 1. MCP server binary/script
 * 2. Tool schemas (from SkillMetadata)
 * 3. Documentation and examples
 * 4. Dependency requirements
 * 5. Marketplace metadata (description, tags, pricing)
 */
export interface SkillPackage {
  /** Unique package identifier (e.g., "skill-github") */
  packageId: string;
  /** Semver for package version (e.g., "1.2.0") */
  version: string;
  /** Display name for marketplace (e.g., "GitHub Integration") */
  displayName: string;
  /** Short description (100-200 chars) */
  description: string;
  /** Long description with usage instructions (markdown, 500-2000 chars) */
  readme: string | null;
  /** Publisher user ID or organization ID */
  author: string;
  /** Publisher display name */
  authorName: string;
  /** Publisher website/GitHub URL */
  authorUrl?: string;
  /** License type */
  license: SkillPackageLicense;
  /** Price per installation (USD, 0 for free packages) */
  priceUsd: number;
  /** Whether this package requires an external API key */
  requiresApiKey: boolean;
  /** API key instructions (if requiresApiKey = true) */
  apiKeyInstructions?: string;
  /** Primary category */
  category: SkillPackageCategory;
  /** Maturity level */
  maturity: SkillPackageMaturity;
  /** Search tags */
  tags: string[];
  /** Minimum runtime version required (semver) */
  minRuntimeVersion: string;
  /** Execution tier required (0-3) */
  requiredTier: number;
  /** MCP server transport type */
  mcpTransport: "stdio" | "http" | "sse";
  /** MCP server command to execute (for stdio transport) */
  mcpCommand?: string;
  /** MCP server URL (for http/sse transports) */
  mcpUrl?: string;
  /** System dependencies required */
  systemDependencies?: string[];
  /** npm/pip dependencies */
  packageDependencies?: string[];
  /** Total number of installations */
  installCount: number;
  /** Average rating (0-5) */
  rating: number;
  /** Number of ratings */
  ratingCount: number;
  /** Number of reviews with text */
  reviewCount: number;
  /** Origin of the package */
  origin: "manual" | "extracted" | "beta-lab" | "community";
  /** Icon URL or emoji */
  icon?: string;
  /** Screenshot URLs for marketplace listing */
  screenshots?: string[];
  /** GitHub repository URL */
  repositoryUrl?: string;
  /** Homepage URL */
  homepageUrl?: string;
  /** Package first published timestamp (Unix ms) */
  createdAt: number;
  /** Package last updated timestamp (Unix ms) */
  updatedAt: number;
  /** Last version release timestamp (Unix ms) */
  releasedAt: number;
}

/**
 * SkillPackageInstallation — Record of a skill package installed for an agent.
 */
export interface SkillPackageInstallation {
  id: string;
  packageId: string;
  packageVersion: string;
  agentId: string;
  userId: string;
  status: "installing" | "active" | "failed" | "uninstalled";
  errorMessage?: string;
  installedAt: number;
  uninstalledAt?: number;
  enabled: boolean;
  configuration?: Record<string, unknown>;
}

/**
 * SkillPackageReview — User review for a skill package.
 */
export interface SkillPackageReview {
  id: string;
  packageId: string;
  packageVersion: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: number;
  updatedAt: number;
  verified: boolean;
  helpfulCount: number;
}

/**
 * SkillPackageSearchQuery — Search parameters for skill discovery.
 */
export interface SkillPackageSearchQuery {
  query?: string;
  category?: SkillPackageCategory;
  license?: SkillPackageLicense;
  maturity?: SkillPackageMaturity;
  tags?: string[];
  minRating?: number;
  maxPriceUsd?: number | null;
  sortBy?: "relevance" | "popularity" | "rating" | "recent" | "name";
  limit?: number;
  offset?: number;
}

/**
 * SkillPackageSearchResult — Paginated search results.
 */
export interface SkillPackageSearchResult {
  packages: SkillPackage[];
  total: number;
  limit: number;
  offset: number;
}
