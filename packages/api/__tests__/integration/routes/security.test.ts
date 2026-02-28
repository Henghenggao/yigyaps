/**
 * Security Route Integration Tests
 *
 * Tests the full encrypt → invoke → revoke pipeline:
 *   - Knowledge encryption with AES-256-GCM + Shamir key splitting
 *   - Skill invocation (Mode A local, Shamir DEK recovery)
 *   - Hash-chain audit log integrity
 *   - Crypto-shredding (knowledge revocation)
 *   - Authorization: author-only access, anti-scraping guard
 *
 * Uses Testcontainers for real PostgreSQL integration.
 *
 * License: Apache 2.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
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
import { sql } from "drizzle-orm";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fixed KMS_KEK for deterministic tests (32 bytes = 64 hex chars)
const TEST_KEK = crypto.randomBytes(32).toString("hex");

// ── Database cleanup ─────────────────────────────────────────────────────────

async function clearSecurityTables(db: any) {
  const tables = [
    "yy_shamir_shares",
    "yy_ip_registrations",
    "yy_invocation_logs",
    "yy_encrypted_knowledge",
    "yy_royalty_ledger",
    "yy_skill_package_reviews",
    "yy_skill_package_installations",
    "yy_skill_mints",
    "yy_usage_ledger",
    "yy_subscriptions",
    "yy_skill_packages",
  ];

  for (const table of tables) {
    try {
      await db.execute(
        sql.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`),
      );
    } catch {
      // Table may not exist yet — skip
    }
  }
}

// ── Test fixtures ────────────────────────────────────────────────────────────

const AUTHOR_ID = "usr_author_001";
const AUTHOR_JWT = createTestJWT({
  userId: AUTHOR_ID,
  userName: "Skill Author",
  githubUsername: "skillauthor",
});

const OTHER_USER_ID = "usr_other_001";
const OTHER_USER_JWT = createTestJWT({
  userId: OTHER_USER_ID,
  userName: "Other User",
  githubUsername: "otheruser",
});

const SAMPLE_RULES = JSON.stringify([
  {
    id: "rule-001",
    dimension: "market_fit",
    condition: { keywords: ["B2B", "enterprise", "SaaS"] },
    conclusion: "strong_market_signal",
    weight: 0.9,
  },
  {
    id: "rule-002",
    dimension: "market_fit",
    condition: { keywords: ["niche", "hobby"] },
    conclusion: "weak_market_signal",
    weight: 0.3,
  },
  {
    id: "rule-003",
    dimension: "team_quality",
    condition: {},
    conclusion: "unknown_team",
    weight: 0.5,
  },
]);

const TEST_PACKAGE_ID = "test-security-skill";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createTestPackage(serverContext: TestServerContext) {
  const res = await serverContext.fastify.inject({
    method: "POST",
    url: "/v1/packages",
    headers: { authorization: `Bearer ${AUTHOR_JWT}` },
    payload: {
      packageId: TEST_PACKAGE_ID,
      version: "1.0.0",
      displayName: "Security Test Skill",
      description: "A test skill for security integration tests validation",
      category: "other",
      tags: ["test"],
      priceUsd: 0,
      readme: "# Test Skill\nFor integration testing.",
    },
  });
  expect(res.statusCode).toBe(201);
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe("Security Routes", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;

  beforeAll(async () => {
    // Set required env vars for security subsystem
    process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32chars!!";
    process.env.SESSION_SECRET = "test-session-secret-that-is-32chars!!";
    process.env.KMS_KEK = TEST_KEK;
    process.env.NODE_ENV = "test";

    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("yigyaps_test")
      .withUsername("test_user")
      .withPassword("test_password")
      .start();

    const connectionString = container.getConnectionUri();
    pool = new Pool({ connectionString });
    testDb = drizzle(pool);

    // Run all migrations (0000-0010)
    const migrationsPath = path.resolve(__dirname, "../../../../db/migrations");
    await migrate(testDb, { migrationsFolder: migrationsPath });

    serverContext = await createTestServer(connectionString);
  }, 60_000);

  afterAll(async () => {
    await closeTestServer(serverContext);
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await clearSecurityTables(testDb);
    await createTestPackage(serverContext);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Knowledge Encryption (POST /v1/security/knowledge/:packageId)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("POST /v1/security/knowledge/:packageId", () => {
    it("encrypts knowledge and returns Shamir expert share", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: { plaintextRules: SAMPLE_RULES },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.expert_share).toBeDefined();
      expect(body.expert_share.length).toBeGreaterThan(0);
      expect(body.shamir_notice).toContain("IMPORTANT");
    });

    it("rejects non-author upload", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${OTHER_USER_JWT}` },
        payload: { plaintextRules: SAMPLE_RULES },
      });

      expect(res.statusCode).toBe(403);
    });

    it("rejects unauthenticated request", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        payload: { plaintextRules: SAMPLE_RULES },
      });

      expect([401, 403]).toContain(res.statusCode);
    });

    it("returns 404 for non-existent package", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/security/knowledge/nonexistent-pkg-99",
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: { plaintextRules: SAMPLE_RULES },
      });

      expect(res.statusCode).toBe(404);
    });

    it("creates IP registration record", async () => {
      await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: { plaintextRules: SAMPLE_RULES },
      });

      // Verify IP registration was created
      const ipRows = await testDb.execute(
        sql.raw(
          `SELECT * FROM yy_ip_registrations WHERE content_hash IS NOT NULL`,
        ),
      );
      expect(ipRows.rows.length).toBeGreaterThanOrEqual(1);
      // blockchain_tx should be sha256:... (HMAC fallback since no GitHub token)
      expect(String(ipRows.rows[0].blockchain_tx)).toMatch(
        /^sha256:|^github:/,
      );
    });

    it("soft-archives previous version on re-upload", async () => {
      // First upload
      await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: { plaintextRules: SAMPLE_RULES },
      });

      // Second upload (updated rules)
      const updatedRules = JSON.stringify([
        {
          id: "rule-v2",
          dimension: "updated",
          condition: {},
          conclusion: "new_version",
          weight: 1.0,
        },
      ]);

      await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: { plaintextRules: updatedRules },
      });

      // Should have 2 records: 1 active, 1 archived
      const allRecords = await testDb.execute(
        sql.raw(`SELECT is_active FROM yy_encrypted_knowledge ORDER BY created_at`),
      );
      expect(allRecords.rows.length).toBe(2);
      expect(allRecords.rows[0].is_active).toBe(false); // old version archived
      expect(allRecords.rows[1].is_active).toBe(true); // new version active
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Knowledge Retrieval (GET /v1/security/knowledge/:packageId)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("GET /v1/security/knowledge/:packageId", () => {
    it("author can decrypt and retrieve plaintext rules", async () => {
      // First, encrypt knowledge
      await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: { plaintextRules: SAMPLE_RULES },
      });

      // Then retrieve
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.plaintextRules).toBe(SAMPLE_RULES);
    });

    it("non-author cannot decrypt knowledge", async () => {
      await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: { plaintextRules: SAMPLE_RULES },
      });

      const res = await serverContext.fastify.inject({
        method: "GET",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${OTHER_USER_JWT}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 404 when no knowledge uploaded", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Skill Invocation (POST /v1/security/invoke/:packageId)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("POST /v1/security/invoke/:packageId", () => {
    let expertShare: string;

    beforeEach(async () => {
      // Upload encrypted knowledge and capture expert share
      const encryptRes = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: { plaintextRules: SAMPLE_RULES },
      });
      expertShare = encryptRes.json().expert_share;
    });

    it("Mode A: local evaluation with Shamir DEK recovery", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/invoke/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: {
          user_query: "Evaluate a B2B enterprise SaaS startup",
          expert_share: expertShare,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.conclusion).toBeDefined();
      expect(body.mode).toBe("local");
      expect(body.privacy_notice).toContain("LOCAL MODE");
    });

    it("returns 400 when Shamir share is required but missing", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/invoke/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: { user_query: "test query" },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error).toContain("Shamir");
    });

    it("creates hash-chain audit log entry", async () => {
      // First invocation
      await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/invoke/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: {
          user_query: "First query",
          expert_share: expertShare,
        },
      });

      // Check audit log
      const logs = await testDb.execute(
        sql.raw(
          `SELECT prev_hash, event_hash, conclusion_hash FROM yy_invocation_logs ORDER BY created_at`,
        ),
      );
      expect(logs.rows.length).toBe(1);
      expect(logs.rows[0].prev_hash).toBe("GENESIS");
      expect(logs.rows[0].event_hash).toBeDefined();
      expect(String(logs.rows[0].event_hash).length).toBe(64); // SHA-256 hex

      // Second invocation — should chain to first
      await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/invoke/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: {
          user_query: "Second query",
          expert_share: expertShare,
        },
      });

      const logsAfter = await testDb.execute(
        sql.raw(
          `SELECT prev_hash, event_hash FROM yy_invocation_logs ORDER BY created_at`,
        ),
      );
      expect(logsAfter.rows.length).toBe(2);
      // Second entry's prevHash should equal first entry's eventHash
      expect(logsAfter.rows[1].prev_hash).toBe(logsAfter.rows[0].event_hash);
    });

    it("returns 404 for non-existent package", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/security/invoke/nonexistent-pkg-99",
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: {
          user_query: "test",
          expert_share: expertShare,
        },
      });

      expect(res.statusCode).toBe(404);
    });

    it("rejects unauthenticated invocation", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/invoke/${TEST_PACKAGE_ID}`,
        payload: { user_query: "test" },
      });

      expect([401, 403]).toContain(res.statusCode);
    });

    it("Mode C gate: non-author cannot use lab_api_key", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/invoke/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${OTHER_USER_JWT}` },
        payload: {
          user_query: "test query",
          lab_api_key: "sk-fake-key",
          expert_share: expertShare,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().message).toContain("package author");
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Crypto-Shredding (DELETE /v1/security/knowledge/:packageId/revoke)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("DELETE /v1/security/knowledge/:packageId/revoke", () => {
    beforeEach(async () => {
      // Upload knowledge to have something to revoke
      await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: { plaintextRules: SAMPLE_RULES },
      });
    });

    it("author can revoke knowledge (crypto-shredding)", async () => {
      const res = await serverContext.fastify.inject({
        method: "DELETE",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}/revoke`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain("Crypto-shredding");
      expect(body.deleted_shares).toBeGreaterThanOrEqual(2); // platform + backup
      expect(body.deleted_knowledge_versions).toBeGreaterThanOrEqual(1);
    });

    it("knowledge is unrecoverable after revocation", async () => {
      // Revoke
      await serverContext.fastify.inject({
        method: "DELETE",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}/revoke`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
      });

      // Try to retrieve — should get 404
      const getRes = await serverContext.fastify.inject({
        method: "GET",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
      });

      expect(getRes.statusCode).toBe(404);

      // Verify DB is clean
      const shares = await testDb.execute(
        sql.raw(`SELECT COUNT(*) as cnt FROM yy_shamir_shares`),
      );
      expect(Number(shares.rows[0].cnt)).toBe(0);

      const knowledge = await testDb.execute(
        sql.raw(`SELECT COUNT(*) as cnt FROM yy_encrypted_knowledge`),
      );
      expect(Number(knowledge.rows[0].cnt)).toBe(0);
    });

    it("non-author cannot revoke knowledge", async () => {
      const res = await serverContext.fastify.inject({
        method: "DELETE",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}/revoke`,
        headers: { authorization: `Bearer ${OTHER_USER_JWT}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. Full Pipeline: Encrypt → Invoke → Verify Audit → Revoke
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("Full Pipeline E2E", () => {
    it("encrypt → invoke → verify audit chain → revoke → verify unrecoverable", async () => {
      // Step 1: Encrypt
      const encryptRes = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: { plaintextRules: SAMPLE_RULES },
      });
      expect(encryptRes.statusCode).toBe(200);
      const { expert_share } = encryptRes.json();

      // Step 2: Invoke twice with expert share
      const invoke1 = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/invoke/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: {
          user_query: "B2B enterprise startup evaluation",
          expert_share,
        },
      });
      expect(invoke1.statusCode).toBe(200);
      expect(invoke1.json().mode).toBe("local");

      const invoke2 = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/invoke/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: {
          user_query: "niche hobby project assessment",
          expert_share,
        },
      });
      expect(invoke2.statusCode).toBe(200);

      // Step 3: Verify hash-chain integrity
      const logs = await testDb.execute(
        sql.raw(
          `SELECT prev_hash, event_hash, conclusion_hash FROM yy_invocation_logs ORDER BY created_at`,
        ),
      );
      expect(logs.rows.length).toBe(2);
      expect(logs.rows[0].prev_hash).toBe("GENESIS");
      expect(logs.rows[1].prev_hash).toBe(logs.rows[0].event_hash);

      // Step 4: Revoke
      const revokeRes = await serverContext.fastify.inject({
        method: "DELETE",
        url: `/v1/security/knowledge/${TEST_PACKAGE_ID}/revoke`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
      });
      expect(revokeRes.statusCode).toBe(200);

      // Step 5: Invoke should fail (no knowledge)
      const invokeAfterRevoke = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/security/invoke/${TEST_PACKAGE_ID}`,
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: {
          user_query: "should fail",
          expert_share,
        },
      });
      expect(invokeAfterRevoke.statusCode).toBe(404);

      // Step 6: Audit logs should remain (even after revocation)
      const logsAfterRevoke = await testDb.execute(
        sql.raw(`SELECT COUNT(*) as cnt FROM yy_invocation_logs`),
      );
      expect(Number(logsAfterRevoke.rows[0].cnt)).toBe(2); // Logs are immutable
    });
  });
});
