/**
 * YigYaps User Data Access Layer
 *
 * CRUD operations for users, API keys, and sessions.
 * Part of Phase 2 authentication system.
 *
 * License: Apache 2.0
 */

import { eq, and, lt, sql, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  usersTable,
  apiKeysTable,
  sessionsTable,
} from "../schema/users.js";
import type {
  UserRow,
  UserInsert,
  ApiKeyRow,
  ApiKeyInsert,
  SessionRow,
  SessionInsert,
} from "../schema/users.js";
import { dbOperation } from "./error-utils.js";

// ─── User DAL ─────────────────────────────────────────────────────────────────

export class UserDAL {
  constructor(private db: NodePgDatabase<any>) {}

  async create(user: UserInsert): Promise<UserRow> {
    return dbOperation(
      async () => {
        const results = await this.db
          .insert(usersTable)
          .values(user)
          .returning();
        return results[0];
      },
      { method: "create", entity: "user", id: user.id },
    );
  }

  async getById(id: string): Promise<UserRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, id))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getById", entity: "user", id },
    );
  }

  async getByGithubId(githubId: string): Promise<UserRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(usersTable)
          .where(eq(usersTable.githubId, githubId))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getByGithubId", entity: "user", id: githubId },
    );
  }

  async getByGithubUsername(username: string): Promise<UserRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(usersTable)
          .where(eq(usersTable.githubUsername, username))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getByGithubUsername", entity: "user", id: username },
    );
  }

  async updateProfile(
    id: string,
    updates: Partial<Omit<UserRow, "id" | "githubId" | "createdAt">>,
  ): Promise<UserRow> {
    return dbOperation(
      async () => {
        const results = await this.db
          .update(usersTable)
          .set({ ...updates, updatedAt: Date.now() })
          .where(eq(usersTable.id, id))
          .returning();
        return results[0];
      },
      { method: "updateProfile", entity: "user", id },
    );
  }

  async updateLastLogin(id: string): Promise<void> {
    await dbOperation(
      async () => {
        await this.db
          .update(usersTable)
          .set({ lastLoginAt: Date.now() })
          .where(eq(usersTable.id, id));
      },
      { method: "updateLastLogin", entity: "user", id },
    );
  }

  async incrementPackageCount(id: string): Promise<void> {
    await dbOperation(
      async () => {
        await this.db
          .update(usersTable)
          .set({
            totalPackages: sql`${usersTable.totalPackages} + 1`,
          })
          .where(eq(usersTable.id, id));
      },
      { method: "incrementPackageCount", entity: "user", id },
    );
  }
}

// ─── API Key DAL ──────────────────────────────────────────────────────────────

export class ApiKeyDAL {
  constructor(private db: NodePgDatabase<any>) {}

  async create(apiKey: ApiKeyInsert): Promise<ApiKeyRow> {
    return dbOperation(
      async () => {
        const results = await this.db
          .insert(apiKeysTable)
          .values(apiKey)
          .returning();
        return results[0];
      },
      { method: "create", entity: "apiKey", id: apiKey.id },
    );
  }

  async getById(id: string): Promise<ApiKeyRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(apiKeysTable)
          .where(eq(apiKeysTable.id, id))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getById", entity: "apiKey", id },
    );
  }

  async getByHash(keyHash: string): Promise<ApiKeyRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(apiKeysTable)
          .where(
            and(
              eq(apiKeysTable.keyHash, keyHash),
              isNull(apiKeysTable.revokedAt),
            ),
          )
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getByHash", entity: "apiKey", id: keyHash },
    );
  }

  async listByUser(userId: string): Promise<ApiKeyRow[]> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(apiKeysTable)
          .where(eq(apiKeysTable.userId, userId));
        return rows;
      },
      { method: "listByUser", entity: "apiKey", id: userId },
    );
  }

  async updateLastUsed(id: string): Promise<void> {
    await dbOperation(
      async () => {
        await this.db
          .update(apiKeysTable)
          .set({ lastUsedAt: Date.now() })
          .where(eq(apiKeysTable.id, id));
      },
      { method: "updateLastUsed", entity: "apiKey", id },
    );
  }

  async revoke(id: string): Promise<ApiKeyRow> {
    return dbOperation(
      async () => {
        const results = await this.db
          .update(apiKeysTable)
          .set({ revokedAt: Date.now() })
          .where(eq(apiKeysTable.id, id))
          .returning();
        return results[0];
      },
      { method: "revoke", entity: "apiKey", id },
    );
  }

  async updateMetadata(
    id: string,
    updates: { name?: string; scopes?: string[]; expiresAt?: number | null },
  ): Promise<ApiKeyRow> {
    return dbOperation(
      async () => {
        const results = await this.db
          .update(apiKeysTable)
          .set(updates)
          .where(eq(apiKeysTable.id, id))
          .returning();
        return results[0];
      },
      { method: "updateMetadata", entity: "apiKey", id },
    );
  }
}

// ─── Session DAL ──────────────────────────────────────────────────────────────

export class SessionDAL {
  constructor(private db: NodePgDatabase<any>) {}

  async create(session: SessionInsert): Promise<SessionRow> {
    return dbOperation(
      async () => {
        const results = await this.db
          .insert(sessionsTable)
          .values(session)
          .returning();
        return results[0];
      },
      { method: "create", entity: "session", id: session.id },
    );
  }

  async getByToken(sessionToken: string): Promise<SessionRow | null> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(sessionsTable)
          .where(eq(sessionsTable.sessionToken, sessionToken))
          .limit(1);
        return rows[0] ?? null;
      },
      { method: "getByToken", entity: "session", id: sessionToken },
    );
  }

  async getByUser(userId: string): Promise<SessionRow[]> {
    return dbOperation(
      async () => {
        const rows = await this.db
          .select()
          .from(sessionsTable)
          .where(eq(sessionsTable.userId, userId));
        return rows;
      },
      { method: "getByUser", entity: "session", id: userId },
    );
  }

  async updateLastActive(id: string): Promise<void> {
    await dbOperation(
      async () => {
        await this.db
          .update(sessionsTable)
          .set({ lastActiveAt: Date.now() })
          .where(eq(sessionsTable.id, id));
      },
      { method: "updateLastActive", entity: "session", id },
    );
  }

  async deleteById(id: string): Promise<void> {
    await dbOperation(
      async () => {
        await this.db
          .delete(sessionsTable)
          .where(eq(sessionsTable.id, id));
      },
      { method: "deleteById", entity: "session", id },
    );
  }

  async deleteByToken(sessionToken: string): Promise<void> {
    await dbOperation(
      async () => {
        await this.db
          .delete(sessionsTable)
          .where(eq(sessionsTable.sessionToken, sessionToken));
      },
      { method: "deleteByToken", entity: "session", id: sessionToken },
    );
  }

  async deleteExpired(): Promise<void> {
    await dbOperation(
      async () => {
        await this.db
          .delete(sessionsTable)
          .where(lt(sessionsTable.expiresAt, Date.now()));
      },
      { method: "deleteExpired", entity: "session" },
    );
  }
}
