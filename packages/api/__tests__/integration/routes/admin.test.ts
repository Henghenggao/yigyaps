/**
 * Admin Routes Integration Tests
 *
 * Tests all /v1/admin/* endpoints for access control (admin vs non-admin vs
 * unauthenticated) and functional correctness.
 *
 * Database strategy:
 *   - Uses TEST_DATABASE_URL provided by Vitest global setup.
 *   - Does not fall back to DATABASE_URL; shared DB drift must not affect tests.
 *
 * License: Apache 2.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  createTestServer,
  closeTestServer,
  type TestServerContext,
} from "../helpers/test-server.js";
import { getTestDatabaseUrl } from "../helpers/test-db-url.js";
import {
  createAdminJWT,
  createTestJWT,
} from "../../unit/helpers/jwt-helpers.js";
import { SkillPackageDAL, UserDAL } from "@yigyaps/db";
import { SkillPackageFactory } from "../../../../db/__tests__/helpers/factories.js";
import { sql } from "drizzle-orm";
import * as schema from "@yigyaps/db";

const DB_URL = getTestDatabaseUrl();

// ── Resolve database URL ───────────────────────────────────────────────────────


// ── DB helpers ─────────────────────────────────────────────────────────────────

/** Delete only rows created by this test suite (prefixed IDs for safety). */
async function clearAdminTestData(db: ReturnType<typeof drizzle>) {
  try {
    // Reports depend on nothing, clean first
    await db.execute(sql.raw(`DELETE FROM yy_reports WHERE id LIKE 'rpt_admintest_%'`));
    // Packages created by this suite
    await db.execute(
      sql.raw(`DELETE FROM yy_skill_packages WHERE package_id LIKE 'admintest-%'`),
    );
    // Users created by this suite
    await db.execute(
      sql.raw(`DELETE FROM yy_users WHERE id LIKE 'usr_admintest_%'`),
    );
  } catch {
    // ignore — tables may not exist yet on first run
  }
}

