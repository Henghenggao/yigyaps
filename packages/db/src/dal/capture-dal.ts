/**
 * YigYaps Capture & Validation Data Access Layer
 *
 * DAL for capture sessions, skill corpus (QA pairs), and skill tests.
 * Includes DAL-enforced state machine for capture session transitions.
 *
 * License: Apache 2.0
 */

import { eq, sql, desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema/index.js";
import {
  captureSessionsTable,
  skillCorpusTable,
  skillTestsTable,
} from "../schema/capture.js";
import type {
  CaptureSessionRow,
  CaptureSessionInsert,
  SkillCorpusRow,
  SkillCorpusInsert,
  SkillTestRow,
  SkillTestInsert,
} from "../schema/capture.js";
import { dbOperation } from "./error-utils.js";

// ─── State Machine ───────────────────────────────────────────────────────────
//
//   draft -> active -> paused -> active -> completed -> published
//                  \-> abandoned       \-> active (validation reveals gaps)
//

type SessionStatus = CaptureSessionRow["status"];

const VALID_TRANSITIONS: Record<string, SessionStatus[]> = {
  draft: ["active"],
  active: ["paused", "completed", "abandoned"],
  paused: ["active", "abandoned"],
  completed: ["published", "active"],
  published: [],
  abandoned: [],
};

// ─── Capture Session DAL ─────────────────────────────────────────────────────

export class CaptureSessionDAL {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async create(session: CaptureSessionInsert): Promise<CaptureSessionRow> {
    return dbOperation(async () => {
      const results = await this.db
        .insert(captureSessionsTable)
        .values(session)
        .returning();
      return results[0];
    }, { method: "create", entity: "captureSession" });
  }

  async getById(id: string): Promise<CaptureSessionRow | null> {
    return dbOperation(async () => {
      const results = await this.db
        .select()
        .from(captureSessionsTable)
        .where(eq(captureSessionsTable.id, id))
        .limit(1);
      return results[0] ?? null;
    }, { method: "getById", entity: "captureSession", id });
  }

  async getByUser(userId: string): Promise<CaptureSessionRow[]> {
    return dbOperation(async () => {
      return this.db
        .select()
        .from(captureSessionsTable)
        .where(eq(captureSessionsTable.userId, userId))
        .orderBy(desc(captureSessionsTable.updatedAt));
    }, { method: "getByUser", entity: "captureSession" });
  }

  async getBySkill(skillPackageId: string): Promise<CaptureSessionRow[]> {
    return dbOperation(async () => {
      return this.db
        .select()
        .from(captureSessionsTable)
        .where(eq(captureSessionsTable.skillPackageId, skillPackageId))
        .orderBy(desc(captureSessionsTable.updatedAt));
    }, { method: "getBySkill", entity: "captureSession" });
  }

  /**
   * DAL-enforced state transition. Validates the transition is allowed
   * before updating. Throws if the transition is invalid.
   */
  async transition(
    id: string,
    newStatus: SessionStatus,
    updates?: Partial<Pick<CaptureSessionRow, "sessionEncryptedDek" | "currentRound">>,
  ): Promise<CaptureSessionRow> {
    return dbOperation(async () => {
      const session = await this.getById(id);
      if (!session) {
        throw new Error(`Session ${id} not found`);
      }

      const allowed = VALID_TRANSITIONS[session.status];
      if (!allowed || !allowed.includes(newStatus)) {
        throw new Error(
          `Invalid transition: ${session.status} -> ${newStatus}. ` +
            `Allowed: ${(allowed ?? []).join(", ") || "none"}`,
        );
      }

      const now = Date.now();
      const timestampUpdates: Partial<CaptureSessionRow> = { updatedAt: now };

      if (newStatus === "paused") {
        timestampUpdates.pausedAt = now;
        // Zero session DEK on pause
        timestampUpdates.sessionEncryptedDek = null;
      }
      if (newStatus === "completed") {
        timestampUpdates.completedAt = now;
        timestampUpdates.sessionEncryptedDek = null;
      }
      if (newStatus === "published") {
        timestampUpdates.publishedAt = now;
      }
      if (newStatus === "abandoned") {
        timestampUpdates.sessionEncryptedDek = null;
      }

      const results = await this.db
        .update(captureSessionsTable)
        .set({
          status: newStatus,
          ...timestampUpdates,
          ...updates,
        })
        .where(eq(captureSessionsTable.id, id))
        .returning();

      return results[0];
    }, { method: "transition", entity: "captureSession", id });
  }

  async updateSessionDek(
    id: string,
    sessionEncryptedDek: string | null,
  ): Promise<void> {
    return dbOperation(async () => {
      await this.db
        .update(captureSessionsTable)
        .set({ sessionEncryptedDek, updatedAt: Date.now() })
        .where(eq(captureSessionsTable.id, id));
    }, { method: "updateSessionDek", entity: "captureSession", id });
  }

  async incrementRound(id: string): Promise<void> {
    return dbOperation(async () => {
      await this.db
        .update(captureSessionsTable)
        .set({
          currentRound: sql`${captureSessionsTable.currentRound} + 1`,
          updatedAt: Date.now(),
        })
        .where(eq(captureSessionsTable.id, id));
    }, { method: "incrementRound", entity: "captureSession", id });
  }
}

// ─── Skill Corpus DAL ────────────────────────────────────────────────────────

export class SkillCorpusDAL {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async create(entry: SkillCorpusInsert): Promise<SkillCorpusRow> {
    return dbOperation(async () => {
      const results = await this.db
        .insert(skillCorpusTable)
        .values(entry)
        .returning();
      return results[0];
    }, { method: "create", entity: "skillCorpus" });
  }

  async getById(id: string): Promise<SkillCorpusRow | null> {
    return dbOperation(async () => {
      const results = await this.db
        .select()
        .from(skillCorpusTable)
        .where(eq(skillCorpusTable.id, id))
        .limit(1);
      return results[0] ?? null;
    }, { method: "getById", entity: "skillCorpus", id });
  }

  async getBySkill(skillPackageId: string): Promise<SkillCorpusRow[]> {
    return dbOperation(async () => {
      return this.db
        .select()
        .from(skillCorpusTable)
        .where(eq(skillCorpusTable.skillPackageId, skillPackageId))
        .orderBy(desc(skillCorpusTable.createdAt));
    }, { method: "getBySkill", entity: "skillCorpus" });
  }

  async getBySession(sessionId: string): Promise<SkillCorpusRow[]> {
    return dbOperation(async () => {
      return this.db
        .select()
        .from(skillCorpusTable)
        .where(eq(skillCorpusTable.sessionId, sessionId))
        .orderBy(desc(skillCorpusTable.createdAt));
    }, { method: "getBySession", entity: "skillCorpus" });
  }

  async countBySkill(skillPackageId: string): Promise<number> {
    return dbOperation(async () => {
      const result = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(skillCorpusTable)
        .where(eq(skillCorpusTable.skillPackageId, skillPackageId));
      return result[0]?.count ?? 0;
    }, { method: "countBySkill", entity: "skillCorpus" });
  }

  /**
   * Get coverage statistics: count of QA pairs per tag and scenario type.
   * No answer content is returned.
   */
  async getCoverageStats(skillPackageId: string): Promise<{
    totalQaPairs: number;
    tagCounts: Record<string, number>;
    scenarioTypeCounts: Record<string, number>;
    sourceCounts: Record<string, number>;
  }> {
    return dbOperation(async () => {
      const rows = await this.db
        .select({
          tags: skillCorpusTable.tags,
          scenarioType: skillCorpusTable.scenarioType,
          source: skillCorpusTable.source,
        })
        .from(skillCorpusTable)
        .where(eq(skillCorpusTable.skillPackageId, skillPackageId));

      const tagCounts: Record<string, number> = {};
      const scenarioTypeCounts: Record<string, number> = {};
      const sourceCounts: Record<string, number> = {};

      for (const row of rows) {
        for (const tag of row.tags) {
          tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
        }
        scenarioTypeCounts[row.scenarioType] =
          (scenarioTypeCounts[row.scenarioType] ?? 0) + 1;
        sourceCounts[row.source] = (sourceCounts[row.source] ?? 0) + 1;
      }

      return {
        totalQaPairs: rows.length,
        tagCounts,
        scenarioTypeCounts,
        sourceCounts,
      };
    }, { method: "getCoverageStats", entity: "skillCorpus" });
  }

  /**
   * Set cached DEK on all corpus entries for a skill (at publish time).
   */
  async setCachedDek(
    skillPackageId: string,
    cachedEncryptedDek: string | null,
  ): Promise<void> {
    return dbOperation(async () => {
      await this.db
        .update(skillCorpusTable)
        .set({ cachedEncryptedDek })
        .where(eq(skillCorpusTable.skillPackageId, skillPackageId));
    }, { method: "setCachedDek", entity: "skillCorpus" });
  }
}

// ─── Skill Test DAL ──────────────────────────────────────────────────────────

export class SkillTestDAL {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async create(test: SkillTestInsert): Promise<SkillTestRow> {
    return dbOperation(async () => {
      const results = await this.db
        .insert(skillTestsTable)
        .values(test)
        .returning();
      return results[0];
    }, { method: "create", entity: "skillTest" });
  }

  async getBySkill(skillPackageId: string): Promise<SkillTestRow[]> {
    return dbOperation(async () => {
      return this.db
        .select()
        .from(skillTestsTable)
        .where(eq(skillTestsTable.skillPackageId, skillPackageId))
        .orderBy(desc(skillTestsTable.createdAt));
    }, { method: "getBySkill", entity: "skillTest" });
  }

  async getPassRate(skillPackageId: string): Promise<{
    total: number;
    correct: number;
    partial: number;
    wrong: number;
    pending: number;
    passRate: number;
  }> {
    return dbOperation(async () => {
      const rows = await this.db
        .select({ verdict: skillTestsTable.expertVerdict })
        .from(skillTestsTable)
        .where(eq(skillTestsTable.skillPackageId, skillPackageId));

      const correct = rows.filter((r) => r.verdict === "correct").length;
      const partial = rows.filter((r) => r.verdict === "partial").length;
      const wrong = rows.filter((r) => r.verdict === "wrong").length;
      const pending = rows.filter((r) => r.verdict === "pending").length;
      const total = correct + partial + wrong;
      const passRate = total > 0 ? correct / total : 0;

      return { total, correct, partial, wrong, pending, passRate };
    }, { method: "getPassRate", entity: "skillTest" });
  }
}
