/**
 * YAP Pack Mount Routes Integration Tests
 *
 * Verifies that extension packs can be mounted and switched by data/API state.
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

async function clearMountTestData(db: ReturnType<typeof drizzle>) {
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
    },
  });
  expect(res.statusCode).toBe(201);
  return res.json();
}

async function createSkillPack(
  serverContext: TestServerContext,
  token: string,
  yapId: string,
  name: string,
  packType: "core" | "extension" = "extension",
  options: {
    contractVersion?: string;
    skills?: Array<Record<string, unknown>>;
    routeSkills?: Record<string, unknown>;
    toolMappings?: Record<string, unknown>;
    schemaPath?: string;
  } = {},
) {
  const res = await serverContext.fastify.inject({
    method: "POST",
    url: `/v1/yaps/${yapId}/skill-packs`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name,
      version: "0.7.0",
      displayName: name
        .split("-")
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" "),
      description: `${name} SkillPack Bridge artifacts`,
      packType,
      contractVersion: options.contractVersion ?? "1.0",
      manifest: {
        name,
        version: "0.7.0",
        contract_version: options.contractVersion ?? "1.0",
        skills: options.skills ?? [],
      },
      artifacts: [
        {
          artifactType: "routes",
          artifactPath: "routes.json",
          content: {
            contract_version: options.contractVersion ?? "1.0",
            skills: options.routeSkills ?? {},
          },
        },
        {
          artifactType: "tool-map",
          artifactPath: "tool-map.json",
          content: {
            contract_version: options.contractVersion ?? "1.0",
            mappings: options.toolMappings ?? {},
          },
        },
        {
          artifactType: "schema",
          artifactPath: options.schemaPath ?? `schemas/${name}.schema.json`,
          content: { type: "object" },
        },
      ],
    },
  });
  expect(res.statusCode).toBe(201);
  return res.json().skillPack;
}

describe("YAP Pack Mount Routes", () => {
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
    await clearMountTestData(testDb);
    await closeTestServer(serverContext);
    await pool.end();
  });

  beforeEach(async () => {
    await clearMountTestData(testDb);
  });

  it("mounts ETC as the default extension and switches the slot to another pack", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    await createSkillPack(
      serverContext,
      ADMIN_JWT,
      yap.id,
      "yigfinance",
      "core",
    );
    const etcPack = await createSkillPack(
      serverContext,
      ADMIN_JWT,
      yap.id,
      "etc-professional-project",
    );
    const alternatePack = await createSkillPack(
      serverContext,
      ADMIN_JWT,
      yap.id,
      "manufacturing-project-pack",
    );

    const mountRes = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.slug}/mounts`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        skillPackId: etcPack.id,
        mountKey: "default-project-pack",
        mountPoint: "extensions/project",
        priority: 10,
        config: { defaultFor: "yigfinance" },
      },
    });

    expect(mountRes.statusCode).toBe(201);
    expect(mountRes.headers.location).toMatch(
      new RegExp(`^/v1/yaps/${yap.id}/mounts/ymnt_`),
    );
    const mountBody = mountRes.json();
    expect(mountBody).toMatchObject({
      mount: {
        yapId: yap.id,
        skillPackId: etcPack.id,
        mountKey: "default-project-pack",
        mountPoint: "extensions/project",
        enabled: true,
      },
      skillPack: {
        name: "etc-professional-project",
        packType: "extension",
      },
    });

    const listRes = await serverContext.fastify.inject({
      method: "GET",
      url: `/v1/yaps/${yap.slug}/mounts?enabled=true`,
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json()).toMatchObject({
      total: 1,
      limit: 50,
      offset: 0,
      mounts: [
        {
          mount: { mountKey: "default-project-pack" },
          skillPack: { name: "etc-professional-project" },
        },
      ],
    });

    const switchRes = await serverContext.fastify.inject({
      method: "PATCH",
      url: `/v1/yaps/${yap.id}/mounts/${mountBody.mount.id}`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        skillPackId: alternatePack.id,
        displayName: "Manufacturing Project Pack",
      },
    });

    expect(switchRes.statusCode).toBe(200);
    expect(switchRes.json()).toMatchObject({
      mount: {
        id: mountBody.mount.id,
        mountKey: "default-project-pack",
        skillPackId: alternatePack.id,
        displayName: "Manufacturing Project Pack",
      },
      skillPack: {
        id: alternatePack.id,
        name: "manufacturing-project-pack",
      },
    });
  });

  it("validates a mount candidate before activation", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    await createSkillPack(serverContext, ADMIN_JWT, yap.id, "yigfinance", "core", {
      routeSkills: { "variance-review": { next_candidates: [] } },
      toolMappings: { "finance-calc.variance_bridge": { tool: "variance" } },
    });
    const etcPack = await createSkillPack(
      serverContext,
      ADMIN_JWT,
      yap.id,
      "etc-professional-project",
      "extension",
      {
        routeSkills: { "project-margin-review": { next_candidates: [] } },
        toolMappings: { "finance-calc.project_margin": { tool: "margin" } },
      },
    );

    const res = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/mount-validations`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        skillPackId: etcPack.id,
        mountKey: "default-project-pack",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: "pass",
      candidate: {
        yapId: yap.id,
        skillPackId: etcPack.id,
        mountKey: "default-project-pack",
        enabled: true,
        replacingMountId: null,
      },
      summary: {
        routeCount: 2,
        toolMappingCount: 2,
        schemaCount: 2,
      },
    });
  });

  it("blocks activating an extension with duplicate resolver keys", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    await createSkillPack(serverContext, ADMIN_JWT, yap.id, "yigfinance", "core", {
      skills: [{ name: "variance-review", version: "0.7.0" }],
      routeSkills: { "variance-review": { next_candidates: [] } },
    });
    const overridePack = await createSkillPack(
      serverContext,
      ADMIN_JWT,
      yap.id,
      "override-pack",
      "extension",
      {
        skills: [{ name: "variance-review", version: "0.7.0" }],
        routeSkills: { "variance-review": { next_candidates: ["risk-review"] } },
      },
    );

    const res = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/mounts`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        skillPackId: overridePack.id,
        mountKey: "override",
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({
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

  it("reports contract-version mismatches before activation", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    await createSkillPack(serverContext, ADMIN_JWT, yap.id, "yigfinance", "core", {
      contractVersion: "1.0",
    });
    const incompatiblePack = await createSkillPack(
      serverContext,
      ADMIN_JWT,
      yap.id,
      "future-project-pack",
      "extension",
      { contractVersion: "2.0" },
    );

    const res = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/mount-validations`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        skillPackId: incompatiblePack.id,
        mountKey: "future-project-pack",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: "blocked",
      issues: [
        expect.objectContaining({
          code: "contract_version_mismatch",
          severity: "error",
        }),
      ],
    });
  });

  it("rejects mounting a core SkillPack", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    const corePack = await createSkillPack(
      serverContext,
      ADMIN_JWT,
      yap.id,
      "yigfinance",
      "core",
    );

    const res = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/mounts`,
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        skillPackId: corePack.id,
        mountKey: "core-slot",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "Only extension Skill Packs can be mounted",
    });
  });

  it("allows only the YAP owner or admin to update mounts", async () => {
    const yap = await createYap(serverContext, ADMIN_JWT);
    const etcPack = await createSkillPack(
      serverContext,
      ADMIN_JWT,
      yap.id,
      "etc-professional-project",
    );

    const res = await serverContext.fastify.inject({
      method: "POST",
      url: `/v1/yaps/${yap.id}/mounts`,
      headers: { authorization: `Bearer ${OTHER_JWT}` },
      payload: {
        skillPackId: etcPack.id,
        mountKey: "default-project-pack",
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      error: "Not authorized to update this YAP",
    });
  });
});