/** Insert a minimal user row directly into the DB. */
async function insertUser(
  db: ReturnType<typeof drizzle<typeof schema>>,
  id: string,
  role: "user" | "admin" = "user",
): Promise<schema.UserRow> {
  const now = Date.now();
  const row: schema.UserInsert = {
    id,
    githubId: `gh_${id}`,
    githubUsername: id,
    displayName: `Test User ${id}`,
    avatarUrl: null,
    tier: "free",
    role,
    totalPackages: 0,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
  const userDAL = new UserDAL(db);
  return userDAL.create(row);
}

/** Insert a minimal report row directly into the migrated test DB. */
async function insertReport(
  db: ReturnType<typeof drizzle<typeof schema>>,
  id: string,
  reporterId: string,
  status: "pending" | "resolved" | "dismissed" = "pending",
): Promise<void> {
  const now = Date.now();

  await db
    .insert(schema.reportsTable)
    .values({
      id,
      reporterId,
      targetType: "skill_package",
      targetId: "spkg_target_test",
      reason: "other",
      status,
      description: null,
      createdAt: now,
    })
    .onConflictDoNothing();
}

// ─────────────────────────────────────────────────────────────────────────────

describe("Admin Routes", () => {
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle<typeof schema>>;
  let serverContext: TestServerContext;
  let packageDAL: SkillPackageDAL;

  // JWTs — admin userId "usr_admin_001" matches createAdminJWT() default
  const ADMIN_JWT = createAdminJWT(); // userId: usr_admin_001, role: admin
  const USER_JWT = createTestJWT();   // userId: usr_test_123,  role: user

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.NODE_ENV = "test";
    process.env.GITHUB_CLIENT_ID = "test-github-client-id";
    process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";

    pool = new Pool({ connectionString: DB_URL, max: 5 });
    testDb = drizzle(pool, { schema });

    serverContext = await createTestServer(DB_URL);
    packageDAL = new SkillPackageDAL(testDb);
  }, 60_000);

  afterAll(async () => {
    // Final cleanup: remove all test rows so shared DBs are left clean after the suite.
    await clearAdminTestData(testDb);
    if (serverContext) await closeTestServer(serverContext);
    await pool.end();
  });

  beforeEach(async () => {
    // Per-test cleanup: ensures no leftover rows from a previously failed test
    // can bleed into the next test's assertions (e.g. list-count checks).
    // afterAll alone would not help if a test fails mid-suite.
    await clearAdminTestData(testDb);
  });

  // ── GET /v1/admin/stats ─────────────────────────────────────────────────────

  describe("GET /v1/admin/stats", () => {
    it("returns 200 with stats object for admin", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/stats",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toMatchObject({
        users: expect.objectContaining({ total: expect.any(Number), today: expect.any(Number) }),
        packages: expect.objectContaining({ total: expect.any(Number), today: expect.any(Number) }),
        installs: expect.objectContaining({ total: expect.any(Number) }),
        reports: expect.objectContaining({ pending: expect.any(Number) }),
      });
    });

    it("returns 403 for non-admin authenticated user", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/stats",
        headers: { authorization: `Bearer ${USER_JWT}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 for unauthenticated request", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/stats",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /v1/admin/packages ──────────────────────────────────────────────────

  describe("GET /v1/admin/packages", () => {
    it("returns 200 with packages array for admin", async () => {
      await packageDAL.create(
        SkillPackageFactory.create({ packageId: "admintest-pkg-list-1" }),
      );

      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/packages",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body.packages)).toBe(true);
      expect(body.packages.length).toBeGreaterThanOrEqual(1);
    });

    it("can filter packages by status=active", async () => {
      await packageDAL.create(
        SkillPackageFactory.create({ packageId: "admintest-pkg-active", status: "active" }),
      );

      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/packages?status=active",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.packages.every((p: { status: string }) => p.status === "active")).toBe(true);
    });

    it("returns 403 for non-admin", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/packages",
        headers: { authorization: `Bearer ${USER_JWT}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 for unauthenticated", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/packages",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── PATCH /v1/admin/packages/:id/status ────────────────────────────────────

  describe("PATCH /v1/admin/packages/:id/status", () => {
    it("admin can change package status to banned", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: "admintest-ban-pkg" }),
      );

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: `/v1/admin/packages/${pkg.id}/status`,
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { status: "banned", reason: "policy violation" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe("banned");
    });

    it("admin can change package status to archived", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: "admintest-archive-pkg" }),
      );

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: `/v1/admin/packages/${pkg.id}/status`,
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { status: "archived" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe("archived");
    });

    it("returns 400 for invalid status value", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: "admintest-bad-status-pkg" }),
      );

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: `/v1/admin/packages/${pkg.id}/status`,
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { status: "deleted" }, // not a valid enum value
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 404 when package does not exist", async () => {
      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: "/v1/admin/packages/spkg_nonexistent_admintest/status",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { status: "banned" },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 403 for non-admin", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: "admintest-pkg-403-status" }),
      );

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: `/v1/admin/packages/${pkg.id}/status`,
        headers: { authorization: `Bearer ${USER_JWT}` },
        payload: { status: "banned" },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 for unauthenticated", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: "admintest-pkg-401-status" }),
      );

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: `/v1/admin/packages/${pkg.id}/status`,
        payload: { status: "banned" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /v1/admin/users ─────────────────────────────────────────────────────

  describe("GET /v1/admin/users", () => {
    it("returns 200 with users array for admin", async () => {
      await insertUser(testDb, "usr_admintest_list_1");

      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/users",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body.users)).toBe(true);
      expect(body.users.length).toBeGreaterThanOrEqual(1);
    });

    it("can filter users by query string", async () => {
      await insertUser(testDb, "usr_admintest_search_xyz");

      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/users?query=admintest_search_xyz",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.users.some((u: { id: string }) => u.id === "usr_admintest_search_xyz")).toBe(true);
    });

    it("returns 403 for non-admin", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/users",
        headers: { authorization: `Bearer ${USER_JWT}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 for unauthenticated", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/users",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── PATCH /v1/admin/users/:id/role ─────────────────────────────────────────

  describe("PATCH /v1/admin/users/:id/role", () => {
    it("admin can promote a user to admin role", async () => {
      const target = await insertUser(testDb, "usr_admintest_promote_1", "user");

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: `/v1/admin/users/${target.id}/role`,
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { role: "admin" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.role).toBe("admin");
    });

    it("admin can demote an admin to user role", async () => {
      const target = await insertUser(testDb, "usr_admintest_demote_1", "admin");

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: `/v1/admin/users/${target.id}/role`,
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { role: "user" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.role).toBe("user");
    });

    it("returns 400 for invalid role value", async () => {
      const target = await insertUser(testDb, "usr_admintest_badrole_1");

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: `/v1/admin/users/${target.id}/role`,
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { role: "superuser" }, // invalid
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 404 when user does not exist", async () => {
      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: "/v1/admin/users/usr_nonexistent_admintest_000/role",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { role: "admin" },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 403 for non-admin", async () => {
      const target = await insertUser(testDb, "usr_admintest_role_403");

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: `/v1/admin/users/${target.id}/role`,
        headers: { authorization: `Bearer ${USER_JWT}` },
        payload: { role: "admin" },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 for unauthenticated", async () => {
      const target = await insertUser(testDb, "usr_admintest_role_401");

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: `/v1/admin/users/${target.id}/role`,
        payload: { role: "admin" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /v1/admin/reports ───────────────────────────────────────────────────

  describe("GET /v1/admin/reports", () => {
    it("returns 200 with reports array for admin (default filter: pending)", async () => {
      const reporter = await insertUser(testDb, "usr_admintest_reporter_1");
      await insertReport(testDb, "rpt_admintest_001", reporter.id, "pending");

      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/reports",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body.reports)).toBe(true);
      expect(body.reports.length).toBeGreaterThanOrEqual(1);
      expect(body.reports.every((r: { status: string }) => r.status === "pending")).toBe(true);
    });

    it("can filter reports by status=resolved", async () => {
      const reporter = await insertUser(testDb, "usr_admintest_reporter_2");
      await insertReport(testDb, "rpt_admintest_002", reporter.id, "resolved");

      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/reports?status=resolved",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      // All returned reports should be resolved
      expect(body.reports.every((r: { status: string }) => r.status === "resolved")).toBe(true);
    });

    it("returns all reports when status=all", async () => {
      const reporter = await insertUser(testDb, "usr_admintest_reporter_3");
      await insertReport(testDb, "rpt_admintest_003a", reporter.id, "pending");
      await insertReport(testDb, "rpt_admintest_003b", reporter.id, "resolved");

      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/reports?status=all",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const ids = body.reports.map((r: { id: string }) => r.id);
      expect(ids).toContain("rpt_admintest_003a");
      expect(ids).toContain("rpt_admintest_003b");
    });

    it("returns 403 for non-admin", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/reports",
        headers: { authorization: `Bearer ${USER_JWT}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 for unauthenticated", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/reports",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── PATCH /v1/admin/reports/:id ────────────────────────────────────────────

  describe("PATCH /v1/admin/reports/:id", () => {
    it("admin can resolve a report", async () => {
      const reporter = await insertUser(testDb, "usr_admintest_resolve_r");
      await insertReport(testDb, "rpt_admintest_resolve", reporter.id, "pending");

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: "/v1/admin/reports/rpt_admintest_resolve",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { action: "resolve", note: "Content removed" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe("resolved");
    });

    it("admin can dismiss a report", async () => {
      const reporter = await insertUser(testDb, "usr_admintest_dismiss_r");
      await insertReport(testDb, "rpt_admintest_dismiss", reporter.id, "pending");

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: "/v1/admin/reports/rpt_admintest_dismiss",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { action: "dismiss" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe("dismissed");
    });

    it("returns 400 for invalid action value", async () => {
      const reporter = await insertUser(testDb, "usr_admintest_badact_r");
      await insertReport(testDb, "rpt_admintest_badact", reporter.id, "pending");

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: "/v1/admin/reports/rpt_admintest_badact",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { action: "delete" }, // invalid enum
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 404 when report does not exist", async () => {
      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: "/v1/admin/reports/rpt_admintest_nonexistent_000",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: { action: "resolve" },
      });

      expect(res.statusCode).toBe(404);
    });

    it("returns 403 for non-admin", async () => {
      const reporter = await insertUser(testDb, "usr_admintest_rpt403_r");
      await insertReport(testDb, "rpt_admintest_403", reporter.id, "pending");

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: "/v1/admin/reports/rpt_admintest_403",
        headers: { authorization: `Bearer ${USER_JWT}` },
        payload: { action: "resolve" },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 for unauthenticated", async () => {
      const reporter = await insertUser(testDb, "usr_admintest_rpt401_r");
      await insertReport(testDb, "rpt_admintest_401", reporter.id, "pending");

      const res = await serverContext.fastify.inject({
        method: "PATCH",
        url: "/v1/admin/reports/rpt_admintest_401",
        payload: { action: "resolve" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /v1/admin/audit-verify/:skillId ────────────────────────────────────

  describe("GET /v1/admin/audit-verify/:skillId", () => {
    it("returns valid:true with entries:0 for a skill with no invocation logs", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/audit-verify/spkg_no_logs_admintest",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.valid).toBe(true);
      expect(body.entries).toBe(0);
    });

    it("returns 403 for non-admin", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/audit-verify/spkg_no_logs_admintest",
        headers: { authorization: `Bearer ${USER_JWT}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it("returns 401 for unauthenticated", async () => {
      const res = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/admin/audit-verify/spkg_no_logs_admintest",
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
