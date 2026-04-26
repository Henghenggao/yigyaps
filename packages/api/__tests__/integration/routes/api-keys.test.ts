/**
 * API Keys Routes Integration Tests
 *
 * Tests all /v1/auth/api-keys endpoints:
 *   POST   /v1/auth/api-keys       — Create a new API key
 *   GET    /v1/auth/api-keys       — List user's API keys
 *   DELETE /v1/auth/api-keys/:id   — Revoke an API key
 *
 * Database strategy:
 *   - Uses TEST_DATABASE_URL provided by Vitest global setup.
 *   - Does not fall back to DATABASE_URL; shared DB drift must not affect tests.
 *
 * License: Apache 2.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import {
  createTestServer,
  closeTestServer,
  type TestServerContext,
} from "../helpers/test-server.js";
import { createTestJWT } from "../../unit/helpers/jwt-helpers.js";
import { UserDAL } from "@yigyaps/db";
import { sql } from "drizzle-orm";
import * as schema from "@yigyaps/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Resolve database URL ───────────────────────────────────────────────────────

const DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/yigyaps_test";

// ── DB helpers ─────────────────────────────────────────────────────────────────

/** Delete only rows created by this test suite (prefixed IDs for safety). */
async function clearApiKeyTestData(
  db: ReturnType<typeof drizzle<typeof schema>>,
) {
  try {
    // API keys depend on users, clean first
    await db.execute(
      sql.raw(
        `DELETE FROM yy_api_keys WHERE user_id LIKE 'usr_aktest_%'`,
      ),
    );
    // Users created by this suite
    await db.execute(
      sql.raw(`DELETE FROM yy_users WHERE id LIKE 'usr_aktest_%'`),
    );
  } catch {
    // ignore — tables may not exist yet on first run
  }
}

