/**
 * Skill Pack Routes Integration Tests
 *
 * Verifies that SkillPack Bridge artifacts can be stored under a YAP.
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

const DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/yigyaps_test";

async function clearSkillPackTestData(db: ReturnType<typeof drizzle>) {
  await db.execute(sql.raw(`TRUNCATE TABLE yy_skill_pack_artifacts RESTART IDENTITY CASCADE`));
  await db.execute(sql.raw(`TRUNCATE TABLE yy_skill_packs RESTART IDENTITY CASCADE`));
  await db.execute(sql.raw(`TRUNCATE TABLE yy_yaps RESTART IDENTITY CASCADE`));
}

async function createYap(serverContext: TestServerContext, token: string) {
  const res = await serverContext.fastify.inject({
    method: "POST",
    url: "/v1/yaps",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      slug: "yigfinance",
      version: "0.7.0",
      displayName: "Yigfinance",
      description: "CFO-grade finance analysis YAP",
      category: "finance",
    },
  });
  expect(res.statusCode).toBe(201);
  return res.json();
}

function sampleSkillPackPayload() {
  return {
    name: "yigfinance-core",
    version: "0.7.0",
    displayName: "Yigfinance Core",
    description: "Core Yigfinance SkillPack Bridge artifacts",
    packType: "core",
    contractVersion: "1.0",
    compatibility: { yigthinker: ">=0.3.0 <0.5.0" },
    manifest: {
      name: "yigfinance",
      version: "0.7.0",
      contract_version: "1.0",
      routes: "routes.json",
      tool_map: "tool-map.json",
    },
    artifacts: [
      {
        artifactType: "routes",
        artifactPath: "routes.json",
        content: {
          contract_version: "1.0",
          skills: { "variance-review": { next_candidates: [] } },
        },
      },
      {
        artifactType: "tool-map",
        artifactPath: "tool-map.json",
        content: {
          contract_version: "1.0",
          mappings: {
            "finance-calc.variance_bridge": {
              tool: "finance_analyze",
              args: { method: "variance_bridge" },
            },
          },
          unmapped: [],
        },
      },
      {
        artifactType: "schema",
        artifactPath: "schemas/variance-review.schema.json",
        content: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
        },
      },
    ],
  };
}

describe("Skill Pack Routes", () => {
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;

  const ADMIN_JWT = createAdminJWT();
  const OTHER_JWT = createTestJWT({
    userId: "usr_other_user",
    userName: "Other User",
    githubUsername: "otheruser",
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.NODE_ENV = "test";

    pool = new Pool({ connectionString: DB_URL, max: 5 });
    testDb = drizzle(pool);
    serverContext = await createTestServer(DB_URL);
  });

  afterAll(async () => {
    await clearSkillPackTestData(testDb);
    await closeTestServer(serverContext);
    await pool.end();
  });

  beforeEach(async () => {
    await clearSkillPackTestData(testDb);
  });

  it("stores a SkillPack and its Bridge artifacts under a YAP", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    const createRes = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/skill-packs`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: sampleSkillPackPayload(),
    });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.headers.location).toMatch(
      new RegExp(`^/v1/yaps/${yap.id}/skill-packs/spack_`),
    );
    const body = createRes.json();
    expect(body.skillPack).toMatchObject({
      yapId: yap.id,
      name: "yigfinance-core",
      version: "0.7.0",
      packType: "core",
      contractVersion: "1.0",
    });
    expect(body.artifacts).toHaveLength(4);
    expect(body.artifacts.map((a: { artifactType: string }) => a.artifactType)).toEqual(
      expect.arrayContaining(["skillpack", "routes", "tool-map", "schema"]),
    );
    expect(body.artifacts[0].contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("lists and filters artifacts for a SkillPack", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    const createRes = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.slug}/skill-packs`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: sampleSkillPackPayload(),
    });
    const { skillPack } = createRes.json();

    const routesRes = await serverContext.fastify.inject({
      method: "GET",
      url: `/v1/yaps/${yap.slug}/skill-packs/${skillPack.id}/artifacts?artifactType=routes`,
    });

    expect(routesRes.statusCode).toBe(200);
    const routesBody = routesRes.json();
    expect(routesBody.total).toBe(1);
    expect(routesBody.artifacts[0]).toMatchObject({
      artifactType: "routes",
      artifactPath: "routes.json",
      skillPackId: skillPack.id,
    });

    const artifactRes = await serverContext.fastify.inject({
      method: "GET",
      url: `/v1/yaps/${yap.slug}/skill-packs/${skillPack.id}/artifacts/${routesBody.artifacts[0].id}`,
    });
    expect(artifactRes.statusCode).toBe(200);
    expect(artifactRes.json()).toMatchObject({
      artifactType: "routes",
      content: {
        contract_version: "1.0",
      },
    });
  });

  it("refreshes SkillPack metadata and replaces artifacts", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    const createRes = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.slug}/skill-packs`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: sampleSkillPackPayload(),
    });
    const { skillPack } = createRes.json();

    const updateRes = await serverContext.fastify.inject({
      method: "PATCH",
      url: `/v1/yaps/${yap.slug}/skill-packs/${skillPack.id}`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        compatibility: {
          yigthinker: ">=0.3.0 <0.5.0",
          "yigcore-addins": ">=0.1.0 <1.0.0",
        },
        manifest: {
          ...sampleSkillPackPayload().manifest,
          compatibility: {
            yigthinker: ">=0.3.0 <0.5.0",
            "yigcore-addins": ">=0.1.0 <1.0.0",
          },
        },
        artifacts: [
          {
            artifactType: "routes",
            artifactPath: "routes.json",
            content: {
              contract_version: "1.0",
              skills: { "forecast-review": { next_candidates: [] } },
            },
          },
        ],
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const body = updateRes.json();
    expect(body.skillPack).toMatchObject({
      id: skillPack.id,
      compatibility: {
        "yigcore-addins": ">=0.1.0 <1.0.0",
      },
      manifest: {
        compatibility: {
          "yigcore-addins": ">=0.1.0 <1.0.0",
        },
      },
    });
    expect(body.artifacts).toHaveLength(2);
    expect(
      body.artifacts.map((artifact: { artifactPath: string }) => artifact.artifactPath),
    ).toEqual(expect.arrayContaining(["skillpack.json", "routes.json"]));

    const artifactsRes = await serverContext.fastify.inject({
      method: "GET",
      url: `/v1/yaps/${yap.slug}/skill-packs/${skillPack.id}/artifacts`,
    });
    expect(artifactsRes.json().total).toBe(2);
  });

  it("rejects duplicate SkillPack name and version within a YAP", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    const payload = sampleSkillPackPayload();

    const first = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/skill-packs`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload,
    });
    expect(first.statusCode).toBe(201);

    const second = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/skill-packs`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload,
    });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({
      error: "Skill Pack version already exists",
      name: "yigfinance-core",
      version: "0.7.0",
    });
  });

  it("rejects absolute and traversal artifact paths", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    const invalidPaths = [
      "../routes.json",
      "/routes.json",
      "C:\\routes.json",
      "\\\\server\\share\\routes.json",
    ];

    for (const artifactPath of invalidPaths) {
      const payload = sampleSkillPackPayload();
      payload.name = `bad-path-${invalidPaths.indexOf(artifactPath)}`;
      payload.artifacts = [
        {
          ...payload.artifacts[0],
          artifactPath,
        },
      ];

      const res = await serverContext.fastify.inject({
        method: "POST",
        url: `/v1/yaps/${yap.id}/skill-packs`,
        headers: { authorization: `Bearer ${ADMIN_JWT}` },
        payload,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({
        error: "Bad Request",
        message: "Validation failed",
      });
    }
  });

  it("allows only the YAP owner or admin to attach SkillPacks", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    const res = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/skill-packs`,
      headers: { authorization: `Bearer ${OTHER_JWT}` },
      payload: sampleSkillPackPayload(),
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      error: "Not authorized to update this YAP",
    });
  });
});
