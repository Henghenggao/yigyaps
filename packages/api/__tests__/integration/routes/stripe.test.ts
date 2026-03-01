/**
 * Stripe Route Integration Tests
 *
 * Tests Stripe-related endpoints:
 *   - Graceful 503 degradation when STRIPE_SECRET_KEY is not set
 *   - Earnings endpoint (DB-driven, no Stripe API dependency)
 *   - Authentication requirements on all stripe endpoints
 *   - Connect status endpoint
 *
 * These tests run WITHOUT a real Stripe API key. All Stripe-dependent
 * endpoints are expected to return 503 "Stripe not configured".
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
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = "usr_stripe_001";
const USER_JWT = createTestJWT({
  userId: USER_ID,
  userName: "Stripe Test User",
  githubUsername: "stripeuser",
});

const AUTHOR_ID = "usr_author_stripe";
const AUTHOR_JWT = createTestJWT({
  userId: AUTHOR_ID,
  userName: "Stripe Author",
  githubUsername: "stripeauthor",
});

async function clearStripeTables(db: any) {
  const tables = [
    "yy_usage_ledger",
    "yy_subscriptions",
    "yy_royalty_ledger",
    "yy_skill_package_reviews",
    "yy_skill_package_installations",
    "yy_skill_mints",
    "yy_skill_packages",
  ];
  for (const table of tables) {
    try {
      await db.execute(
        sql.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`),
      );
    } catch {
      // table may not exist
    }
  }
}

describe("Stripe Routes", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32chars!!";
    process.env.SESSION_SECRET = "test-session-secret-that-is-32chars!!";
    process.env.NODE_ENV = "test";
    // Explicitly NOT setting STRIPE_SECRET_KEY to test graceful degradation
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_CONNECT_CLIENT_ID;

    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("yigyaps_test")
      .withUsername("test_user")
      .withPassword("test_password")
      .start();

    const connectionString = container.getConnectionUri();
    pool = new Pool({ connectionString });
    testDb = drizzle(pool);

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
    await clearStripeTables(testDb);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Graceful Degradation (503 without Stripe key)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("503 Graceful Degradation", () => {
    it("GET /stripe/connect/onboard returns 503 without Stripe key", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/stripe/connect/onboard",
        headers: { authorization: `Bearer ${USER_JWT}` },
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().message).toContain("Stripe is not configured");
    });

    it("POST /stripe/checkout/:packageId returns 503 without Stripe key", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/stripe/checkout/some-package",
        headers: { authorization: `Bearer ${USER_JWT}` },
        payload: { tier: "pro" },
      });
      expect(res.statusCode).toBe(503);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Authentication Requirements
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("Authentication Requirements", () => {
    it("GET /stripe/connect/status requires auth", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/stripe/connect/status",
      });
      expect([401, 403]).toContain(res.statusCode);
    });

    it("GET /stripe/earnings requires auth", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/stripe/earnings",
      });
      expect([401, 403]).toContain(res.statusCode);
    });

    it("GET /stripe/connect/onboard requires auth", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/stripe/connect/onboard",
      });
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Earnings Endpoint (DB-driven)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("GET /v1/stripe/earnings", () => {
    it("returns zero earnings for user with no packages", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/stripe/earnings",
        headers: { authorization: `Bearer ${USER_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.allTimeUsd).toBe(0);
      expect(body.last30dUsd).toBe(0);
      expect(body.creatorSharePercent).toBe(70);
    });

    it("returns aggregated earnings from usage ledger", async () => {
      // Create test package by author
      const pkgRes = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/packages",
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
        payload: {
          packageId: "stripe-test-skill",
          version: "1.0.0",
          displayName: "Stripe Test Skill",
          description: "A test skill for stripe integration test validation",
          authorName: "Stripe Author",
          category: "other",
          tags: ["test"],
          priceUsd: 0,
          readme: "# Test",
        },
      });
      expect(pkgRes.statusCode).toBe(201);
      const pkgId = pkgRes.json().id;

      // Insert usage ledger entries directly
      // yy_usage_ledger.user_id has a FK to yy_users, so the buyer must exist first
      const now = Date.now();
      await testDb.execute(
        sql.raw(`
          INSERT INTO yy_users (id, github_id, github_username, display_name, created_at, updated_at, last_login_at)
          VALUES ('${USER_ID}', 'gh_stripe_buyer', 'stripeuser', 'Stripe Test User', ${now}, ${now}, ${now})
          ON CONFLICT (id) DO NOTHING
        `),
      );
      await testDb.execute(
        sql.raw(`
          INSERT INTO yy_usage_ledger (id, user_id, skill_package_id, cost_usd, creator_royalty_usd, created_at)
          VALUES
            ('${randomUUID()}', '${USER_ID}', '${pkgId}', '0.0500', '0.0350', ${now}),
            ('${randomUUID()}', '${USER_ID}', '${pkgId}', '0.0500', '0.0350', ${now - 1000})
        `),
      );

      // Check author's earnings
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/stripe/earnings",
        headers: { authorization: `Bearer ${AUTHOR_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.allTimeUsd).toBeCloseTo(0.07, 2);
      expect(body.last30dUsd).toBeCloseTo(0.07, 2);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Connect Status (DB-driven portion)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("GET /v1/stripe/connect/status", () => {
    it("returns not connected for user without Stripe account", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/stripe/connect/status",
        headers: { authorization: `Bearer ${USER_JWT}` },
      });

      // May get 404 (user not in users table) or 200 with connected: false
      if (res.statusCode === 200) {
        expect(res.json().connected).toBe(false);
      } else {
        expect(res.statusCode).toBe(404);
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. Webhook (signature validation)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("POST /v1/webhooks/stripe", () => {
    it("acknowledges webhook silently when Stripe is not configured", async () => {
      const res = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/webhooks/stripe",
        payload: { type: "test.event" },
      });

      // Without Stripe key, should return 200 received: true
      expect(res.statusCode).toBe(200);
      expect(res.json().received).toBe(true);
    });
  });
});
