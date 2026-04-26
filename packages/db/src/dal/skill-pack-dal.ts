/**
 * Skill Pack Data Access Layer
 *
 * Persists SkillPack Bridge metadata and artifacts under a YAP.
 *
 * License: Apache 2.0
 */

import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema/index.js";
import {
  skillPackArtifactsTable,
  skillPacksTable,
} from "../schema/skill-packs.js";
import type {
  SkillPackArtifactInsert,
  SkillPackArtifactRow,
  SkillPackInsert,
  SkillPackRow,
} from "../schema/skill-packs.js";
import { dbOperation } from "./error-utils.js";

export class SkillPackDAL {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async create(pack: SkillPackInsert): Promise<SkillPackRow> {
    return dbOperation(
      async () => {
        const rows = await this.db.insert(skillPacksTable).values(pack).returning();
        return rows[0];
      },
      { method: "create", entity: "skillPack", id: pack.id },
    );
  }

  async getById(id: string): Promise<SkillPackRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(skillPacksTable)
          .where(eq(skillPacksTable.id, id))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getById", entity: "skillPack", id },
    );
  }

  async getByNameVersion(
    yapId: string,
    name: string,
    version: string,
  ): Promise<SkillPackRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(skillPacksTable)
          .where(
            and(
              eq(skillPacksTable.yapId, yapId),
              eq(skillPacksTable.name, name),
              eq(skillPacksTable.version, version),
            ),
          )
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getByNameVersion", entity: "skillPack", id: `${name}@${version}` },
    );
  }

  async listByYap(yapId: string): Promise<SkillPackRow[]> {
    return dbOperation(
      async () =>
        this.db
          .select()
          .from(skillPacksTable)
          .where(eq(skillPacksTable.yapId, yapId))
          .orderBy(skillPacksTable.name, skillPacksTable.version),
      { method: "listByYap", entity: "skillPack", id: yapId },
    );
  }

  async update(
    id: string,
    data: Partial<SkillPackInsert>,
  ): Promise<SkillPackRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .update(skillPacksTable)
          .set({ ...data, updatedAt: Date.now() })
          .where(eq(skillPacksTable.id, id))
          .returning();
        return rows[0] ?? null;
      },
      { method: "update", entity: "skillPack", id },
    );
  }
}

export class SkillPackArtifactDAL {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async create(
    artifact: SkillPackArtifactInsert,
  ): Promise<SkillPackArtifactRow> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .insert(skillPackArtifactsTable)
          .values(artifact)
          .returning();
        return rows[0];
      },
      { method: "create", entity: "skillPackArtifact", id: artifact.id },
    );
  }

  async createMany(
    artifacts: SkillPackArtifactInsert[],
  ): Promise<SkillPackArtifactRow[]> {
    if (artifacts.length === 0) return [];
    return dbOperation(
      async () =>
        this.db.insert(skillPackArtifactsTable).values(artifacts).returning(),
      { method: "createMany", entity: "skillPackArtifact" },
    );
  }

  async getById(id: string): Promise<SkillPackArtifactRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(skillPackArtifactsTable)
          .where(eq(skillPackArtifactsTable.id, id))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getById", entity: "skillPackArtifact", id },
    );
  }

  async listBySkillPack(
    skillPackId: string,
    artifactType?: SkillPackArtifactRow["artifactType"],
  ): Promise<SkillPackArtifactRow[]> {
    return dbOperation(
      async () =>
        this.db
          .select()
          .from(skillPackArtifactsTable)
          .where(
            artifactType
              ? and(
                  eq(skillPackArtifactsTable.skillPackId, skillPackId),
                  eq(skillPackArtifactsTable.artifactType, artifactType),
                )
              : eq(skillPackArtifactsTable.skillPackId, skillPackId),
          )
          .orderBy(
            skillPackArtifactsTable.artifactType,
            skillPackArtifactsTable.artifactPath,
          ),
      { method: "listBySkillPack", entity: "skillPackArtifact", id: skillPackId },
    );
  }

  async deleteBySkillPack(skillPackId: string): Promise<void> {
    return dbOperation(
      async () => {
        await this.db
          .delete(skillPackArtifactsTable)
          .where(eq(skillPackArtifactsTable.skillPackId, skillPackId));
      },
      { method: "deleteBySkillPack", entity: "skillPackArtifact", id: skillPackId },
    );
  }

  async countBySkillPack(skillPackId: string): Promise<number> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(skillPackArtifactsTable)
          .where(eq(skillPackArtifactsTable.skillPackId, skillPackId));
        return rows[0]?.count ?? 0;
      },
      { method: "countBySkillPack", entity: "skillPackArtifact", id: skillPackId },
    );
  }
}
