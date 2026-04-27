import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs-extra";
import os from "os";
import path from "path";
import {
  YigYapsApiError,
  type YigYapsPublisherClient,
  type YigYapsRegistryClient,
} from "@yigyaps/client";
import type {
  RemoteYapManifest,
  ResolvedYapManifest,
  SkillPack,
  SkillPackArtifact,
  Yap,
  YapMountValidationResult,
  YapPackMount,
  YapRuntimePlan,
} from "@yigyaps/types";
import {
  yapAssemblyExportCommand,
  yapHostPrepareCommand,
  yapImportCommand,
  yapMountAddCommand,
  yapMountSwitchCommand,
  yapMountValidateCommand,
  yapPackPublishCommand,
  yapRuntimePlanCommand,
} from "../yap.js";
import * as auth from "../../lib/auth.js";
import * as registry from "../../lib/registry.js";

vi.mock("../../lib/auth.js");
vi.mock("../../lib/registry.js");
vi.mock("../../lib/logger.js");

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => fs.remove(root)));
  tempRoots.length = 0;
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.ensureAuthenticated).mockResolvedValue({
    id: "u1",
    displayName: "User",
    githubUsername: "user",
    email: "",
    avatarUrl: "",
    tier: "free",
    role: "user",
    isVerifiedCreator: true,
    totalPackages: 0,
    totalEarningsUsd: "0",
    createdAt: 0,
    lastLoginAt: 0,
  });
});

