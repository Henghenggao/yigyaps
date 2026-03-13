/**
 * Auth Routes Integration Tests
 *
 * Tests GitHub OAuth, Google OAuth, logout, JWT refresh, and session management.
 *
 * Database strategy:
 *   - In CI: uses TEST_DATABASE_URL with a PostgreSQL service container.
 *   - Locally without Docker: falls back to DATABASE_URL (Railway) with a
 *     dedicated test schema, cleared per test suite run.
 *
 * External OAuth HTTP calls are mocked via vi.stubGlobal on fetch.
 *
 * License: Apache 2.0
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
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
import { UserDAL, SessionDAL } from "@yigyaps/db";
import * as schema from "@yigyaps/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Resolve database URL ──────────────────────────────────────────────────────
// In CI, TEST_DATABASE_URL points at a fresh service-container DB.
// Locally, fallback to DATABASE_URL (the Railway instance).

const DB_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/yigyaps_test";

// ── Database cleanup ──────────────────────────────────────────────────────────

// Broader cleanup keyed on test-specific ID prefixes for safety on shared DBs
async function clearTestUsers(db: ReturnType<typeof drizzle>) {
  try {
    // Delete sessions whose user_id starts with our test prefix
    await db.execute(
      sql.raw(`DELETE FROM yy_sessions WHERE user_id LIKE 'usr_%_auth%'`),
    );
    await db.execute(
      sql.raw(`DELETE FROM yy_users WHERE id LIKE 'usr_%_auth%'`),
    );
  } catch {
    // ignore
  }
}

// ── Fetch mock helpers ────────────────────────────────────────────────────────

/**
 * Build a mock fetch that returns different responses based on URL substring.
 */
