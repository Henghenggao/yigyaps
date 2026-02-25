/**
 * YigYaps Database Schema — Skill Packages Registry
 *
 * Drizzle ORM table definitions for the YigYaps marketplace.
 * Tables use the `yy_` prefix (YigYaps namespace, independent of specific platforms).
 *
 * License: Apache 2.0
 */

import {
  pgTable,
  text,
  bigint,
  integer,
  boolean,
  jsonb,
  numeric,
  index,
} from "drizzle-orm/pg-core";

// ─── Skill Packages Registry ──────────────────────────────────────────────────

export const skillPackagesTable = pgTable(
  "yy_skill_packages",
  {
    id: text("id").primaryKey(),
    packageId: text("package_id").notNull().unique(),
    version: text("version").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    readme: text("readme"),
    author: text("author").notNull(),
    authorName: text("author_name").notNull(),
    authorUrl: text("author_url"),
    license: text("license")
      .$type<"open-source" | "free" | "premium" | "enterprise">()
      .notNull()
      .default("open-source"),
    priceUsd: numeric("price_usd", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    requiresApiKey: boolean("requires_api_key").notNull().default(false),
    apiKeyInstructions: text("api_key_instructions"),
    category: text("category")
      .$type<
        | "development"
        | "communication"
        | "productivity"
        | "research"
        | "integration"
        | "data"
        | "automation"
        | "security"
        | "ai-ml"
        | "personality"
        | "wisdom"
        | "voice"
        | "likeness"
        | "other"
      >()
      .notNull()
      .default("other"),
    maturity: text("maturity")
      .$type<"experimental" | "beta" | "stable" | "deprecated">()
      .notNull()
      .default("experimental"),
    tags: text("tags").array().notNull().default([]),
    minRuntimeVersion: text("min_runtime_version").notNull().default("0.1.0"),
    requiredTier: integer("required_tier").notNull().default(0),
    mcpTransport: text("mcp_transport")
      .$type<"stdio" | "http" | "sse">()
      .notNull()
      .default("stdio"),
    mcpCommand: text("mcp_command"),
    mcpUrl: text("mcp_url"),
    systemDependencies: text("system_dependencies").array(),
    packageDependencies: text("package_dependencies").array(),
    installCount: integer("install_count").notNull().default(0),
    rating: numeric("rating", { precision: 3, scale: 2 })
      .notNull()
      .default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    origin: text("origin")
      .$type<"manual" | "extracted" | "beta-lab" | "community">()
      .notNull()
      .default("manual"),
    icon: text("icon"),
    repositoryUrl: text("repository_url"),
    homepageUrl: text("homepage_url"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    releasedAt: bigint("released_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_skill_packages_category").on(table.category),
    index("idx_yy_skill_packages_author").on(table.author),
    index("idx_yy_skill_packages_maturity").on(table.maturity),
    index("idx_yy_skill_packages_origin").on(table.origin),
  ],
);

export type SkillPackageRow = typeof skillPackagesTable.$inferSelect;
export type SkillPackageInsert = typeof skillPackagesTable.$inferInsert;

// ─── Skill Package Installations ──────────────────────────────────────────────

export const skillPackageInstallationsTable = pgTable(
  "yy_skill_package_installations",
  {
    id: text("id").primaryKey(),
    packageId: text("package_id")
      .notNull()
      .references(() => skillPackagesTable.id, { onDelete: "cascade" }),
    packageVersion: text("package_version").notNull(),
    agentId: text("agent_id").notNull(),
    userId: text("user_id").notNull(),
    status: text("status")
      .$type<"installing" | "active" | "failed" | "uninstalled">()
      .notNull()
      .default("installing"),
    enabled: boolean("enabled").notNull().default(true),
    configuration: jsonb("configuration").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    installedAt: bigint("installed_at", { mode: "number" }).notNull(),
    uninstalledAt: bigint("uninstalled_at", { mode: "number" }),
  },
  (table) => [
    index("idx_yy_installations_agent").on(table.agentId),
    index("idx_yy_installations_user").on(table.userId),
    index("idx_yy_installations_package").on(table.packageId),
  ],
);

export type SkillPackageInstallationRow =
  typeof skillPackageInstallationsTable.$inferSelect;
export type SkillPackageInstallationInsert =
  typeof skillPackageInstallationsTable.$inferInsert;

// ─── Skill Package Reviews ────────────────────────────────────────────────────

export const skillPackageReviewsTable = pgTable(
  "yy_skill_package_reviews",
  {
    id: text("id").primaryKey(),
    packageId: text("package_id")
      .notNull()
      .references(() => skillPackagesTable.id, { onDelete: "cascade" }),
    packageVersion: text("package_version").notNull(),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    rating: integer("rating").notNull(),
    title: text("title"),
    comment: text("comment"),
    verified: boolean("verified").notNull().default(false),
    helpfulCount: integer("helpful_count").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_reviews_package").on(table.packageId),
    index("idx_yy_reviews_user").on(table.userId),
  ],
);

export type SkillPackageReviewRow =
  typeof skillPackageReviewsTable.$inferSelect;
export type SkillPackageReviewInsert =
  typeof skillPackageReviewsTable.$inferInsert;

// ─── Skill Mints (Limited Editions) ───────────────────────────────────────────

export const skillMintsTable = pgTable(
  "yy_skill_mints",
  {
    id: text("id").primaryKey(),
    skillPackageId: text("skill_package_id")
      .notNull()
      .references(() => skillPackagesTable.id, { onDelete: "cascade" }),
    rarity: text("rarity")
      .$type<"common" | "rare" | "epic" | "legendary">()
      .notNull()
      .default("common"),
    maxEditions: integer("max_editions"),
    mintedCount: integer("minted_count").notNull().default(0),
    creatorId: text("creator_id").notNull(),
    creatorRoyaltyPercent: numeric("creator_royalty_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("70.00"),
    graduationCertificate: jsonb("graduation_certificate"),
    origin: text("origin")
      .$type<"manual" | "extracted" | "beta-lab" | "community">()
      .notNull()
      .default("manual"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_skill_mints_creator").on(table.creatorId),
    index("idx_yy_skill_mints_rarity").on(table.rarity),
  ],
);

export type SkillMintRow = typeof skillMintsTable.$inferSelect;
export type SkillMintInsert = typeof skillMintsTable.$inferInsert;

// ─── Royalty Ledger ───────────────────────────────────────────────────────────

export const royaltyLedgerTable = pgTable(
  "yy_royalty_ledger",
  {
    id: text("id").primaryKey(),
    skillPackageId: text("skill_package_id").notNull(),
    creatorId: text("creator_id").notNull(),
    buyerId: text("buyer_id").notNull(),
    installationId: text("installation_id").notNull(),
    grossAmountUsd: numeric("gross_amount_usd", {
      precision: 10,
      scale: 4,
    }).notNull(),
    royaltyAmountUsd: numeric("royalty_amount_usd", {
      precision: 10,
      scale: 4,
    }).notNull(),
    royaltyPercent: numeric("royalty_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("70.00"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_royalty_creator").on(table.creatorId),
    index("idx_yy_royalty_package").on(table.skillPackageId),
  ],
);

export type RoyaltyLedgerRow = typeof royaltyLedgerTable.$inferSelect;
export type RoyaltyLedgerInsert = typeof royaltyLedgerTable.$inferInsert;