describe("yapImportCommand", () => {
  it("builds a Yigfinance import plan without authentication in dry-run mode", async () => {
    const root = await createFixture();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await yapImportCommand(root, { dryRun: true, json: true });

    expect(auth.ensureAuthenticated).not.toHaveBeenCalled();
    const output = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(output).toMatchObject({
      dryRun: true,
      yap: { slug: "yigfinance" },
      skillPack: { name: "yigfinance", packType: "core" },
      summary: { skillCount: 1 },
    });
  });

  it("uploads the YAP before uploading its core SkillPack", async () => {
    const root = await createFixture();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const yap = fakeYap();
    const skillPack = fakeSkillPack();
    const artifact = fakeArtifact(skillPack.id);
    const client = {
      createYap: vi.fn().mockResolvedValue(yap),
      createSkillPack: vi
        .fn()
        .mockResolvedValue({ skillPack, artifacts: [artifact] }),
    };
    vi.mocked(registry.createPublisherClient).mockReturnValue(
      client as unknown as YigYapsPublisherClient,
    );

    await yapImportCommand(root, { json: true });

    expect(client.createYap).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "yigfinance", version: "0.7.0" }),
    );
    expect(client.createSkillPack).toHaveBeenCalledWith(
      "yap_test",
      expect.objectContaining({
        name: "yigfinance",
        packType: "core",
        source: "imported",
      }),
    );
    const output = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(output).toMatchObject({
      success: true,
      yapCreated: true,
      skillPackCreated: true,
      artifactCount: 1,
    });
  });

  it("publishes and mounts the default ETO extension when present", async () => {
    const root = await createFixture({ withEto: true });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const yap = fakeYap();
    const corePack = fakeSkillPack();
    const etoPack = fakeSkillPack({
      id: "spack_eto",
      name: "yigfinance-eto-professional-projects",
      displayName: "Yigfinance ETO Professional Projects",
      packType: "extension",
      compatibility: {
        yigfinance: ">=0.7.0 <0.8.0",
        yigthinker: ">=0.3.0 <0.5.0",
      },
    });
    const mount = fakeMount({ skillPackId: etoPack.id });
    const client = {
      createYap: vi.fn().mockResolvedValue(yap),
      createSkillPack: vi.fn().mockImplementation((_yapId, pack) => {
        const skillPack = pack.name === etoPack.name ? etoPack : corePack;
        return Promise.resolve({
          skillPack,
          artifacts: [fakeArtifact(skillPack.id)],
        });
      }),
      listYapPackMounts: vi.fn().mockResolvedValue({
        mounts: [],
        total: 0,
        limit: 100,
        offset: 0,
      }),
      createYapPackMount: vi.fn().mockResolvedValue({
        mount,
        skillPack: etoPack,
      }),
    };
    vi.mocked(registry.createPublisherClient).mockReturnValue(
      client as unknown as YigYapsPublisherClient,
    );

    await yapImportCommand(root, { json: true });

    expect(client.createSkillPack).toHaveBeenCalledTimes(2);
    expect(client.createSkillPack).toHaveBeenNthCalledWith(
      2,
      "yap_test",
      expect.objectContaining({
        name: "yigfinance-eto-professional-projects",
        packType: "extension",
        compatibility: expect.objectContaining({
          yigfinance: ">=0.7.0 <0.8.0",
        }),
      }),
    );
    expect(client.createYapPackMount).toHaveBeenCalledWith(
      "yap_test",
      expect.objectContaining({
        skillPackId: "spack_eto",
        mountKey: "eto",
        mountPoint: "extensions",
        priority: 20,
        enabled: true,
      }),
    );
    const output = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(output).toMatchObject({
      success: true,
      extensionPacks: [
        {
          skillPackCreated: true,
          skillPack: {
            id: "spack_eto",
            name: "yigfinance-eto-professional-projects",
          },
        },
      ],
      defaultMounts: [
        {
          action: "created",
          mount: { mountKey: "eto" },
          skillPack: { id: "spack_eto" },
        },
      ],
    });
  });

  it("refreshes an existing core SkillPack when importing the same version", async () => {
    const root = await createFixture();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const yap = fakeYap();
    const existing = fakeSkillPack({
      compatibility: { yigthinker: ">=0.3.0 <0.5.0" },
    });
    const refreshed = fakeSkillPack({
      compatibility: {
        yigthinker: ">=0.3.0 <0.5.0",
        "yigcore-addins": ">=0.1.0 <1.0.0",
      },
    });
    const artifact = fakeArtifact(refreshed.id);
    const client = {
      createYap: vi.fn().mockResolvedValue(yap),
      createSkillPack: vi.fn().mockRejectedValue(
        new YigYapsApiError("createSkillPack", 409, {
          error: "Skill Pack version already exists",
        }),
      ),
      listSkillPacks: vi
        .fn()
        .mockResolvedValue({ skillPacks: [existing], total: 1 }),
      updateSkillPack: vi
        .fn()
        .mockResolvedValue({ skillPack: refreshed, artifacts: [artifact] }),
    };
    vi.mocked(registry.createPublisherClient).mockReturnValue(
      client as unknown as YigYapsPublisherClient,
    );

    await yapImportCommand(root, { json: true });

    expect(client.updateSkillPack).toHaveBeenCalledWith(
      "yap_test",
      "spack_test",
      expect.objectContaining({
        compatibility: {
          yigthinker: ">=0.3.0 <0.5.0",
          "yigcore-addins": ">=0.1.0 <1.0.0",
        },
        manifest: expect.objectContaining({
          compatibility: {
            yigthinker: ">=0.3.0 <0.5.0",
            "yigcore-addins": ">=0.1.0 <1.0.0",
          },
        }),
      }),
    );
    const output = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(output).toMatchObject({
      success: true,
      skillPackCreated: false,
      artifactCount: 1,
      skillPack: {
        compatibility: {
          "yigcore-addins": ">=0.1.0 <1.0.0",
        },
      },
    });
  });
});

describe("yapPackPublishCommand", () => {
  it("builds a generic extension SkillPack publish plan in dry-run mode", async () => {
    const root = await createPackFixture();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await yapPackPublishCommand("yigfinance", root, {
      dryRun: true,
      json: true,
    });

    expect(auth.ensureAuthenticated).not.toHaveBeenCalled();
    const output = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(output).toMatchObject({
      dryRun: true,
      skillPack: {
        name: "eto-professional-projects",
        packType: "extension",
        status: "active",
      },
      summary: {
        commandCount: 1,
        skillMarkdownCount: 1,
        schemaCount: 1,
      },
    });
  });

  it("uploads a generic SkillPack under the requested YAP", async () => {
    const root = await createPackFixture();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const skillPack = fakeSkillPack({
      id: "spack_eto",
      name: "eto-professional-projects",
      packType: "extension",
    });
    const artifact = fakeArtifact(skillPack.id);
    const client = {
      createSkillPack: vi
        .fn()
        .mockResolvedValue({ skillPack, artifacts: [artifact] }),
    };
    vi.mocked(registry.createPublisherClient).mockReturnValue(
      client as unknown as YigYapsPublisherClient,
    );

    await yapPackPublishCommand("yigfinance", root, { json: true });

    expect(auth.ensureAuthenticated).toHaveBeenCalled();
    expect(client.createSkillPack).toHaveBeenCalledWith(
      "yigfinance",
      expect.objectContaining({
        name: "eto-professional-projects",
        packType: "extension",
        source: "imported",
      }),
    );
    const output = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(output).toMatchObject({
      success: true,
      artifactCount: 1,
      skillPack: { id: "spack_eto" },
    });
  });
});