function makeMockFetch(
  urlMap: Record<string, object>,
): typeof globalThis.fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = input.toString();
    for (const [key, body] of Object.entries(urlMap)) {
      if (url.includes(key)) {
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("Auth Routes Integration Tests", () => {
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;
  let userDAL: UserDAL;
  let sessionDAL: SessionDAL;

  beforeAll(async () => {
    // Set env vars consumed by auth routes and JWT utils
    process.env.JWT_SECRET = "test-jwt-secret-for-auth-integration-tests";
    process.env.NODE_ENV = "test";
    // Provide configured OAuth IDs so routes don't short-circuit with 500
    process.env.GITHUB_CLIENT_ID = "test-github-client-id";
    process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";

    pool = new Pool({ connectionString: DB_URL, max: 5 });
    testDb = drizzle(pool, { schema });

    // Run migrations (idempotent when using a fresh container; skip if tables exist)
    try {
      const migrationsPath = path.resolve(__dirname, "../../../../db/migrations");
      await migrate(testDb, { migrationsFolder: migrationsPath });
    } catch (err: unknown) {
      // "already exists" errors are expected when running against a shared/pre-seeded DB
      if (!(err instanceof Error && err.message.includes("already exists"))) {
        throw err;
      }
    }

    // Belt-and-suspenders: ensure columns added by recent migrations exist even
    // when the migrator skips them (e.g. running against a shared/pre-seeded DB).
    try {
      await testDb.execute(
        sql.raw(
          `ALTER TABLE yy_users ADD COLUMN IF NOT EXISTS terms_accepted_at bigint`,
        ),
      );
    } catch {
      // ignore — column already exists or table not yet created
    }

    serverContext = await createTestServer(DB_URL);

    userDAL = new UserDAL(testDb);
    sessionDAL = new SessionDAL(testDb);
  }, 60000);

  afterAll(async () => {
    await clearTestUsers(testDb);
    if (serverContext) await closeTestServer(serverContext);
    await pool.end();
  });

  beforeEach(async () => {
    await clearTestUsers(testDb);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── GET /v1/auth/github ─────────────────────────────────────────────────────

  describe("GET /v1/auth/github", () => {
    it("should redirect (302) to GitHub authorization URL", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/github",
      });

      expect(response.statusCode).toBe(302);
      const location = response.headers.location as string;
      expect(location).toContain("github.com/login/oauth/authorize");
      expect(location).toContain("client_id=");
      expect(location).toContain("scope=");
      expect(location).toContain("state=");
    });

    it("should set an oauth_state cookie on the redirect", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/github",
      });

      expect(response.statusCode).toBe(302);
      const cookies = response.headers["set-cookie"];
      const cookieStr = Array.isArray(cookies)
        ? cookies.join("; ")
        : String(cookies ?? "");
      expect(cookieStr).toContain("oauth_state=");
    });
  });

  // ── GET /v1/auth/google ─────────────────────────────────────────────────────

  describe("GET /v1/auth/google", () => {
    it("should redirect (302) to Google authorization URL", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/google",
      });

      expect(response.statusCode).toBe(302);
      const location = response.headers.location as string;
      expect(location).toContain("accounts.google.com/o/oauth2/v2/auth");
      expect(location).toContain("client_id=");
      expect(location).toContain("scope=");
      expect(location).toContain("state=");
    });

    it("should set an oauth_state cookie on the redirect", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/google",
      });

      expect(response.statusCode).toBe(302);
      const cookies = response.headers["set-cookie"];
      const cookieStr = Array.isArray(cookies)
        ? cookies.join("; ")
        : String(cookies ?? "");
      expect(cookieStr).toContain("oauth_state=");
    });
  });

  // ── GET /v1/auth/github/callback ────────────────────────────────────────────

  describe("GET /v1/auth/github/callback", () => {
    it("should return 400 when code and state are both missing", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/github/callback",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it("should return 400 when only code is provided (no state)", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/github/callback?code=some-code",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 403 when state cookie does not match query state", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/github/callback?code=some-code&state=tampered-state",
        cookies: {
          oauth_state: "correct-state",
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Forbidden");
    });

    it("should return 403 when oauth_state cookie is absent", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/github/callback?code=some-code&state=some-state",
        // No cookies
      });

      expect(response.statusCode).toBe(403);
    });

    it("should redirect to /auth/error when GitHub returns an error param", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/github/callback?error=access_denied",
      });

      expect(response.statusCode).toBe(302);
      const location = response.headers.location as string;
      expect(location).toContain("/auth/error");
      expect(location).toContain("access_denied");
    });

    it("should set JWT cookie and redirect to /auth/success on valid GitHub OAuth flow", async () => {
      const state = "valid-gh-state-integration-test";
      const githubId = 8881001 + Math.floor(Math.random() * 1000);

      const mockFetch = makeMockFetch({
        "login/oauth/access_token": { access_token: "gha_test_token_123" },
        "api.github.com/user": {
          id: githubId,
          login: `auth-test-gh-${githubId}`,
          name: "Auth Test User",
          email: `auth-test-${githubId}@example.com`,
          avatar_url: "https://avatars.githubusercontent.com/u/8881001",
          bio: null,
          blog: null,
        },
      });
      vi.stubGlobal("fetch", mockFetch);

      const response = await serverContext.fastify.inject({
        method: "GET",
        url: `/v1/auth/github/callback?code=valid-code&state=${state}`,
        cookies: { oauth_state: state },
      });

      expect(response.statusCode).toBe(302);
      const location = response.headers.location as string;
      expect(location).toContain("/auth/success");

      const cookies = response.headers["set-cookie"];
      const cookieStr = Array.isArray(cookies)
        ? cookies.join("; ")
        : String(cookies ?? "");
      expect(cookieStr).toContain("yigyaps_jwt=");
    });

    it("should create a new user in the database on first GitHub login", async () => {
      const state = "gh-new-user-state-integration";
      const githubId = 8882001 + Math.floor(Math.random() * 1000);

      const mockFetch = makeMockFetch({
        "login/oauth/access_token": { access_token: "gha_new_user_token" },
        "api.github.com/user": {
          id: githubId,
          login: `auth-test-newgh-${githubId}`,
          name: "New Auth Test GH User",
          email: `newgh-auth-${githubId}@example.com`,
          avatar_url: "https://avatars.githubusercontent.com/u/8882001",
          bio: null,
          blog: null,
        },
      });
      vi.stubGlobal("fetch", mockFetch);

      await serverContext.fastify.inject({
        method: "GET",
        url: `/v1/auth/github/callback?code=new-code&state=${state}`,
        cookies: { oauth_state: state },
      });

      const user = await userDAL.getByGithubId(String(githubId));
      expect(user).not.toBeNull();
      expect(user?.githubUsername).toBe(`auth-test-newgh-${githubId}`);
    });

    it("should redirect to /auth/error when GitHub token exchange fails", async () => {
      const state = "gh-token-fail-state-integration";

      const mockFetch = makeMockFetch({
        "login/oauth/access_token": { error: "bad_verification_code" },
      });
      vi.stubGlobal("fetch", mockFetch);

      const response = await serverContext.fastify.inject({
        method: "GET",
        url: `/v1/auth/github/callback?code=bad-code&state=${state}`,
        cookies: { oauth_state: state },
      });

      expect(response.statusCode).toBe(302);
      const location = response.headers.location as string;
      expect(location).toContain("/auth/error");
    });
  });

  // ── GET /v1/auth/google/callback ────────────────────────────────────────────

  describe("GET /v1/auth/google/callback", () => {
    it("should return 400 when code and state are both missing", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/google/callback",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 403 when state cookie does not match", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/google/callback?code=some-code&state=wrong-state",
        cookies: { oauth_state: "correct-state" },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Forbidden");
    });

    it("should redirect to /auth/error when Google returns an error param", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/google/callback?error=access_denied",
      });

      expect(response.statusCode).toBe(302);
      const location = response.headers.location as string;
      expect(location).toContain("/auth/error");
    });

    it("should set JWT cookie and redirect to /auth/success on valid Google OAuth flow", async () => {
      const state = "valid-google-state-integration-test";
      const uid = "google_auth_test_uid_" + Math.floor(Math.random() * 100000);

      const mockFetch = makeMockFetch({
        "oauth2.googleapis.com/token": { access_token: "goog_test_token_123" },
        "googleapis.com/oauth2/v2/userinfo": {
          id: uid,
          email: `google-auth-test-${uid}@example.com`,
          name: "Google Auth Test User",
          picture: "https://lh3.googleusercontent.com/a/test",
        },
      });
      vi.stubGlobal("fetch", mockFetch);

      const response = await serverContext.fastify.inject({
        method: "GET",
        url: `/v1/auth/google/callback?code=google-code&state=${state}`,
        cookies: { oauth_state: state },
      });

      expect(response.statusCode).toBe(302);
      const location = response.headers.location as string;
      expect(location).toContain("/auth/success");

      const cookies = response.headers["set-cookie"];
      const cookieStr = Array.isArray(cookies)
        ? cookies.join("; ")
        : String(cookies ?? "");
      expect(cookieStr).toContain("yigyaps_jwt=");
    });

    it("should create a new user in the database on first Google login", async () => {
      const state = "google-new-user-state-integration";
      const uid = "google_auth_new_" + Math.floor(Math.random() * 100000);

      const mockFetch = makeMockFetch({
        "oauth2.googleapis.com/token": { access_token: "goog_new_user_token" },
        "googleapis.com/oauth2/v2/userinfo": {
          id: uid,
          email: `newgoogle-auth-${uid}@example.com`,
          name: "New Google Auth User",
          picture: "https://lh3.googleusercontent.com/a/new",
        },
      });
      vi.stubGlobal("fetch", mockFetch);

      await serverContext.fastify.inject({
        method: "GET",
        url: `/v1/auth/google/callback?code=new-google-code&state=${state}`,
        cookies: { oauth_state: state },
      });

      const user = await userDAL.getByGoogleId(uid);
      expect(user).not.toBeNull();
      expect(user?.email).toContain("newgoogle-auth-");
    });

    it("should redirect to /auth/error when Google token exchange fails", async () => {
      const state = "google-token-fail-state-integration";

      const mockFetch = makeMockFetch({
        "oauth2.googleapis.com/token": { error: "invalid_grant" },
      });
      vi.stubGlobal("fetch", mockFetch);

      const response = await serverContext.fastify.inject({
        method: "GET",
        url: `/v1/auth/google/callback?code=bad-google-code&state=${state}`,
        cookies: { oauth_state: state },
      });

      expect(response.statusCode).toBe(302);
      const location = response.headers.location as string;
      expect(location).toContain("/auth/error");
    });
  });

  // ── POST /v1/auth/logout ────────────────────────────────────────────────────

  describe("POST /v1/auth/logout", () => {
    it("should return 401 without authentication", async () => {
      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/logout",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 200 and clear auth cookie for authenticated user", async () => {
      const now = Date.now();
      const userId = `usr_${now}_auth_logout_cookie`;

      await userDAL.create({
        id: userId,
        githubId: `gh_logout_cookie_${now}`,
        githubUsername: `logout-cookie-${now}`,
        email: `logout-cookie-${now}@test.com`,
        displayName: "Logout Cookie Test User",
        avatarUrl: "https://avatars.test/u/logout-cookie",
        tier: "free",
        role: "user",
        isVerifiedCreator: false,
        totalPackages: 0,
        totalEarningsUsd: "0",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });

      const jwt = createTestJWT({ userId });

      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/logout",
        headers: { authorization: `Bearer ${jwt}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Auth cookie should be cleared (Fastify sets Max-Age=0)
      const cookies = response.headers["set-cookie"];
      const cookieStr = Array.isArray(cookies)
        ? cookies.join("; ")
        : String(cookies ?? "");
      expect(cookieStr).toMatch(/yigyaps_jwt=;/);
    });

    it("should delete the session record when session_token cookie is present", async () => {
      const now = Date.now();
      const userId = `usr_${now}_auth_sess_logout`;

      // Create user and session directly in DB
      const user = await userDAL.create({
        id: userId,
        githubId: `gh_logout_test_${now}`,
        githubUsername: `logout-test-${now}`,
        email: `logout-${now}@test.com`,
        displayName: "Logout Test User",
        avatarUrl: "https://avatars.test/u/logout",
        tier: "free",
        role: "user",
        isVerifiedCreator: false,
        totalPackages: 0,
        totalEarningsUsd: "0",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });

      const sessionToken = `test-session-token-${now}`;
      await sessionDAL.create({
        id: `sess_${now}_auth_logout`,
        userId: user.id,
        sessionToken,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000,
        createdAt: now,
        lastActiveAt: now,
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      });

      const jwt = createTestJWT({ userId: user.id });

      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/logout",
        headers: { authorization: `Bearer ${jwt}` },
        cookies: { session_token: sessionToken },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);

      // Verify session was actually deleted from the database
      const deletedSession = await sessionDAL.getByToken(sessionToken);
      expect(deletedSession).toBeNull();
    });
  });

  // ── GET /v1/auth/refresh ────────────────────────────────────────────────────

  describe("GET /v1/auth/refresh", () => {
    it("should return 401 without authentication", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/refresh",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 200 with refreshed:false for a freshly-issued token (far from 48h expiry)", async () => {
      const now = Date.now();
      const userId = `usr_${now}_auth_refresh_ok`;

      // Create user so getById can find it if refresh is attempted
      await userDAL.create({
        id: userId,
        githubId: `gh_refresh_ok_${now}`,
        githubUsername: `refresh-ok-${now}`,
        email: `refresh-ok-${now}@test.com`,
        displayName: "Refresh OK User",
        avatarUrl: "https://avatars.test/u/refresh",
        tier: "free",
        role: "user",
        isVerifiedCreator: false,
        totalPackages: 0,
        totalEarningsUsd: "0",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });

      // 7-day token → remaining ≈ 7d >> 48h → no refresh needed
      const jwt = createTestJWT({ userId });

      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/refresh",
        headers: { authorization: `Bearer ${jwt}` },
        cookies: { yigyaps_jwt: jwt },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // A freshly issued 7d token is far from the 48h threshold → not refreshed
      expect(body.refreshed).toBe(false);
    });

    it("should return 200 with refreshed:true and a new cookie for a near-expiry token", async () => {
      const now = Date.now();
      const userId = `usr_${now}_auth_refresh_near`;

      await userDAL.create({
        id: userId,
        githubId: `gh_refresh_near_${now}`,
        githubUsername: `refresh-near-${now}`,
        email: `refresh-near-${now}@test.com`,
        displayName: "Refresh Near User",
        avatarUrl: "https://avatars.test/u/near",
        tier: "free",
        role: "user",
        isVerifiedCreator: false,
        totalPackages: 0,
        totalEarningsUsd: "0",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });

      // Sign a 1h token → remaining ≈ 1h << 48h → should trigger refresh
      const { signJWT } = await import("../../../src/lib/jwt.js");
      const shortJwt = signJWT(
        {
          userId,
          userName: "Refresh Near User",
          githubUsername: `refresh-near-${now}`,
          tier: "free",
          role: "user",
        },
        "1h",
      );

      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/refresh",
        headers: { authorization: `Bearer ${shortJwt}` },
        cookies: { yigyaps_jwt: shortJwt },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.refreshed).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe(userId);

      // Should set a new JWT cookie
      const cookies = response.headers["set-cookie"];
      const cookieStr = Array.isArray(cookies)
        ? cookies.join("; ")
        : String(cookies ?? "");
      expect(cookieStr).toContain("yigyaps_jwt=");
    });

    it("should return 404 when authenticated user is not in the database and refresh is needed", async () => {
      const { signJWT } = await import("../../../src/lib/jwt.js");
      // 1h token → within 48h threshold → DB lookup needed → user not found → 404
      const shortJwt = signJWT(
        {
          userId: "usr_nonexistent_user_ghost",
          userName: "Ghost User",
          githubUsername: "ghost",
          tier: "free",
          role: "user",
        },
        "1h",
      );

      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/refresh",
        headers: { authorization: `Bearer ${shortJwt}` },
        cookies: { yigyaps_jwt: shortJwt },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ── POST /v1/auth/accept-terms ──────────────────────────────────────────────

  describe("POST /v1/auth/accept-terms", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/accept-terms",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 200 and mark user as having accepted terms when authenticated", async () => {
      const now = Date.now();
      const userId = `usr_${now}_auth_accept_terms`;

      await userDAL.create({
        id: userId,
        githubId: `gh_terms_${now}`,
        githubUsername: `terms-test-${now}`,
        email: `terms-${now}@test.com`,
        displayName: "Terms Test User",
        avatarUrl: "https://avatars.test/u/terms",
        tier: "free",
        role: "user",
        isVerifiedCreator: false,
        totalPackages: 0,
        totalEarningsUsd: "0",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });

      const jwt = createTestJWT({ userId });

      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/auth/accept-terms",
        headers: { authorization: `Bearer ${jwt}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.userId).toBe(userId);
      expect(typeof body.acceptedAt).toBe("number");
      expect(body.acceptedAt).toBeGreaterThan(0);

      // Verify acceptance was persisted to yy_users
      const updatedUser = await userDAL.getById(userId);
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.termsAcceptedAt).not.toBeNull();
      expect(updatedUser?.termsAcceptedAt).toBeGreaterThan(0);
      expect(updatedUser?.termsAcceptedAt).toBe(body.acceptedAt);
    });
  });

  // ── GET /v1/auth/me ─────────────────────────────────────────────────────────

  describe("GET /v1/auth/me", () => {
    it("should return 401 without authentication", async () => {
      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/me",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return user profile for authenticated user that exists in the database", async () => {
      const now = Date.now();
      const userId = `usr_${now}_auth_me`;

      await userDAL.create({
        id: userId,
        githubId: `gh_me_${now}`,
        githubUsername: `me-test-${now}`,
        email: `me-${now}@test.com`,
        displayName: "Me Test User",
        avatarUrl: "https://avatars.test/u/me",
        tier: "free",
        role: "user",
        isVerifiedCreator: false,
        totalPackages: 0,
        totalEarningsUsd: "0",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });

      const jwt = createTestJWT({ userId });

      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/me",
        headers: { authorization: `Bearer ${jwt}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(userId);
      expect(body.githubUsername).toBe(`me-test-${now}`);
      expect(body.email).toBe(`me-${now}@test.com`);
    });

    it("should return 404 when authenticated user is not in the database", async () => {
      const jwt = createTestJWT({ userId: "usr_ghost_does_not_exist_999" });

      const response = await serverContext.fastify.inject({
        method: "GET",
        url: "/v1/auth/me",
        headers: { authorization: `Bearer ${jwt}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
