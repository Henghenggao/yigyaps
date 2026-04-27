/**
 * YAP Assembly Routes Integration Tests
 *
 * Verifies that a YAP can resolve a core pack plus enabled mounted packs into
 * a merged manifest/read model.
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
import { createAdminJWT } from "../../unit/helpers/jwt-helpers.js";

const DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/yigyaps_test";

async function clearAssemblyTestData(db: ReturnType<typeof drizzle>) {
  await db.execute(sql.raw(`TRUNCATE TABLE yy_yap_pack_mounts RESTART IDENTITY CASCADE`));
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
      assemblyConfig: {
        corePack: { name: "yigfinance", version: "0.7.0" },
        mountedPacks: [],
      },
    },
  });
  expect(res.statusCode).toBe(201);
  return res.json();
}

async function createSkillPack(
  serverContext: TestServerContext,
  token: string,
  yapId: string,
  params: {
    name: string;
    packType: "core" | "extension";
    compatibility?: Record<string, string>;
    skills: Array<Record<string, unknown>>;
    routeSkills: Record<string, unknown>;
    toolMappings: Record<string, unknown>;
    schemaPath: string;
  },
) {
  const res = await serverContext.fastify.inject({
    method: "POST",
    url: `/v1/yaps/${yapId}/skill-packs`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: params.name,
      version: "0.7.0",
      displayName: params.name,
      description: `${params.name} SkillPack Bridge artifacts`,
      packType: params.packType,
      contractVersion: "1.0",
      compatibility: params.compatibility ?? {},
      manifest: {
        name: params.name,
        version: "0.7.0",
        contract_version: "1.0",
        skills: params.skills,
      },
      artifacts: [
        {
          artifactType: "routes",
          artifactPath: "routes.json",
          content: {
            contract_version: "1.0",
            skills: params.routeSkills,
          },
        },
        {
          artifactType: "tool-map",
          artifactPath: "tool-map.json",
          content: {
            contract_version: "1.0",
            mappings: params.toolMappings,
          },
        },
        {
          artifactType: "schema",
          artifactPath: params.schemaPath,
          content: {
            type: "object",
            title: params.schemaPath,
          },
        },
      ],
    },
  });
  expect(res.statusCode).toBe(201);
  return res.json().skillPack;
}

describe("YAP Assembly Routes", () => {
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;
  const ADMIN_JWT = createAdminJWT();

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.NODE_ENV = "test";

    pool = new Pool({ connectionString: DB_URL, max: 5 });
    testDb = drizzle(pool);
    serverContext = await createTestServer(DB_URL);
  });

  afterAll(async () => {
    await clearAssemblyTestData(testDb);
    await closeTestServer(serverContext);
    await pool.end();
  });

  beforeEach(async () => {
    await clearAssemblyTestData(testDb);
  });

  it("resolves core plus enabled extension mounts into a merged YAP manifest", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    await createSkillPack(serverContext, ADMIN_JWT, yap.id, {
      name: "yigfinance",
      packType: "core",
      skills: [{ name: "variance-review", version: "0.7.0", status: "stable" }],
      routeSkills: {
        "variance-review": { next_candidates: ["management-pack"] },
      },
      toolMappings: {
        "finance-calc.variance_bridge": { tool: "finance_variance_bridge" },
      },
      schemaPath: "schemas/variance-review.schema.json",
    });
    const extensionPack = await createSkillPack(serverContext, ADMIN_JWT, yap.id, {
      name: "eto-professional-project",
      packType: "extension",
      skills: [
        { name: "project-margin-review", version: "0.7.0", status: "stable" },
      ],
      routeSkills: {
        "project-margin-review": { next_candidates: ["risk-review"] },
      },
      toolMappings: {
        "finance-calc.project_margin": { tool: "finance_project_margin" },
      },
      schemaPath: "schemas/project-margin-review.schema.json",
    });

    const mountRes = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/mounts`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        skillPackId: extensionPack.id,
        mountKey: "default-project-pack",
        mountPoint: "extensions/project",
        priority: 10,
      },
    });
    expect(mountRes.statusCode).toBe(201);

    const assemblyRes = await serverContext.fastify.inject({
      method: "GET",
      url: `/v1/yaps/${yap.slug}/assembly`,
    });

    expect(assemblyRes.statusCode).toBe(200);
    expect(assemblyRes.headers["cache-control"]).toBe("no-store");
    const body = assemblyRes.json();
    expect(body.corePack.skillPack.name).toBe("yigfinance");
    expect(body.mountedPacks).toHaveLength(1);
    expect(body.mountedPacks[0]).toMatchObject({
      mount: { mountKey: "default-project-pack" },
      skillPack: { name: "eto-professional-project" },
    });
    expect(body.merged.packOrder).toEqual([
      body.corePack.skillPack.id,
      extensionPack.id,
    ]);
    expect(body.merged.skills.map((skill: { name: string }) => skill.name)).toEqual(
      ["variance-review", "project-margin-review"],
    );
    expect(body.merged.routes.skills).toMatchObject({
      "variance-review": { next_candidates: ["management-pack"] },
      "project-margin-review": { next_candidates: ["risk-review"] },
    });
    expect(body.merged.toolMap.mappings).toMatchObject({
      "finance-calc.variance_bridge": { tool: "finance_variance_bridge" },
      "finance-calc.project_margin": { tool: "finance_project_margin" },
    });
    expect(Object.keys(body.merged.schemas)).toEqual(
      expect.arrayContaining([
        "schemas/variance-review.schema.json",
        "schemas/project-margin-review.schema.json",
      ]),
    );
    expect(body.diagnostics.conflicts).toEqual([]);
  });

  it("exposes a compact remote manifest for Yigthinker and add-in hosts", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    await createSkillPack(serverContext, ADMIN_JWT, yap.id, {
      name: "yigfinance",
      packType: "core",
      compatibility: { yigthinker: ">=0.3.0 <0.5.0" },
      skills: [{ name: "variance-review", version: "0.7.0", status: "stable" }],
      routeSkills: {
        "variance-review": { next_candidates: ["management-pack"] },
      },
      toolMappings: {
        "finance-calc.variance_bridge": { tool: "finance_variance_bridge" },
      },
      schemaPath: "schemas/variance-review.schema.json",
    });
    const extensionPack = await createSkillPack(serverContext, ADMIN_JWT, yap.id, {
      name: "eto-professional-projects",
      packType: "extension",
      compatibility: { yigthinker: ">=0.3.0 <0.5.0" },
      skills: [
        {
          name: "eto-project-review",
          version: "0.1.0",
          status: "stable",
          description: "Review ETO project margin risk",
        },
      ],
      routeSkills: {
        "eto-project-review": { next_candidates: ["risk-review"] },
      },
      toolMappings: {
        "finance-calc.eto_project_margin": {
          tool: "finance_eto_project_margin",
          skill: "eto-project-review",
        },
      },
      schemaPath: "schemas/eto-project-review.schema.json",
    });

    const mountRes = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/mounts`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        skillPackId: extensionPack.id,
        mountKey: "eto",
        mountPoint: "extensions/project",
        priority: 10,
      },
    });
    expect(mountRes.statusCode).toBe(201);

    const manifestRes = await serverContext.fastify.inject({
      method: "GET",
      url: `/v1/yaps/${yap.slug}/remote-manifest?host=yigthinker&hostVersion=0.3.1&mountKeys=eto`,
      headers: { host: "api.test", "x-forwarded-proto": "https" },
    });

    expect(manifestRes.statusCode).toBe(200);
    expect(manifestRes.headers["cache-control"]).toBe("public, max-age=60");
    expect(manifestRes.headers.etag).toMatch(/^"[a-f0-9]{64}"$/);
    const body = manifestRes.json();
    expect(body).toMatchObject({
      schemaVersion: "yigyaps.remote-manifest.v1",
      product: {
        slug: "yigfinance",
        version: "0.7.0",
        visibility: "public",
      },
      host: {
        target: "yigthinker",
        version: "0.3.1",
        compatibility: { status: "compatible" },
      },
      remote: {
        baseUrl: expect.stringMatching(/^https:\/\//),
        endpoints: {
          assembly: expect.stringMatching(
            /^https:\/\/.+\/v1\/yaps\/yigfinance\/assembly$/,
          ),
          runtimePlan: expect.stringMatching(
            /^https:\/\/.+\/v1\/yaps\/yigfinance\/runtime-plans$/,
          ),
          remoteManifest:
            expect.stringMatching(
              /^https:\/\/.+\/v1\/yaps\/yigfinance\/remote-manifest$/,
            ),
        },
        invocationModes: ["local-plan", "hosted-plan"],
      },
      assembly: {
        skillCount: 2,
        routeCount: 2,
        toolMappingCount: 2,
        schemaCount: 2,
        conflictCount: 0,
        warningCount: 0,
      },
      artifacts: {
        fetchMode: "assembly",
      },
    });
    expect(body.assembly.corePack).toMatchObject({
      name: "yigfinance",
      packType: "core",
      mountKey: null,
    });
    expect(body.assembly.mountedPacks).toEqual([
      expect.objectContaining({
        name: "eto-professional-projects",
        mountKey: "eto",
        mountPoint: "extensions/project",
      }),
    ]);
    expect(body.artifacts.index).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifactPath: "schemas/eto-project-review.schema.json",
          sourceMountKey: "eto",
        }),
      ]),
    );

    const cachedRes = await serverContext.fastify.inject({
      method: "GET",
      url: `/v1/yaps/${yap.slug}/remote-manifest?host=yigthinker&hostVersion=0.3.1&mountKeys=eto`,
      headers: {
        host: "api.test",
        "x-forwarded-proto": "https",
        "if-none-match": manifestRes.headers.etag,
      },
    });
    expect(cachedRes.statusCode).toBe(304);
  });

  it("plans candidate runtime skills from a resolved YAP assembly", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    await createSkillPack(serverContext, ADMIN_JWT, yap.id, {
      name: "yigfinance",
      packType: "core",
      skills: [{ name: "variance-review", version: "0.7.0", status: "stable" }],
      routeSkills: {
        "variance-review": { next_candidates: ["project-margin-review"] },
      },
      toolMappings: {
        "finance-calc.variance_bridge": {
          tool: "finance_variance_bridge",
          skill: "variance-review",
        },
      },
      schemaPath: "schemas/variance-review.schema.json",
    });
    const extensionPack = await createSkillPack(serverContext, ADMIN_JWT, yap.id, {
      name: "eto-professional-project",
      packType: "extension",
      skills: [
        {
          name: "project-margin-review",
          version: "0.7.0",
          status: "stable",
          description: "Review ETO project margin and project risk",
        },
      ],
      routeSkills: {
        "project-margin-review": { next_candidates: ["variance-review"] },
      },
      toolMappings: {
        "finance-calc.project_margin": {
          tool: "finance_project_margin",
          skill: "project-margin-review",
        },
      },
      schemaPath: "schemas/project-margin-review.schema.json",
    });

    const mountRes = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/mounts`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        skillPackId: extensionPack.id,
        mountKey: "eto",
        mountPoint: "extensions/project",
        priority: 10,
      },
    });
    expect(mountRes.statusCode).toBe(201);

    const planRes = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.slug}/runtime-plans`,
      payload: {
        task: "Review ETO project margin risk",
        maxCandidates: 2,
      },
    });

    expect(planRes.statusCode).toBe(200);
    expect(planRes.headers["cache-control"]).toBe("no-store");
    const body = planRes.json();
    expect(body).toMatchObject({
      yap: { slug: "yigfinance" },
      status: "ready",
    });
    expect(body.candidates[0]).toMatchObject({
      skill: { name: "project-margin-review" },
      routeKey: "project-margin-review",
      sourceMountKey: "eto",
      toolMappings: {
        "finance-calc.project_margin": {
          tool: "finance_project_margin",
        },
      },
      schemaKeys: ["schemas/project-margin-review.schema.json"],
    });
  });

  it("does not activate a mounted pack that would create duplicate route keys", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    await createSkillPack(serverContext, ADMIN_JWT, yap.id, {
      name: "yigfinance",
      packType: "core",
      skills: [{ name: "variance-review", version: "0.7.0" }],
      routeSkills: { "variance-review": { next_candidates: [] } },
      toolMappings: {},
      schemaPath: "schemas/variance-review.schema.json",
    });
    const extensionPack = await createSkillPack(serverContext, ADMIN_JWT, yap.id, {
      name: "override-pack",
      packType: "extension",
      skills: [{ name: "variance-review", version: "0.7.0" }],
      routeSkills: { "variance-review": { next_candidates: ["risk-review"] } },
      toolMappings: {},
      schemaPath: "schemas/override.schema.json",
    });

    const mountRes = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/mounts`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        skillPackId: extensionPack.id,
        mountKey: "override",
      },
    });
    expect(mountRes.statusCode).toBe(409);
    expect(mountRes.json()).toMatchObject({
      error: "Mount validation failed",
      validation: {
        status: "blocked",
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "duplicate_skill", key: "variance-review" }),
          expect.objectContaining({ code: "duplicate_route", key: "variance-review" }),
        ]),
      },
    });
  });

  it("returns 409 when a YAP has no core SkillPack", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);

    const assemblyRes = await serverContext.fastify.inject({
      method: "GET",
      url: `/v1/yaps/${yap.id}/assembly`,
    });

    expect(assemblyRes.statusCode).toBe(409);
    expect(assemblyRes.json()).toMatchObject({
      error: "YAP core Skill Pack not found",
      yapId: yap.id,
    });
  });
});