describe("YAP mount commands", () => {
  it("validates a candidate extension mount", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const validation = fakeValidation();
    const client = {
      validateYapPackMount: vi.fn().mockResolvedValue(validation),
    };
    vi.mocked(registry.createPublisherClient).mockReturnValue(
      client as unknown as YigYapsPublisherClient,
    );

    await yapMountValidateCommand("yigfinance", "spack_eto", {
      mountKey: "eto",
      mountPoint: "extensions",
      priority: 20,
      json: true,
    });

    expect(client.validateYapPackMount).toHaveBeenCalledWith("yigfinance", {
      skillPackId: "spack_eto",
      mountKey: "eto",
      mountPoint: "extensions",
      displayName: undefined,
      priority: 20,
      enabled: true,
      required: false,
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      status: "pass",
      candidate: { mountKey: "eto" },
    });
  });

  it("adds a mounted extension pack", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const mount = fakeMount();
    const skillPack = fakeSkillPack({
      id: "spack_eto",
      name: "eto-professional-projects",
      packType: "extension",
    });
    const client = {
      createYapPackMount: vi.fn().mockResolvedValue({ mount, skillPack }),
    };
    vi.mocked(registry.createPublisherClient).mockReturnValue(
      client as unknown as YigYapsPublisherClient,
    );

    await yapMountAddCommand("yigfinance", "spack_eto", {
      mountKey: "eto",
      json: true,
    });

    expect(client.createYapPackMount).toHaveBeenCalledWith("yigfinance", {
      skillPackId: "spack_eto",
      mountKey: "eto",
      mountPoint: undefined,
      displayName: undefined,
      priority: undefined,
      enabled: true,
      required: false,
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      success: true,
      mount: { mountKey: "eto" },
      skillPack: { id: "spack_eto" },
    });
  });

  it("switches an existing mount slot to another extension pack", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const mount = fakeMount({ skillPackId: "spack_alt" });
    const skillPack = fakeSkillPack({
      id: "spack_alt",
      name: "alternate-project-pack",
      packType: "extension",
    });
    const client = {
      updateYapPackMount: vi.fn().mockResolvedValue({ mount, skillPack }),
    };
    vi.mocked(registry.createPublisherClient).mockReturnValue(
      client as unknown as YigYapsPublisherClient,
    );

    await yapMountSwitchCommand("yigfinance", "mount_eto", "spack_alt", {
      mountKey: "eto",
      disabled: true,
      json: true,
    });

    expect(client.updateYapPackMount).toHaveBeenCalledWith(
      "yigfinance",
      "mount_eto",
      {
        skillPackId: "spack_alt",
        mountKey: "eto",
        mountPoint: undefined,
        displayName: undefined,
        priority: undefined,
        enabled: false,
        required: undefined,
      },
    );
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      success: true,
      mount: { skillPackId: "spack_alt" },
      skillPack: { id: "spack_alt" },
    });
  });
});

describe("yapAssemblyExportCommand", () => {
  it("exports the resolved YAP assembly to JSON", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "yigyaps-export-"));
    tempRoots.push(root);
    const outputPath = path.join(root, "assembly.json");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const client = {
      getYapAssembly: vi.fn().mockResolvedValue(fakeAssembly()),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(
      client as unknown as YigYapsRegistryClient,
    );

    await yapAssemblyExportCommand("yigfinance", {
      output: outputPath,
      maxMounts: 5,
    });

    expect(client.getYapAssembly).toHaveBeenCalledWith("yigfinance", {
      maxMounts: 5,
    });
    await expect(fs.readJson(outputPath)).resolves.toMatchObject({
      yap: { slug: "yigfinance" },
      merged: { packOrder: ["spack_test"] },
    });
  });
});

