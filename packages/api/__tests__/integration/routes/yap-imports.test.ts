import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  closeTestServer,
  createTestServer,
  type TestServerContext,
} from "../helpers/test-server.js";
import { getTestDatabaseUrl } from "../helpers/test-db-url.js";
import { createAdminJWT } from "../../unit/helpers/jwt-helpers.js";

const DB_URL = getTestDatabaseUrl();

async function clearImportTestData(db: ReturnType<typeof drizzle>) {
  await db.execute(
    sql.raw(`TRUNCATE TABLE yy_yap_pack_mounts RESTART IDENTITY CASCADE`),
  );
  await db.execute(
    sql.raw(`TRUNCATE TABLE yy_skill_pack_artifacts RESTART IDENTITY CASCADE`),
  );
  await db.execute(
    sql.raw(`TRUNCATE TABLE yy_skill_packs RESTART IDENTITY CASCADE`),
  );
  await db.execute(sql.raw(`TRUNCATE TABLE yy_yaps RESTART IDENTITY CASCADE`));
}

describe("YAP import execution routes", () => {
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;
  let importRoot: string;
  const ADMIN_JWT = createAdminJWT();

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.NODE_ENV = "test";
    importRoot = await fs.mkdtemp(path.join(os.tmpdir(), "yigyaps-import-"));
    process.env.YAP_IMPORT_ALLOWED_ROOTS = importRoot;
    await createYigfinanceFixture(path.join(importRoot, "Yigfinance"));

    pool = new Pool({ connectionString: DB_URL, max: 5 });
    testDb = drizzle(pool);
    serverContext = await createTestServer(DB_URL);
  });

  afterAll(async () => {
    await clearImportTestData(testDb);
    await closeTestServer(serverContext);
    await pool.end();
    await fs.rm(importRoot, { recursive: true, force: true });
    delete process.env.YAP_IMPORT_ALLOWED_ROOTS;
  });

  beforeEach(async () => {
    await clearImportTestData(testDb);
  });

  it("executes a Yigfinance import into YAP, SkillPacks, artifacts, and default mount", async () => {
    const executeRes = await serverContext.fastify.inject({
      method: "POST",
      url: "/v1/yap-imports/execute",
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        format: "yigfinance",
        sourceDir: "Yigfinance",
      },
    });

    expect(executeRes.statusCode).toBe(201);
    expect(executeRes.headers.location).toBe("/v1/yaps/yigfinance/assembly");
    const body = executeRes.json();
    expect(body).toMatchObject({
      success: true,
      yapAction: "created",
      yap: { slug: "yigfinance" },
      corePack: { name: "yigfinance", action: "created" },
      defaultMounts: [{ mountKey: "eto", action: "created" }],
    });
    expect(body.extensionPacks).toHaveLength(1);
    expect(body.corePack.artifactCount).toBeGreaterThan(1);
    expect(body.extensionPacks[0].artifactCount).toBeGreaterThan(1);

    const assemblyRes = await serverContext.fastify.inject({
      method: "GET",
      url: "/v1/yaps/yigfinance/assembly",
    });
    expect(assemblyRes.statusCode).toBe(200);
    const assembly = assemblyRes.json();
    expect(assembly.mountedPacks).toHaveLength(1);
    expect(assembly.merged.skills.map((skill: { name: string }) => skill.name)).toEqual([
      "variance-review",
      "project-margin-review",
      "pvm-analysis",
    ]);
    expect(
      assembly.merged.artifactIndex.map(
        (artifact: { artifactType: string }) => artifact.artifactType,
      ),
    ).toEqual(expect.arrayContaining(["eval", "fixture", "quality-report"]));
    expect(assembly.merged.qualityReports).toEqual([
      expect.objectContaining({
        schemaVersion: "yigyaps.quality-report.v1",
        status: "needs-run",
      }),
    ]);
    expect(
      assembly.merged.artifactIndex.map(
        (artifact: { artifactPath: string }) => artifact.artifactPath,
      ),
    ).toEqual(
      expect.arrayContaining([
        "tests/test_repository_contract.py",
        "tests/tier2-e2e/test_project_margin_review.py",
      ]),
    );

    const secondExecuteRes = await serverContext.fastify.inject({
      method: "POST",
      url: "/v1/yap-imports/execute",
      headers: { authorization: `Bearer ${ADMIN_JWT}` },
      payload: {
        format: "yigfinance",
        sourceDir: "Yigfinance",
      },
    });
    expect(secondExecuteRes.statusCode).toBe(200);
    expect(secondExecuteRes.json()).toMatchObject({
      yapAction: "updated",
      corePack: { action: "updated" },
      defaultMounts: [{ action: "updated" }],
    });
  });
});

