/**
 * YigYaps Skill Package Data Access Layer
 *
 * CRUD operations for the YigYaps marketplace registry:
 * packages, installations, reviews, mints, and royalty ledger.
 *
 * License: Apache 2.0
 */

import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  skillPackagesTable,
  skillPackageInstallationsTable,
  skillPackageReviewsTable,
  skillMintsTable,
  royaltyLedgerTable,
} from "../schema/skill-packages.js";
import type {
  SkillPackageRow,
  SkillPackageInsert,
  SkillPackageInstallationRow,
  SkillPackageInstallationInsert,
  SkillPackageReviewRow,
  SkillPackageReviewInsert,
  SkillMintRow,
  SkillMintInsert,
  RoyaltyLedgerRow,
  RoyaltyLedgerInsert,
} from "../schema/skill-packages.js";
import { dbOperation } from "./error-utils.js";
import type {
  SkillPackageCategory,
  SkillPackageLicense,
  SkillPackageMaturity,
} from "@yigyaps/types";

// ─── Search Query ─────────────────────────────────────────────────────────────

export interface SkillPackageSearchParams {
  query?: string;
  category?: SkillPackageCategory;
  license?: SkillPackageLicense;
  maturity?: SkillPackageMaturity;
  tags?: string[];
  minRating?: number;
  maxPriceUsd?: number;
  sortBy?: "relevance" | "popularity" | "rating" | "recent" | "name";
  limit?: number;
  offset?: number;
}

export interface SkillPackageSearchResult {
  packages: SkillPackageRow[];
  total: number;
}

// ─── Skill Package DAL ────────────────────────────────────────────────────────

export class SkillPackageDAL {
  constructor(private db: NodePgDatabase) {}

  async create(pkg: SkillPackageInsert): Promise<SkillPackageRow> {
    return dbOperation(
      async () => {
        const results = await this.db
          .insert(skillPackagesTable)
          .values(pkg)
          .returning();
        return results[0];
      },
      { method: "create", entity: "skillPackage", id: pkg.id },
    );
  }

  async getById(id: string): Promise<SkillPackageRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(skillPackagesTable)
          .where(eq(skillPackagesTable.id, id))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getById", entity: "skillPackage", id },
    );
  }

  async getByPackageId(packageId: string): Promise<SkillPackageRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(skillPackagesTable)
          .where(eq(skillPackagesTable.packageId, packageId))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getByPackageId", entity: "skillPackage", id: packageId },
    );
  }

  async search(
    params: SkillPackageSearchParams,
  ): Promise<SkillPackageSearchResult> {
    return dbOperation(
      async () => {
        const limit = Math.min(params.limit ?? 20, 100);
        const offset = params.offset ?? 0;

        const conditions = [];

        if (params.query) {
          conditions.push(
            or(
              ilike(skillPackagesTable.displayName, `%${params.query}%`),
              ilike(skillPackagesTable.description, `%${params.query}%`),
              sql`${params.query} = ANY(${skillPackagesTable.tags})`,
            ),
          );
        }

        if (params.category) {
          conditions.push(eq(skillPackagesTable.category, params.category));
        }

        if (params.license) {
          conditions.push(eq(skillPackagesTable.license, params.license));
        }

        if (params.maturity) {
          conditions.push(eq(skillPackagesTable.maturity, params.maturity));
        }

        if (params.minRating !== undefined) {
          conditions.push(
            sql`CAST(${skillPackagesTable.rating} AS NUMERIC) >= ${params.minRating}`,
          );
        }

        if (params.maxPriceUsd !== undefined) {
          conditions.push(
            sql`CAST(${skillPackagesTable.priceUsd} AS NUMERIC) <= ${params.maxPriceUsd}`,
          );
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const orderBy = (() => {
          switch (params.sortBy) {
            case "popularity":
              return desc(skillPackagesTable.installCount);
            case "rating":
              return desc(skillPackagesTable.rating);
            case "recent":
              return desc(skillPackagesTable.releasedAt);
            case "name":
              return skillPackagesTable.displayName;
            default:
              return desc(skillPackagesTable.installCount);
          }
        })();

        const [packages, countResult] = await Promise.all([
          this.db
            .select()
            .from(skillPackagesTable)
            .where(where)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset),
          this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(skillPackagesTable)
            .where(where),
        ]);

        return { packages, total: countResult[0]?.count ?? 0 };
      },
      { method: "search", entity: "skillPackage" },
    );
  }

  async update(
    id: string,
    data: Partial<SkillPackageInsert>,
  ): Promise<SkillPackageRow | null> {
    return dbOperation(
      async () => {
        const results = await this.db
          .update(skillPackagesTable)
          .set({ ...data, updatedAt: Date.now() })
          .where(eq(skillPackagesTable.id, id))
          .returning();
        return results[0] ?? null;
      },
      { method: "update", entity: "skillPackage", id },
    );
  }

  async incrementInstallCount(id: string): Promise<void> {
    return dbOperation(
      async () => {
        await this.db
          .update(skillPackagesTable)
          .set({
            installCount: sql`${skillPackagesTable.installCount} + 1`,
            updatedAt: Date.now(),
          })
          .where(eq(skillPackagesTable.id, id));
      },
      { method: "incrementInstallCount", entity: "skillPackage", id },
    );
  }

  async updateRatingStats(
    id: string,
    rating: number,
    ratingCount: number,
    reviewCount: number,
  ): Promise<void> {
    return dbOperation(
      async () => {
        await this.db
          .update(skillPackagesTable)
          .set({
            rating: String(rating),
            ratingCount,
            reviewCount,
            updatedAt: Date.now(),
          })
          .where(eq(skillPackagesTable.id, id));
      },
      { method: "updateRatingStats", entity: "skillPackage", id },
    );
  }

  async getByAuthor(author: string): Promise<SkillPackageRow[]> {
    return dbOperation(
      async () =>
        this.db
          .select()
          .from(skillPackagesTable)
          .where(eq(skillPackagesTable.author, author))
          .orderBy(desc(skillPackagesTable.updatedAt)),
      { method: "getByAuthor", entity: "skillPackage", id: author },
    );
  }
}