describe("yapRuntimePlanCommand", () => {
  it("plans runtime candidates through the registry client", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const client = {
      planYapRuntime: vi.fn().mockResolvedValue(fakeRuntimePlan()),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(
      client as unknown as YigYapsRegistryClient,
    );

    await yapRuntimePlanCommand("yigfinance", {
      task: "Review ETO project margin risk",
      requiredSkills: ["project-margin-review"],
      maxCandidates: 3,
      maxMounts: 5,
      mountKeys: ["eto"],
      json: true,
    });

    expect(client.planYapRuntime).toHaveBeenCalledWith(
      "yigfinance",
      {
        task: "Review ETO project margin risk",
        requiredSkills: ["project-margin-review"],
        expectedContractVersion: undefined,
        maxCandidates: 3,
        hints: {
          skillNames: undefined,
          mountKeys: ["eto"],
          routeKeys: undefined,
          toolKeys: undefined,
        },
      },
      { mountKeys: ["eto"], maxMounts: 5 },
    );
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      status: "ready",
      candidates: [{ skill: { name: "project-margin-review" } }],
    });
  });
});

describe("yapHostPrepareCommand", () => {
  it("prepares a remote host handoff through the registry client", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const client = {
      getYapRemoteManifest: vi.fn().mockResolvedValue(fakeRemoteManifest()),
      planYapRuntime: vi.fn().mockResolvedValue(fakeRuntimePlan()),
      getYapAssembly: vi.fn().mockResolvedValue(fakeAssembly()),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(
      client as unknown as YigYapsRegistryClient,
    );

    await yapHostPrepareCommand("yigfinance", {
      task: "Review ETO project margin risk",
      host: "yigthinker",
      hostVersion: "0.3.1",
      mountKeys: ["eto"],
      maxCandidates: 3,
      maxMounts: 5,
      json: true,
    });

    expect(client.getYapRemoteManifest).toHaveBeenCalledWith("yigfinance", {
      host: "yigthinker",
      hostVersion: "0.3.1",
      mountKeys: ["eto"],
      maxMounts: 5,
    });
    expect(client.planYapRuntime).toHaveBeenCalledWith(
      "yigfinance",
      expect.objectContaining({
        task: "Review ETO project margin risk",
        maxCandidates: 3,
        hints: { mountKeys: ["eto"] },
      }),
      { mountKeys: ["eto"], maxMounts: 5 },
    );
    expect(client.getYapAssembly).toHaveBeenCalledWith("yigfinance", {
      mountKeys: ["eto"],
      maxMounts: 5,
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      mode: "local-plan",
      yap: { slug: "yigfinance" },
      host: { target: "yigthinker" },
      selectedCandidate: { skill: { name: "project-margin-review" } },
      selectedArtifactIndex: [
        { artifactPath: "schemas/project-margin-review.schema.json" },
      ],
    });
  });
});