/** Insert a minimal user row directly into the DB. */
async function insertUser(
  db: ReturnType<typeof drizzle<typeof schema>>,
  id: string,
): Promise<schema.UserRow> {
  const now = Date.now();
  const row: schema.UserInsert = {
    id,
    githubId: `gh_${id}`,
    githubUsername: id,
    displayName: `Test User ${id}`,
    avatarUrl: null,
    tier: "free",
    role: "user",
    totalPackages: 0,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
  const userDAL = new UserDAL(db);
  return userDAL.create(row);
}

// ── Valid POST body ────────────────────────────────────────────────────────────

const VALID_CREATE_BODY = {
  name: "My Test Key",
  scopes: ["read"],
  accepted_anti_training_terms: true,
};

// ─────────────────────────────────────────────────────────────────────────────

describe("API Keys Routes", () => {
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle<typeof schema>>;
  let serverContext: TestServerContext;

  // Two distinct users: user A (key owner) and user B (different user)
  const USER_A_ID = "usr_aktest_user_a";
  const USER_B_ID = "usr_aktest_user_b";

  const JWT_A = createTestJWT({ userId: USER_A_ID });
  const JWT_B = createTestJWT({ userId: USER_B_ID });

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.NODE_ENV = "test";
    process.env.GITHUB_CLIENT_ID = "test-github-client-id";
    process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";

    pool = new Pool({ connectionString: DB_URL, max: 5 });
    testDb = drizzle(pool, { schema });

    try {
      const migrationsPath = path.resolve(
        __dirname,
        "../../../../db/migrations",
      );
      await migrate(testDb, { migrationsFolder: migrationsPath });
    } catch (err: unknown) {
      if (!(err instanceof Error && err.message.includes("already exists"))) throw err;
    }

    // Ensure optional columns added by recent migrations exist on shared DBs
    try {
      await testDb.execute(
        sql.raw(
          `ALTER TABLE yy_users ADD COLUMN IF NOT EXISTS terms_accepted_at bigint`,
        ),
      );
    } catch {
      /* ignore */
    }
    try {
      await testDb.execute(
        sql.raw(
          `ALTER TABLE yy_api_keys ADD COLUMN IF NOT EXISTS terms_accepted_at bigint`,
        ),
      );
    } catch {
      /* ignore */
    }

    serverContext = await createTestServer(DB_URL);

    // Pre-create both test users — the api-key routes look up user info from DB
    // when authenticating via API key (validateApiKey -> userDAL.getById).
    await clearApiKeyTestData(testDb);
    await insertUser(testDb, USER_A_ID);
    await insertUser(testDb, USER_B_ID);
  }, 60_000);

  afterAll(async () => {
    await clearApiKeyTestData(testDb);
    if (serverContext) await closeTestServer(serverContext);
    await pool.end();
  });

  beforeEach(async () => {
    // Delete only keys belonging to test users, keep the users themselves
    try {
      await testDb.execute(
        sql.raw(
          `DELETE FROM yy_api_keys WHERE user_id LIKE 'usr_aktest_%'`,
        ),
      );
    } catch {
      /* ignore */
    }
  });

  // ── POST /v1/auth/api-keys ──────────────────────────────────────────────────

  describe("POST /v1/auth/api-keys", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        payload: VALID_CREATE_BODY,
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 201 with raw key on success", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: VALID_CREATE_BODY,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      // Raw key is returned once
      expect(typeof body.key).toBe("string");
      expect(body.key).toMatch(/^yg_/);
      // Response includes expected metadata
      expect(typeof body.id).toBe("string");
      expect(body.id).toMatch(/^ak_/);
      expect(body.name).toBe(VALID_CREATE_BODY.name);
      expect(typeof body.keyPrefix).toBe("string");
      expect(body.keyPrefix).toHaveLength(10); // 'yg_' + 7 hex chars
      expect(Array.isArray(body.scopes)).toBe(true);
      expect(body.createdAt).toBeTypeOf("number");
    });

    it("stores correct name and scopes", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: {
          name: "scoped-key",
          scopes: ["read", "write"],
          accepted_anti_training_terms: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("scoped-key");
      expect(body.scopes).toEqual(["read", "write"]);
    });

    it("respects expiresInDays when provided", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: {
          name: "expiring-key",
          expiresInDays: 7,
          accepted_anti_training_terms: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.expiresAt).toBeTypeOf("number");
      // expiresAt should be roughly now + 7 days (within a 60s tolerance)
      const expectedExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(body.expiresAt).toBeGreaterThan(expectedExpiry - 60_000);
      expect(body.expiresAt).toBeLessThan(expectedExpiry + 60_000);
    });

    it("returns 400 when accepted_anti_training_terms is missing", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: {
          name: "no-terms-key",
          scopes: [],
          // accepted_anti_training_terms intentionally omitted
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when accepted_anti_training_terms is false", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: {
          name: "false-terms-key",
          scopes: [],
          accepted_anti_training_terms: false,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when name is missing", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: {
          scopes: [],
          accepted_anti_training_terms: true,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returned API key is usable for authentication on a protected endpoint", async () => {
      // Create a key
      const createRes = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: VALID_CREATE_BODY,
      });
      expect(createRes.statusCode).toBe(201);
      const { key } = JSON.parse(createRes.body);

      // Use the raw key to hit a protected endpoint (GET /v1/auth/api-keys itself)
      const listRes = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${key}` },
      });

      expect(listRes.statusCode).toBe(200);
    });
  });

  // ── GET /v1/auth/api-keys ───────────────────────────────────────────────────

  describe("GET /v1/auth/api-keys", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/api-keys",
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 200 with an empty list when no keys exist", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body.apiKeys)).toBe(true);
      expect(body.apiKeys).toHaveLength(0);
    });

    it("lists keys belonging to the authenticated user", async () => {
      // Create a key for user A
      const createRes = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: { ...VALID_CREATE_BODY, name: "key-for-list" },
      });
      expect(createRes.statusCode).toBe(201);
      const createdId = JSON.parse(createRes.body).id;

      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.apiKeys.length).toBeGreaterThanOrEqual(1);
      const found = body.apiKeys.find((k: { id: string }) => k.id === createdId);
      expect(found).toBeDefined();
    });

    it("does NOT return the raw key value in the list", async () => {
      await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: VALID_CREATE_BODY,
      });

      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      for (const k of body.apiKeys) {
        expect(k.key).toBeUndefined();
        expect(k.keyHash).toBeUndefined();
        // keyPrefix and keyHint are expected metadata
        expect(typeof k.keyPrefix).toBe("string");
        expect(typeof k.keyHint).toBe("string");
      }
    });

    it("does NOT return keys belonging to other users", async () => {
      // Create a key for user B
      await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_B}` },
        payload: { ...VALID_CREATE_BODY, name: "user-b-key" },
      });

      // User A's list should not contain user B's key
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const userBKey = body.apiKeys.find((k: { name: string }) => k.name === "user-b-key");
      expect(userBKey).toBeUndefined();
    });
  });

  // ── DELETE /v1/auth/api-keys/:id ───────────────────────────────────────────

  describe("DELETE /v1/auth/api-keys/:id", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await serverContext.fastify.inject({
        method: "DELETE",
        url: "/v1/auth/api-keys/ak_fake_id",
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 404 when the key does not exist", async () => {
      const res = await serverContext.fastify.inject({
        method: "DELETE",
        url: "/v1/auth/api-keys/ak_nonexistent_aktest_000",
        headers: { authorization: `Bearer ${JWT_A}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 200 and revokes own key", async () => {
      // Create a key for user A
      const createRes = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: { ...VALID_CREATE_BODY, name: "key-to-delete" },
      });
      expect(createRes.statusCode).toBe(201);
      const { id } = JSON.parse(createRes.body);

      const deleteRes = await serverContext.fastify.inject({
        method: "DELETE",
        url: `/v1/auth/api-keys/${id}`,
        headers: { authorization: `Bearer ${JWT_A}` },
      });

      expect(deleteRes.statusCode).toBe(200);
      const body = JSON.parse(deleteRes.body);
      expect(body.id).toBe(id);
      expect(body.revokedAt).toBeTypeOf("number");
      expect(body.message).toBe("API key revoked successfully");
    });

    it("returns 403 when deleting another user's key", async () => {
      // Create a key for user B
      const createRes = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_B}` },
        payload: { ...VALID_CREATE_BODY, name: "user-b-key-to-steal" },
      });
      expect(createRes.statusCode).toBe(201);
      const { id } = JSON.parse(createRes.body);

      // User A tries to delete user B's key
      const deleteRes = await serverContext.fastify.inject({
        method: "DELETE",
        url: `/v1/auth/api-keys/${id}`,
        headers: { authorization: `Bearer ${JWT_A}` },
      });

      expect(deleteRes.statusCode).toBe(403);
    });

    it("returns 409 when revoking an already-revoked key", async () => {
      // Create a key for user A
      const createRes = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: { ...VALID_CREATE_BODY, name: "key-to-double-revoke" },
      });
      expect(createRes.statusCode).toBe(201);
      const { id } = JSON.parse(createRes.body);

      // First revocation — should succeed
      const firstDelete = await serverContext.fastify.inject({
        method: "DELETE",
        url: `/v1/auth/api-keys/${id}`,
        headers: { authorization: `Bearer ${JWT_A}` },
      });
      expect(firstDelete.statusCode).toBe(200);

      // Second revocation — should conflict
      const secondDelete = await serverContext.fastify.inject({
        method: "DELETE",
        url: `/v1/auth/api-keys/${id}`,
        headers: { authorization: `Bearer ${JWT_A}` },
      });
      expect(secondDelete.statusCode).toBe(409);
    });

    it("revoked key can no longer be used for authentication", async () => {
      // Create a key for user A
      const createRes = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${JWT_A}` },
        payload: { ...VALID_CREATE_BODY, name: "key-to-revoke-and-test" },
      });
      expect(createRes.statusCode).toBe(201);
      const { id, key } = JSON.parse(createRes.body);

      // Confirm the key works before revocation
      const beforeRevoke = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${key}` },
      });
      expect(beforeRevoke.statusCode).toBe(200);

      // Revoke the key
      await serverContext.fastify.inject({
        method: "DELETE",
        url: `/v1/auth/api-keys/${id}`,
        headers: { authorization: `Bearer ${JWT_A}` },
      });

      // Revoked key should now be rejected
      const afterRevoke = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/api-keys",
        headers: { authorization: `Bearer ${key}` },
      });
      // requireAuth returns 403 for invalid credentials (invalid API key path)
      expect([401, 403]).toContain(afterRevoke.statusCode);
    });
  });
});
