/**
 * YAP Routes Integration Tests
 *
 * Verifies that YAPs are top-level containers, distinct from legacy packages.
 *
 * License: Apache 2.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import {
  createTestServer,
  closeTestServer,
  type TestServerContext,
} from "../helpers/test-server.js";
import {
  createAdminJWT,
  createTestJWT,
} from "../../unit/helpers/jwt-helpers.js";
import { getTestDatabaseUrl } from "../helpers/test-db-url.js";

const DB_URL = getTestDatabaseUrl();

async function clearYapTestData(db: ReturnType<typeof drizzle>) {
  await db.execute(sql.raw(`TRUNCATE TABLE yy_yaps RESTART IDENTITY CASCADE`));
}

describe("YAP Routes", () => {
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;

  const ADMIN_JWT = createAdminJWT();
  const OWNER_JWT = createTestJWT({
    userId: "usr_yap_owner",
    userName: "YAP Owner",
    githubUsername: "yapowner",
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.NODE_ENV = "test";

    pool = new Pool({ connectionString: DB_URL, max: 5 });
    testDb = drizzle(pool);
    serverContext = await createTestServer(DB_URL);
  });

  afterAll(async () => {
    await clearYapTestData(testDb);
    await closeTestServer(serverContext);
    await pool.end();
  });

  beforeEach(async () => {
    await clearYapTestData(testDb);
  });

  it("creates and reads yigfinance as a distinct YAP", async () => {
    const createRes = await serverContext.fastify.inject({
      method: "POST",
      url: "/v1/yaps",
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        slug: "yigfinance",
        version: "0.7.0",
        displayName: "Yigfinance",
        description: "CFO-grade finance analysis YAP",
        category: "finance",
        tags: ["finance", "cfo"],
        assemblyConfig: {
          defaultExtensionPack: "eto-professional-project-pack",
        },
      },
    });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.headers.location).toMatch(/^\/v1\/yaps\/yap_/);
    const created = createRes.json();
    expect(created).toMatchObject({
      slug: "yigfinance",
      version: "0.7.0",
      displayName: "Yigfinance",
      ownerId: "usr_admin_001",
      assemblyConfig: {
        defaultExtensionPack: "eto-professional-project-pack",
      },
    });
    expect(created.id).toMatch(/^yap_\d+_[a-f0-9]{8}$/);

    const readRes = await serverContext.fastify.inject({
      method: "GET",
      url: "/v1/yaps/by-slug/yigfinance",
    });

    expect(readRes.statusCode).toBe(200);
    expect(readRes.json()).toMatchObject({
      id: created.id,
      slug: "yigfinance",
    });

    const legacyPackageRes = await serverContext.fastify.inject({
      method: "GET",
      url: "/v1/packages/by-pkg/yigfinance",
    });
    expect(legacyPackageRes.statusCode).toBe(404);
  });

  it("rejects duplicate YAP slugs", async () => {
    const payload = {
      slug: "duplicate-yap",
      displayName: "Duplicate YAP",
      description: "First YAP with this slug",
    };

    const first = await serverContext.fastify.inject({
      method: "POST",
      url: "/v1/yaps",
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload,
    });
    expect(first.statusCode).toBe(201);

    const second = await serverContext.fastify.inject({
      method: "POST",
      url: "/v1/yaps",
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload,
    });

    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({
      error: "YAP slug already exists",
      slug: "duplicate-yap",
    });
  });

  it("keeps private YAPs hidden from public reads but visible to owners", async () => {
    const createRes = await serverContext.fastify.inject({
      method: "POST",
      url: "/v1/yaps",
      headers: { authorization: `Bearer ${OWNER_JWT}` },
      payload: {
        slug: "private-yap",
        displayName: "Private YAP",
        description: "Private YAP for owner-only assembly",
        visibility: "private",
      },
    });
    expect(createRes.statusCode).toBe(201);

    const publicRead = await serverContext.fastify.inject({
      method: "GET",
      url: "/v1/yaps/by-slug/private-yap",
    });
    expect(publicRead.statusCode).toBe(404);

    const ownerRead = await serverContext.fastify.inject({
      method: "GET",
      url: "/v1/yaps/by-slug/private-yap",
      headers: { authorization: `Bearer ${OWNER_JWT}` },
    });
    expect(ownerRead.statusCode).toBe(200);
    expect(ownerRead.json()).toMatchObject({
      slug: "private-yap",
      visibility: "private",
      ownerId: "usr_yap_owner",
    });
  });

  it("lists public YAPs with bounded pagination", async () => {
    for (const slug of ["public-yap-a", "public-yap-b"]) {
      await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/yaps",
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload: {
          slug,
          displayName: slug,
          description: `Public YAP ${slug}`,
          category: "finance",
        },
      });
    }

    const res = await serverContext.fastify.inject({
      method: "GET",
      url: "/v1/yaps?category=finance&limit=1&offset=0",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.yaps).toHaveLength(1);
    expect(body.total).toBe(2);
    expect(body).toMatchObject({ limit: 1, offset: 0 });
  });
});
