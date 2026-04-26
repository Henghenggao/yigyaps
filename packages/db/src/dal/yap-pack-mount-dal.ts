/**
 * YAP Pack Mount Data Access Layer
 *
 * Mounts connect a YAP assembly slot to an extension Skill Pack version.
 *
 * License: Apache 2.0
 */

import { and, asc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema/index.js";
import {
  skillPacksTable,
  yapPackMountsTable,
} from "../schema/skill-packs.js";
import type {
  SkillPackRow,
  YapPackMountInsert,
  YapPackMountRow,
} from "../schema/skill-packs.js";
import { dbOperation } from "./error-utils.js";

export interface YapPackMountListParams {
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

export interface YapPackMountListResult {
  mounts: Array<{ mount: YapPackMountRow; skillPack: SkillPackRow }>;
  total: number;
}

export class YapPackMountDAL {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async create(mount: YapPackMountInsert): Promise<YapPackMountRow> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .insert(yapPackMountsTable)
          .values(mount)
          .returning();
        return rows[0];
      },
      { method: "create", entity: "yapPackMount", id: mount.id },
    );
  }

  async getById(id: string): Promise<YapPackMountRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(yapPackMountsTable)
          .where(eq(yapPackMountsTable.id, id))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getById", entity: "yapPackMount", id },
    );
  }

  async getByMountKey(
    yapId: string,
    mountKey: string,
  ): Promise<YapPackMountRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(yapPackMountsTable)
          .where(
            and(
              eq(yapPackMountsTable.yapId, yapId),
              eq(yapPackMountsTable.mountKey, mountKey),
            ),
          )
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getByMountKey", entity: "yapPackMount", id: mountKey },
    );
  }

  async listByYap(
    yapId: string,
    params: YapPackMountListParams = {},
  ): Promise<YapPackMountListResult> {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;
    return dbOperation(
      async () => {
        const whereClause =
          params.enabled === undefined
            ? eq(yapPackMountsTable.yapId, yapId)
            : and(
                eq(yapPackMountsTable.yapId, yapId),
                eq(yapPackMountsTable.enabled, params.enabled),
              );

        const mounts = await this.db
          .select({
            mount: yapPackMountsTable,
            skillPack: skillPacksTable,
          })
          .from(yapPackMountsTable)
          .innerJoin(
            skillPacksTable,
            eq(yapPackMountsTable.skillPackId, skillPacksTable.id),
          )
          .where(whereClause)
          .orderBy(
            asc(yapPackMountsTable.priority),
            asc(yapPackMountsTable.mountKey),
          )
          .limit(limit)
          .offset(offset);

        const countRows = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(yapPackMountsTable)
          .where(whereClause);

        return { mounts, total: countRows[0]?.count ?? 0 };
      },
      { method: "listByYap", entity: "yapPackMount", id: yapId },
    );
  }

  async update(
    id: string,
    data: Partial<YapPackMountInsert>,
  ): Promise<YapPackMountRow | null> {
    return dbOperation(
      async () => {
        const patch = Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined),
        ) as Partial<YapPackMountInsert>;
        const rows = await this.db
          .update(yapPackMountsTable)
          .set({ ...patch, updatedAt: Date.now() })
          .where(eq(yapPackMountsTable.id, id))
          .returning();
        return rows[0] ?? null;
      },
      { method: "update", entity: "yapPackMount", id },
    );
  }

  async delete(id: string): Promise<boolean> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .delete(yapPackMountsTable)
          .where(eq(yapPackMountsTable.id, id))
          .returning({ id: yapPackMountsTable.id });
        return rows.length > 0;
      },
      { method: "delete", entity: "yapPackMount", id },
    );
  }
}