async function createYigfinanceFixture(root: string) {
  const pluginDir = path.join(root, "generated", "yigthinker", ".yigthinker-plugin");
  const commandsDir = path.join(root, "generated", "yigthinker", "commands");
  const skillsDir = path.join(root, "generated", "claude", "skills");
  const testsDir = path.join(root, "tests");
  await fs.mkdir(path.join(pluginDir, "schemas"), { recursive: true });
  await fs.mkdir(path.join(pluginDir, "hooks"), { recursive: true });
  await fs.mkdir(commandsDir, { recursive: true });
  await fs.mkdir(skillsDir, { recursive: true });
  await fs.mkdir(path.join(testsDir, "tier1-schema"), { recursive: true });
  await fs.mkdir(path.join(testsDir, "tier2-e2e", "fixtures"), {
    recursive: true,
  });

  const skills = [
    "variance-review",
    "project-margin-review",
    "pvm-analysis",
  ];

  await writeJson(path.join(pluginDir, "skillpack.json"), {
    name: "yigfinance",
    version: "0.7.0",
    contract_version: "1.0",
    compatibility: {
      yigthinker: ">=0.3.0 <0.5.0",
    },
    skills: skills.map((name) => ({ name, version: "0.7.0" })),
  });
  await writeJson(path.join(pluginDir, "plugin.json"), {
    name: "yigfinance",
    version: "0.7.0",
    description: "Finance analysis skill stack for CFO-grade work.",
  });
  await writeJson(path.join(pluginDir, "routes.json"), {
    skills: Object.fromEntries(skills.map((skill) => [skill, {}])),
  });
  await writeJson(path.join(pluginDir, "tool-map.json"), {
    mappings: Object.fromEntries(skills.map((skill) => [skill, {}])),
  });
  await writeJson(path.join(pluginDir, "feedback.json"), {
    skills: Object.fromEntries(skills.map((skill) => [skill, {}])),
  });
  await writeJson(path.join(pluginDir, "update.json"), { channel: "stable" });
  await fs.writeFile(path.join(pluginDir, "hooks", "auto_update.py"), "# hook\n");
  await fs.writeFile(path.join(root, "README.md"), "# Yigfinance\n");

  for (const skill of skills) {
    await writeJson(path.join(pluginDir, "schemas", `${skill}.schema.json`), {
      title: skill,
      type: "object",
    });
    await fs.writeFile(path.join(commandsDir, `${skill}.md`), `# ${skill}\n`);
    await fs.mkdir(path.join(skillsDir, skill), { recursive: true });
    await fs.writeFile(
      path.join(skillsDir, skill, "SKILL.md"),
      `# ${skill}\n`,
    );
  }

  await fs.writeFile(path.join(testsDir, "test_repository_contract.py"), "# shared\n");
  await writeJson(path.join(testsDir, "tier1-schema", "variance-review.schema.json"), {
    title: "variance-review eval schema",
  });
  await fs.writeFile(
    path.join(testsDir, "tier2-e2e", "test_project_margin_review.py"),
    "# project margin eval\n",
  );
  await writeJson(
    path.join(testsDir, "tier2-e2e", "fixtures", "test_context.json"),
    { period: "2026-04" },
  );
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}