// ─── Skill Installation DAL ───────────────────────────────────────────────────

export class SkillInstallationDAL {
  constructor(private db: NodePgDatabase) {}

  async install(
    data: SkillPackageInstallationInsert,
  ): Promise<SkillPackageInstallationRow> {
    return dbOperation(
      async () => {
        const results = await this.db
          .insert(skillPackageInstallationsTable)
          .values(data)
          .returning();
        return results[0];
      },
      { method: "install", entity: "skillInstallation", id: data.id },
    );
  }

  async getById(
    id: string,
  ): Promise<SkillPackageInstallationRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(skillPackageInstallationsTable)
          .where(eq(skillPackageInstallationsTable.id, id))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getById", entity: "skillInstallation", id },
    );
  }

  async getByYigbot(
    yigbotId: string,
  ): Promise<SkillPackageInstallationRow[]> {
    return dbOperation(
      async () =>
        this.db
          .select()
          .from(skillPackageInstallationsTable)
          .where(
            and(
              eq(skillPackageInstallationsTable.yigbotId, yigbotId),
              eq(skillPackageInstallationsTable.status, "active"),
            ),
          ),
      { method: "getByYigbot", entity: "skillInstallation", id: yigbotId },
    );
  }

  async getByUser(userId: string): Promise<SkillPackageInstallationRow[]> {
    return dbOperation(
      async () =>
        this.db
          .select()
          .from(skillPackageInstallationsTable)
          .where(eq(skillPackageInstallationsTable.userId, userId)),
      { method: "getByUser", entity: "skillInstallation", id: userId },
    );
  }

  async updateStatus(
    id: string,
    status: "installing" | "active" | "failed" | "uninstalled",
    errorMessage?: string,
  ): Promise<void> {
    return dbOperation(
      async () => {
        const set: Partial<SkillPackageInstallationInsert> = { status };
        if (errorMessage) set.errorMessage = errorMessage;
        if (status === "uninstalled") set.uninstalledAt = Date.now();
        await this.db
          .update(skillPackageInstallationsTable)
          .set(set)
          .where(eq(skillPackageInstallationsTable.id, id));
      },
      { method: "updateStatus", entity: "skillInstallation", id },
    );
  }

  async hasInstallation(
    userId: string,
    packageId: string,
  ): Promise<boolean> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select({ id: skillPackageInstallationsTable.id })
          .from(skillPackageInstallationsTable)
          .where(
            and(
              eq(skillPackageInstallationsTable.userId, userId),
              eq(skillPackageInstallationsTable.packageId, packageId),
              eq(skillPackageInstallationsTable.status, "active"),
            ),
          )
          .limit(1);
        return rows.length > 0;
      },
      { method: "hasInstallation", entity: "skillInstallation", id: userId },
    );
  }
}

// ─── Skill Review DAL ─────────────────────────────────────────────────────────

export class SkillReviewDAL {
  constructor(private db: NodePgDatabase) {}

  async create(
    review: SkillPackageReviewInsert,
  ): Promise<SkillPackageReviewRow> {
    return dbOperation(
      async () => {
        const results = await this.db
          .insert(skillPackageReviewsTable)
          .values(review)
          .returning();
        return results[0];
      },
      { method: "create", entity: "skillReview", id: review.id },
    );
  }

