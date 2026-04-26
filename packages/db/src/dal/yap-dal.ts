/**
 * YAP Data Access Layer
 *
 * CRUD and search operations for top-level YAP containers.
 *
 * License: Apache 2.0
 */

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema/index.js";
import { yapsTable } from "../schema/yaps.js";
import type { YapInsert, YapRow } from "../schema/yaps.js";
import { dbOperation } from "./error-utils.js";

export interface YapSearchParams {
  query?: string;
  category?: string;
  ownerId?: string;
  visibility?: "public" | "private" | "unlisted";
  status?: "draft" | "active" | "archived";
  limit?: number;
  offset?: number;
}

export interface YapSearchResult {
  yaps: YapRow[];
  total: number;
}

export class YapDAL {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async create(yap: YapInsert): Promise<YapRow> {
    return dbOperation(
      async () => {
        const rows = await this.db.insert(yapsTable).values(yap).returning();
        return rows[0];
      },
      { method: "create", entity: "yap", id: yap.id },
    );
  }

  async getById(id: string): Promise<YapRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(yapsTable)
          .where(eq(yapsTable.id, id))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getById", entity: "yap", id },
    );
  }

  async getBySlug(slug: string): Promise<YapRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(yapsTable)
          .where(eq(yapsTable.slug, slug))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getBySlug", entity: "yap", id: slug },
    );
  }

  async search(params: YapSearchParams): Promise<YapSearchResult> {
    return dbOperation(
      async () => {
        const limit = Math.min(params.limit ?? 20, 100);
        const offset = params.offset ?? 0;
        const conditions = [];

        if (params.query) {
          conditions.push(
            or(
              ilike(yapsTable.slug, `%${params.query}%`),
              ilike(yapsTable.displayName, `%${params.query}%`),
              ilike(yapsTable.description, `%${params.query}%`),
              sql`${params.query} = ANY(${yapsTable.tags})`,
            ),
          );
        }

        if (params.category) {
          conditions.push(eq(yapsTable.category, params.category));
        }

        if (params.ownerId) {
          conditions.push(eq(yapsTable.ownerId, params.ownerId));
        }

        if (params.visibility) {
          conditions.push(eq(yapsTable.visibility, params.visibility));
        }

        if (params.status) {
          conditions.push(eq(yapsTable.status, params.status));
        } else {
          conditions.push(eq(yapsTable.status, "active"));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const [yaps, countResult] = await Promise.all([
          this.db
            .select()
            .from(yapsTable)
            .where(where)
            .orderBy(desc(yapsTable.releasedAt))
            .limit(limit)
            .offset(offset),
          this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(yapsTable)
            .where(where),
        ]);

        return { yaps, total: countResult[0]?.count ?? 0 };
      },
      { method: "search", entity: "yap" },
    );
  }

  async update(id: string, data: Partial<YapInsert>): Promise<YapRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .update(yapsTable)
          .set({ ...data, updatedAt: Date.now() })
          .where(eq(yapsTable.id, id))
          .returning();
        return rows[0] ?? null;
      },
      { method: "update", entity: "yap", id },
    );
  }
}
