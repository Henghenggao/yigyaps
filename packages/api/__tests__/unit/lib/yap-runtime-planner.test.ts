import { describe, expect, it } from "vitest";
import type { ResolvedYapManifest } from "@yigyaps/types";
import { planYapRuntime } from "../../../src/lib/yap-runtime-planner.js";

describe("planYapRuntime", () => {
  it("prioritizes an extension-pack skill that matches the task and returns contract artifacts", () => {
    const plan = planYapRuntime(fakeAssembly(), {
      task: "Review ETC project margin risk using finance calculator",
      maxCandidates: 3,
    });

    expect(plan.status).toBe("ready");
    expect(plan.candidates[0]).toMatchObject({
      skill: { name: "project-margin-review" },
      routeKey: "project-margin-review",
      sourceMountKey: "etc",
      schemaKeys: ["schemas/project-margin-review.schema.json"],
    });
    expect(plan.candidates[0].toolMappings).toMatchObject({
      "finance-calc.project_margin": { tool: "finance_project_margin" },
    });
    expect(plan.diagnostics.issues).toEqual([]);
  });

  it("blocks when a required skill is not present in the resolved assembly", () => {
    const plan = planYapRuntime(fakeAssembly(), {
      task: "Run cash flow review",
      requiredSkills: ["cash-flow-review"],
    });

    expect(plan.status).toBe("blocked");
    expect(plan.diagnostics.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "required_skill_missing",
          severity: "error",
          key: "cash-flow-review",
        }),
      ]),
    );
  });

  it("marks plans degraded when the assembly contains resolver conflicts", () => {
    const assembly = fakeAssembly();
    assembly.diagnostics.conflicts.push({
      kind: "route",
      key: "project-margin-review",
      sourcePackIds: ["spack_core", "spack_etc"],
      message: "Route graph entry project-margin-review is declared by multiple packs",
    });

    const plan = planYapRuntime(assembly, {
      task: "Review project margin",
    });

    expect(plan.status).toBe("degraded");
    expect(plan.diagnostics.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "assembly_conflicts",
          severity: "warning",
        }),
      ]),
    );
  });
});

function fakeAssembly(): ResolvedYapManifest {
  return {
    yap: {
      id: "yap_test",
      slug: "yigfinance",
      version: "0.7.0",
      displayName: "Yigfinance",
      description: "Finance analysis YAP",
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
    },
    corePack: {
      role: "core",
      mount: null,
      skillPack: {
        id: "spack_core",
        yapId: "yap_test",
        name: "yigfinance",
        version: "0.7.0",
        displayName: "Yigfinance Core",
        description: "Core finance pack",
        packType: "core",
        contractVersion: "1.0",
        compatibility: {},
        manifest: {},
        source: "imported",
        status: "active",
        createdAt: 1,
        updatedAt: 1,
        releasedAt: 1,
      },
      artifacts: {
        manifest: {},
        routes: null,
        toolMap: null,
        feedback: null,
        update: null,
        schemas: {},
        artifactIndex: [],
      },
    },
    mountedPacks: [
      {
        role: "mount",
        mount: {
          id: "mount_etc",
          yapId: "yap_test",
          skillPackId: "spack_etc",
          mountKey: "etc",
          mountPoint: "extensions",
          displayName: "ETC",
          priority: 20,
          enabled: true,
          required: false,
          config: {},
          constraints: {},
          createdAt: 1,
          updatedAt: 1,
        },
        skillPack: {
          id: "spack_etc",
          yapId: "yap_test",
          name: "etc-professional-projects",
          version: "1.2.3",
          displayName: "ETC Professional Projects",
          description: "Project analysis pack",
          packType: "extension",
          contractVersion: "1.0",
          compatibility: {},
          manifest: {},
          source: "imported",
          status: "active",
          createdAt: 1,
          updatedAt: 1,
          releasedAt: 1,
        },
        artifacts: {
          manifest: {},
          routes: null,
          toolMap: null,
          feedback: null,
          update: null,
          schemas: {},
          artifactIndex: [],
        },
      },
    ],
    merged: {
      contractVersion: "1.0",
      packOrder: ["spack_core", "spack_etc"],
      skills: [
        {
          name: "variance-review",
          version: "0.7.0",
          sourcePackId: "spack_core",
          sourcePackName: "yigfinance",
          sourceMountKey: null,
          definition: {
            name: "variance-review",
            description: "Review financial variance and management commentary",
          },
        },
        {
          name: "project-margin-review",
          version: "1.2.3",
          sourcePackId: "spack_etc",
          sourcePackName: "etc-professional-projects",
          sourceMountKey: "etc",
          definition: {
            name: "project-margin-review",
            description: "Review ETC project margin and project risk",
          },
        },
      ],
      routes: {
        contract_version: "1.0",
        skills: {
          "variance-review": {
            next_candidates: ["project-margin-review"],
          },
          "project-margin-review": {
            next_candidates: ["variance-review"],
          },
        },
      },
      toolMap: {
        contract_version: "1.0",
        mappings: {
          "finance-calc.project_margin": {
            tool: "finance_project_margin",
            skill: "project-margin-review",
          },
          "finance-calc.variance_bridge": {
            tool: "finance_variance_bridge",
            skill: "variance-review",
          },
        },
      },
      schemas: {
        "schemas/project-margin-review.schema.json": {
          title: "Project margin review",
        },
      },
      artifactIndex: [
        {
          id: "artifact_schema",
          artifactType: "schema",
          artifactPath: "schemas/project-margin-review.schema.json",
          mediaType: "application/schema+json",
          contentSha256: "abcdef1234567890",
          sourcePackId: "spack_etc",
          sourcePackName: "etc-professional-projects",
          sourceMountKey: "etc",
        },
      ],
    },
    diagnostics: {
      conflicts: [],
      warnings: [],
    },
    generatedAt: 1,
  };
}
