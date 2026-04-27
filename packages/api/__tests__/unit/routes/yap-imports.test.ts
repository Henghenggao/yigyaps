import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { yapImportRoutes } from "../../../src/routes/yap-imports.js";
import { createAdminJWT } from "../helpers/jwt-helpers.js";

describe("YAP import preview routes", () => {
  let fastify: FastifyInstance;
  let importRoot: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret";
    importRoot = await fs.mkdtemp(path.join(os.tmpdir(), "yigyaps-import-"));
    process.env.YAP_IMPORT_ALLOWED_ROOTS = importRoot;
    await createYigfinanceFixture(path.join(importRoot, "Yigfinance"));
    await createYigfinanceFixture(path.join(importRoot, "YigfinanceBomReport"));
    await writeBomQualityReport(path.join(importRoot, "YigfinanceBomReport"));

    fastify = Fastify({ logger: false });
    await fastify.register(yapImportRoutes, { prefix: "/v1/yap-imports" });
  });

  afterAll(async () => {
    await fastify.close();
    await fs.rm(importRoot, { recursive: true, force: true });
    delete process.env.YAP_IMPORT_ALLOWED_ROOTS;
  });

  it("previews a Yigfinance-style repo inside the allowed import root", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/v1/yap-imports/preview",
      headers: { authorization: `Bearer ${createAdminJWT()}` },
      payload: {
        format: "yigfinance",
        sourceDir: "Yigfinance",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    const body = res.json();
    expect(body.yap).toMatchObject({
      slug: "yigfinance",
      category: "finance",
    });
    expect(body.summary).toMatchObject({
      skillCount: 3,
      coreSkillCount: 1,
      schemaCount: 3,
      commandCount: 3,
      skillMarkdownCount: 3,
      evalArtifactCount: 4,
      qualityReportStatus: "needs-run",
      extensionPackCount: 1,
      extensionSkillCount: 2,
      defaultMountCount: 1,
    });
    expect(body.defaultMounts[0]).toMatchObject({
      mountKey: "eto",
      mountPoint: "extensions",
    });
  });

  it("accepts explicit quality reports generated with a UTF-8 BOM", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/v1/yap-imports/preview",
      headers: { authorization: `Bearer ${createAdminJWT()}` },
      payload: {
        format: "yigfinance",
        sourceDir: "YigfinanceBomReport",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().summary.qualityReportStatus).toBe("passed");
  });

  it("rejects source paths outside configured import roots", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/v1/yap-imports/preview",
      headers: { authorization: `Bearer ${createAdminJWT()}` },
      payload: {
        format: "yigfinance",
        sourceDir: path.resolve(os.tmpdir(), "not-allowed"),
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("source_dir_not_allowed");
  });
});

async function createYigfinanceFixture(root: string) {
  const pluginDir = path.join(root, "generated", "yigthinker", ".yigthinker-plugin");
  const commandsDir = path.join(root, "generated", "yigthinker", "commands");
  const skillsDir = path.join(root, "generated", "claude", "skills");
  const testsDir = path.join(root, "tests");
  await fs.mkdir(path.join(pluginDir, "schemas"), { recursive: true });
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
    skills: skills.map((name) => ({ name, version: "0.7.0" })),
  });
  await writeJson(path.join(pluginDir, "plugin.json"), {
    name: "yigfinance",
    version: "0.7.0",
    description: "Finance analysis skill stack for CFO-grade work.",
  });
  for (const file of ["routes.json", "tool-map.json", "feedback.json", "update.json"]) {
    await writeJson(path.join(pluginDir, file), { skills: {} });
  }

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

async function writeBomQualityReport(root: string) {
  const reportPath = path.join(root, ".yigyaps", "quality-report.json");
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  const content = JSON.stringify({
    schemaVersion: "yigyaps.quality-report.v1",
    status: "passed",
    evidence: { testCount: 4, failedTestCount: 0 },
  });
  await fs.writeFile(
    reportPath,
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(content)]),
  );
}
