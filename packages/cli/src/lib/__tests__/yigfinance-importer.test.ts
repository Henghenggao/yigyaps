import { afterEach, describe, expect, it } from "vitest";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { CliError } from "../errors.js";
import { planYigfinanceImport } from "../yigfinance-importer.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => fs.remove(root)));
  tempRoots.length = 0;
});

describe("planYigfinanceImport", () => {
  it("maps Yigfinance Bridge output into a YAP and core SkillPack plan", async () => {
    const root = await createFixture();

    const plan = await planYigfinanceImport(root);

    expect(plan.yap).toMatchObject({
      slug: "yigfinance",
      version: "0.7.0",
      displayName: "Yigfinance",
      category: "finance",
      status: "active",
      visibility: "public",
    });
    expect(plan.yap.assemblyConfig).toMatchObject({
      corePack: { name: "yigfinance", version: "0.7.0" },
      mountedPacks: [],
      bridge: { source: "yigfinance" },
    });
    expect(plan.skillPack).toMatchObject({
      name: "yigfinance",
      version: "0.7.0",
      packType: "core",
      contractVersion: "1.0",
      source: "imported",
    });
    expect(plan.summary).toMatchObject({
      skillCount: 2,
      schemaCount: 1,
      commandCount: 1,
      skillMarkdownCount: 1,
      artifactCount: 10,
    });
    expect(plan.skillPack.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifactType: "routes",
          artifactPath: "routes.json",
        }),
        expect.objectContaining({
          artifactType: "tool-map",
          artifactPath: "tool-map.json",
        }),
        expect.objectContaining({
          artifactType: "schema",
          artifactPath: "schemas/variance-review.schema.json",
        }),
        expect.objectContaining({
          artifactType: "command",
          artifactPath: "commands/variance-review.md",
        }),
        expect.objectContaining({
          artifactType: "skill-md",
          artifactPath: "skills/variance-review/SKILL.md",
        }),
      ]),
    );
    expect(plan.skillPack.artifacts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ artifactPath: "skillpack.json" }),
      ]),
    );
  });

  it("fails fast when required Bridge artifacts are missing", async () => {
    const root = await createFixture();
    await fs.remove(
      path.join(
        root,
        "generated",
        "yigthinker",
        ".yigthinker-plugin",
        "routes.json",
      ),
    );

    await expect(planYigfinanceImport(root)).rejects.toMatchObject({
      exitCode: CliError.user("x").exitCode,
    });
  });
});

async function createFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yigyaps-import-"));
  tempRoots.push(root);

  const pluginDir = path.join(
    root,
    "generated",
    "yigthinker",
    ".yigthinker-plugin",
  );
  await fs.ensureDir(path.join(pluginDir, "schemas"));
  await fs.ensureDir(path.join(pluginDir, "hooks"));
  await fs.ensureDir(path.join(root, "generated", "yigthinker", "commands"));
  await fs.ensureDir(
    path.join(root, "generated", "claude", "skills", "variance-review"),
  );

  await fs.writeFile(path.join(root, "README.md"), "# Yigfinance\n");
  await fs.writeJson(path.join(pluginDir, "plugin.json"), {
    name: "yigfinance",
    description: "Finance analysis skill stack for CFO-grade analysis",
    version: "0.7.0",
  });
  await fs.writeJson(path.join(pluginDir, "skillpack.json"), {
    name: "yigfinance",
    version: "0.7.0",
    contract_version: "1.0",
    compatibility: { yigthinker: ">=0.3.0 <0.5.0" },
    skills: [
      { name: "finance-context-setup", version: "0.7.0" },
      { name: "variance-review", version: "0.7.0" },
    ],
  });
  await fs.writeJson(path.join(pluginDir, "routes.json"), {
    contract_version: "1.0",
    skills: {},
  });
  await fs.writeJson(path.join(pluginDir, "tool-map.json"), {
    contract_version: "1.0",
    mappings: {},
  });
  await fs.writeJson(path.join(pluginDir, "feedback.json"), {
    contract_version: "1.0",
  });
  await fs.writeJson(path.join(pluginDir, "update.json"), {
    contract_version: "1.0",
  });
  await fs.writeJson(
    path.join(pluginDir, "schemas", "variance-review.schema.json"),
    { type: "object" },
  );
  await fs.writeFile(
    path.join(root, "generated", "yigthinker", "commands", "variance-review.md"),
    "# variance-review\n",
  );
  await fs.writeFile(
    path.join(
      root,
      "generated",
      "claude",
      "skills",
      "variance-review",
      "SKILL.md",
    ),
    "# Skill\n",
  );
  await fs.writeFile(path.join(pluginDir, "hooks", "auto_update.py"), "pass\n");

  return root;
}