  async getByPackage(
    packageId: string,
    limit = 20,
    offset = 0,
  ): Promise<SkillPackageReviewRow[]> {
    return dbOperation(
      async () =>
        this.db
          .select()
          .from(skillPackageReviewsTable)
          .where(eq(skillPackageReviewsTable.packageId, packageId))
          .orderBy(desc(skillPackageReviewsTable.createdAt))
          .limit(limit)
          .offset(offset),
      { method: "getByPackage", entity: "skillReview", id: packageId },
    );
  }

  async calculateAverageRating(
    packageId: string,
  ): Promise<{ avgRating: number; count: number }> {
    return dbOperation(
      async () => {
        const result = await this.db
          .select({
            avgRating:
              sql<number>`COALESCE(AVG(${skillPackageReviewsTable.rating}), 0)::numeric(3,2)`,
            count: sql<number>`count(*)::int`,
          })
          .from(skillPackageReviewsTable)
          .where(eq(skillPackageReviewsTable.packageId, packageId));
        return {
          avgRating: Number(result[0]?.avgRating ?? 0),
          count: result[0]?.count ?? 0,
        };
      },
      {
        method: "calculateAverageRating",
        entity: "skillReview",
        id: packageId,
      },
    );
  }
}

// ─── Skill Mint DAL ───────────────────────────────────────────────────────────

export class SkillMintDAL {
  constructor(private db: NodePgDatabase) {}

  async create(mint: SkillMintInsert): Promise<SkillMintRow> {
    return dbOperation(
      async () => {
        const results = await this.db
          .insert(skillMintsTable)
          .values(mint)
          .returning();
        return results[0];
      },
      { method: "create", entity: "skillMint", id: mint.id },
    );
  }

  async getBySkillPackageId(
    skillPackageId: string,
  ): Promise<SkillMintRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(skillMintsTable)
          .where(eq(skillMintsTable.skillPackageId, skillPackageId))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getBySkillPackageId", entity: "skillMint", id: skillPackageId },
    );
  }

  async checkEditionLimit(skillPackageId: string): Promise<boolean> {
    return dbOperation(
      async () => {
        const mint = await this.getBySkillPackageId(skillPackageId);
        if (!mint) return false;
        if (mint.maxEditions === null) return true;
        return mint.mintedCount < mint.maxEditions;
      },
      { method: "checkEditionLimit", entity: "skillMint", id: skillPackageId },
    );
  }

  async incrementMintedCount(skillPackageId: string): Promise<void> {
    return dbOperation(
      async () => {
        await this.db
          .update(skillMintsTable)
          .set({
            mintedCount: sql`${skillMintsTable.mintedCount} + 1`,
            updatedAt: Date.now(),
          })
          .where(eq(skillMintsTable.skillPackageId, skillPackageId));
      },
      {
        method: "incrementMintedCount",
        entity: "skillMint",
        id: skillPackageId,
      },
    );
  }

  async getByCreator(creatorId: string): Promise<SkillMintRow[]> {
    return dbOperation(
      async () =>
        this.db
          .select()
          .from(skillMintsTable)
          .where(eq(skillMintsTable.creatorId, creatorId))
          .orderBy(desc(skillMintsTable.createdAt)),
      { method: "getByCreator", entity: "skillMint", id: creatorId },
    );
  }
}

// ─── Royalty Ledger DAL ───────────────────────────────────────────────────────

export class RoyaltyLedgerDAL {
  constructor(private db: NodePgDatabase) {}

  async create(entry: RoyaltyLedgerInsert): Promise<RoyaltyLedgerRow> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .insert(royaltyLedgerTable)
          .values(entry)
          .returning();
        return rows[0];
      },
      { method: "create", entity: "royaltyLedger", id: entry.id },
    );
  }

  async getByCreator(
    creatorId: string,
    limit = 50,
  ): Promise<RoyaltyLedgerRow[]> {
    return dbOperation(
      async () =>
        this.db
          .select()
          .from(royaltyLedgerTable)
          .where(eq(royaltyLedgerTable.creatorId, creatorId))
          .orderBy(desc(royaltyLedgerTable.createdAt))
          .limit(limit),
      { method: "getByCreator", entity: "royaltyLedger", id: creatorId },
    );
  }

  async getTotalEarnings(
    creatorId: string,
  ): Promise<{ totalUsd: string; count: number }> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select({
            totalUsd: sql<string>`COALESCE(SUM(${royaltyLedgerTable.royaltyAmountUsd}), '0')::text`,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(royaltyLedgerTable)
          .where(eq(royaltyLedgerTable.creatorId, creatorId));
        return rows[0] ?? { totalUsd: "0.0000", count: 0 };
      },
      { method: "getTotalEarnings", entity: "royaltyLedger", id: creatorId },
    );
  }
}