async function createFixture(
  options: { withEto?: boolean } = {},
): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yigyaps-yap-"));
  tempRoots.push(root);

  const pluginDir = path.join(
    root,
    "generated",
    "yigthinker",
    ".yigthinker-plugin",
  );
  await fs.ensureDir(path.join(pluginDir, "schemas"));
  await fs.ensureDir(path.join(root, "generated", "yigthinker", "commands"));
  await fs.ensureDir(
    path.join(root, "generated", "claude", "skills", "variance-review"),
  );
  if (options.withEto) {
    await fs.ensureDir(
      path.join(root, "generated", "claude", "skills", "project-margin-review"),
    );
  }

  await fs.writeJson(path.join(pluginDir, "plugin.json"), {
    name: "yigfinance",
    description: "Finance analysis skill stack for CFO-grade analysis",
    version: "0.7.0",
  });
  await fs.writeJson(path.join(pluginDir, "skillpack.json"), {
    name: "yigfinance",
    version: "0.7.0",
    contract_version: "1.0",
    compatibility: {
      yigthinker: ">=0.3.0 <0.5.0",
      "yigcore-addins": ">=0.1.0 <1.0.0",
    },
    skills: [
      { name: "variance-review", version: "0.7.0" },
      ...(options.withEto
        ? [{ name: "project-margin-review", version: "0.7.0" }]
        : []),
    ],
  });
  await fs.writeJson(path.join(pluginDir, "routes.json"), {
    contract_version: "1.0",
    skills: options.withEto
      ? {
          "project-margin-review": {
            next_candidates: ["variance-review"],
          },
        }
      : {},
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
  if (options.withEto) {
    await fs.writeJson(
      path.join(pluginDir, "schemas", "project-margin-review.schema.json"),
      { type: "object" },
    );
    await fs.writeFile(
      path.join(
        root,
        "generated",
        "yigthinker",
        "commands",
        "project-margin-review.md",
      ),
      "# project-margin-review\n",
    );
    await fs.writeFile(
      path.join(
        root,
        "generated",
        "claude",
        "skills",
        "project-margin-review",
        "SKILL.md",
      ),
      "# Project Margin Review\n",
    );
  }
  await fs.writeFile(
    path.join(
      root,
      "generated",
      "yigthinker",
      "commands",
      "variance-review.md",
    ),
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

  return root;
}

async function createPackFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yigyaps-pack-"));
  tempRoots.push(root);

  await fs.ensureDir(path.join(root, "schemas"));
  await fs.ensureDir(path.join(root, "commands"));
  await fs.ensureDir(path.join(root, "skills", "eto-projects"));

  await fs.writeJson(path.join(root, "skillpack.json"), {
    name: "eto-professional-projects",
    version: "1.2.3",
    contract_version: "1.0",
    compatibility: { yigfinance: ">=0.7.0 <1.0.0" },
    skills: [{ name: "eto-projects", version: "1.2.3" }],
  });
  await fs.writeJson(path.join(root, "plugin.json"), {
    name: "eto-professional-projects",
    description: "ETO professional project analysis pack",
    version: "1.2.3",
  });
  await fs.writeJson(path.join(root, "schemas", "eto.schema.json"), {
    type: "object",
  });
  await fs.writeFile(path.join(root, "commands", "eto.md"), "# ETO\n");
  await fs.writeFile(
    path.join(root, "skills", "eto-projects", "SKILL.md"),
    "# ETO Projects\n",
  );

  return root;
}

function fakeYap(): Yap {
  return {
    id: "yap_test",
    slug: "yigfinance",
    version: "0.7.0",
    displayName: "Yigfinance",
    description: "Finance analysis skill stack for CFO-grade analysis",
    readme: null,
    ownerId: "u1",
    ownerName: "User",
    category: "finance",
    tags: ["finance"],
    visibility: "public",
    status: "active",
    assemblyConfig: {},
    createdAt: 1,
    updatedAt: 1,
    releasedAt: 1,
  };
}

function fakeSkillPack(overrides: Partial<SkillPack> = {}): SkillPack {
  return {
    id: "spack_test",
    yapId: "yap_test",
    name: "yigfinance",
    version: "0.7.0",
    displayName: "Yigfinance",
    description: "Finance analysis skill stack for CFO-grade analysis",
    packType: "core",
    contractVersion: "1.0",
    compatibility: {},
    manifest: {},
    source: "imported",
    status: "active",
    createdAt: 1,
    updatedAt: 1,
    releasedAt: 1,
    ...overrides,
  };
}

function fakeArtifact(skillPackId: string): SkillPackArtifact {
  return {
    id: "spa_test",
    skillPackId,
    artifactType: "skillpack",
    artifactPath: "skillpack.json",
    mediaType: "application/json",
    content: {},
    contentSha256: "hash",
    createdAt: 1,
    updatedAt: 1,
  };
}

function fakeMount(overrides: Partial<YapPackMount> = {}): YapPackMount {
  return {
    id: "mount_eto",
    yapId: "yap_test",
    skillPackId: "spack_eto",
    mountKey: "eto",
    mountPoint: "extensions",
    displayName: "ETO",
    priority: 20,
    enabled: true,
    required: false,
    config: {},
    constraints: {},
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function fakeValidation(): YapMountValidationResult {
  return {
    status: "pass",
    issues: [],
    candidate: {
      yapId: "yap_test",
      skillPackId: "spack_eto",
      mountKey: "eto",
      enabled: true,
      replacingMountId: null,
    },
    summary: {
      packOrder: ["spack_test", "spack_eto"],
      skillCount: 2,
      routeCount: 0,
      toolMappingCount: 0,
      schemaCount: 1,
    },
    generatedAt: 1,
  };
}

function fakeAssembly(): ResolvedYapManifest {
  const yap = fakeYap();
  const skillPack = fakeSkillPack();
  return {
    yap,
    corePack: {
      role: "core",
      mount: null,
      skillPack,
      artifacts: {
        manifest: {},
        routes: null,
        toolMap: null,
        feedback: null,
        update: null,
        schemas: {},
        qualityReports: [],
        artifactIndex: [],
      },
    },
    mountedPacks: [],
    merged: {
      contractVersion: "1.0",
      packOrder: [skillPack.id],
      skills: [],
      routes: {},
      toolMap: {},
      schemas: {},
      qualityReports: [],
      artifactIndex: [],
    },
    diagnostics: {
      conflicts: [],
      warnings: [],
    },
    generatedAt: 1,
  };
}

function fakeRuntimePlan(): YapRuntimePlan {
  const assembly = fakeAssembly();
  return {
    yap: assembly.yap,
    task: "Review ETO project margin risk",
    status: "ready",
    candidates: [
      {
        skill: {
          name: "project-margin-review",
          version: "1.2.3",
          sourcePackId: "spack_eto",
          sourcePackName: "eto-professional-projects",
          sourceMountKey: "eto",
          definition: {},
        },
        sourcePackId: "spack_eto",
        sourcePackName: "eto-professional-projects",
        sourceMountKey: "eto",
        routeKey: "project-margin-review",
        route: { next_candidates: ["variance-review"] },
        toolMappings: {
          "finance-calc.project_margin": {
            tool: "finance_project_margin",
          },
        },
        schemaKeys: ["schemas/project-margin-review.schema.json"],
        score: 72,
        reasons: ["task token matches"],
      },
    ],
    diagnostics: {
      issues: [],
      warnings: [],
    },
    generatedAt: 1,
  };
}

function fakeRemoteManifest(): RemoteYapManifest {
  const yap = fakeYap();
  return {
    schemaVersion: "yigyaps.remote-manifest.v1",
    product: {
      id: yap.id,
      slug: yap.slug,
      version: yap.version,
      displayName: yap.displayName,
      description: yap.description,
      category: yap.category,
      visibility: yap.visibility,
      status: yap.status,
      ownerName: yap.ownerName,
    },
    host: {
      target: "yigthinker",
      version: "0.3.1",
      compatibility: {
        status: "compatible",
        packs: [
          {
            id: "spack_test",
            name: "yigfinance",
            version: "0.7.0",
            packType: "core",
            contractVersion: "1.0",
            artifactCount: 1,
            mountKey: null,
            mountPoint: null,
            compatibility: {
              status: "compatible",
              range: ">=0.3.0 <0.5.0",
            },
          },
          {
            id: "spack_eto",
            name: "eto-professional-projects",
            version: "1.2.3",
            packType: "extension",
            contractVersion: "1.0",
            artifactCount: 1,
            mountKey: "eto",
            mountPoint: "extensions",
            compatibility: {
              status: "compatible",
              range: ">=0.3.0 <0.5.0",
            },
          },
        ],
      },
    },
    remote: {
      baseUrl: "https://api.yigyaps.com",
      endpoints: {
        assembly: "/v1/yaps/yigfinance/assembly",
        runtimePlan: "/v1/yaps/yigfinance/runtime-plans",
        remoteManifest: "/v1/yaps/yigfinance/remote-manifest",
      },
      invocationModes: ["local-plan", "hosted-plan"],
    },
    assembly: {
      generatedAt: 1,
      contractVersion: "1.0",
      corePack: {
        id: "spack_test",
        name: "yigfinance",
        version: "0.7.0",
        packType: "core",
        contractVersion: "1.0",
        artifactCount: 1,
        mountKey: null,
        mountPoint: null,
        compatibility: {
          status: "compatible",
          range: ">=0.3.0 <0.5.0",
        },
      },
      mountedPacks: [
        {
          id: "spack_eto",
          name: "eto-professional-projects",
          version: "1.2.3",
          packType: "extension",
          contractVersion: "1.0",
          artifactCount: 1,
          mountKey: "eto",
          mountPoint: "extensions",
          compatibility: {
            status: "compatible",
            range: ">=0.3.0 <0.5.0",
          },
        },
      ],
      packOrder: ["spack_test", "spack_eto"],
      skillCount: 2,
      routeCount: 2,
      toolMappingCount: 2,
      schemaCount: 2,
      qualityReportCount: 0,
      qualityGateStatus: null,
      conflictCount: 0,
      warningCount: 0,
    },
    artifacts: {
      fetchMode: "assembly",
      index: [
        {
          id: "spa_schema",
          artifactType: "schema",
          artifactPath: "schemas/project-margin-review.schema.json",
          mediaType: "application/schema+json",
          contentSha256: "hash_schema",
          sourcePackId: "spack_eto",
          sourcePackName: "eto-professional-projects",
          sourceMountKey: "eto",
        },
      ],
    },
    integrity: {
      manifestSha256: "hash_manifest",
      etag: '"hash_manifest"',
      generatedAt: 1,
    },
  };
}
