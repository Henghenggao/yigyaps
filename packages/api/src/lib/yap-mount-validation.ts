/**
 * YAP Mount Validation
 *
 * Validates whether a candidate extension pack can be activated in a YAP
 * assembly before the mount is created or enabled.
 *
 * License: Apache 2.0
 */

import type {
  YapMountValidationIssue,
  YapMountValidationResult,
} from "@yigyaps/types";
import type {
  SkillPackArtifactRow,
  SkillPackRow,
  YapPackMountRow,
  YapRow,
} from "@yigyaps/db";
import { resolveYapAssembly } from "./yap-assembly-resolver.js";
import { satisfiesVersionRange } from "./semver-compat.js";

export interface MountValidationPackInput {
  mount: YapPackMountRow;
  skillPack: SkillPackRow;
  artifacts: SkillPackArtifactRow[];
}

export interface ValidateYapMountCandidateInput {
  yap: YapRow;
  corePack: SkillPackRow | null;
  coreArtifacts: SkillPackArtifactRow[];
  existingMounts: MountValidationPackInput[];
  candidateMount: YapPackMountRow;
  candidatePack: SkillPackRow;
  candidateArtifacts: SkillPackArtifactRow[];
  replacingMountId?: string;
}

export function validateYapMountCandidate(
  input: ValidateYapMountCandidateInput,
): YapMountValidationResult {
  const issues: YapMountValidationIssue[] = [];

  if (!input.corePack) {
    return {
      status: "blocked",
      issues: [
        {
          severity: "error",
          code: "missing_core_pack",
          message: "A core Skill Pack is required before activating extensions",
          sourcePackIds: [input.candidatePack.id],
        },
      ],
      candidate: candidateSummary(input),
      summary: emptySummary(),
      generatedAt: Date.now(),
    };
  }

  if (input.candidatePack.contractVersion !== input.corePack.contractVersion) {
    issues.push({
      severity: "error",
      code: "contract_version_mismatch",
      message: `Candidate contract ${input.candidatePack.contractVersion} does not match core contract ${input.corePack.contractVersion}`,
      sourcePackIds: [input.corePack.id, input.candidatePack.id],
      details: {
        coreContractVersion: input.corePack.contractVersion,
        candidateContractVersion: input.candidatePack.contractVersion,
      },
    });
  }

  const yapCompatibilityRange = compatibilityRangeForYap(
    input.candidatePack,
    input.yap.slug,
  );
  if (
    yapCompatibilityRange &&
    !satisfiesVersionRange(input.yap.version, yapCompatibilityRange)
  ) {
    issues.push({
      severity: "error",
      code: "yap_compatibility_mismatch",
      message: `Candidate pack ${input.candidatePack.name}@${input.candidatePack.version} declares compatibility ${yapCompatibilityRange} for ${input.yap.slug}, but YAP version is ${input.yap.version}`,
      sourcePackIds: [input.candidatePack.id],
      details: {
        yapSlug: input.yap.slug,
        yapVersion: input.yap.version,
        declaredRange: yapCompatibilityRange,
      },
    });
  }

  const candidateMounts = input.candidateMount.enabled
    ? [
        ...input.existingMounts.filter(
          ({ mount }) => mount.id !== input.replacingMountId,
        ),
        {
          mount: input.candidateMount,
          skillPack: input.candidatePack,
          artifacts: input.candidateArtifacts,
        },
      ]
    : input.existingMounts.filter(
        ({ mount }) => mount.id !== input.replacingMountId,
      );

  const assembly = resolveYapAssembly({
    yap: input.yap,
    corePack: {
      role: "core",
      mount: null,
      skillPack: input.corePack,
      artifacts: input.coreArtifacts,
    },
    mountedPacks: candidateMounts.map(({ mount, skillPack, artifacts }) => ({
      role: "mount",
      mount,
      skillPack,
      artifacts,
    })),
  });

  for (const conflict of assembly.diagnostics.conflicts) {
    issues.push({
      severity: "error",
      code: conflictCode(conflict.kind),
      message: conflict.message,
      key: conflict.key,
      sourcePackIds: conflict.sourcePackIds,
    });
  }

  const status = issues.some((issue) => issue.severity === "error")
    ? "blocked"
    : issues.length > 0
      ? "warning"
      : "pass";

  return {
    status,
    issues,
    candidate: candidateSummary(input),
    summary: {
      packOrder: assembly.merged.packOrder,
      skillCount: assembly.merged.skills.length,
      routeCount: Object.keys(recordAt(assembly.merged.routes, "skills"))
        .length,
      toolMappingCount: Object.keys(
        recordAt(assembly.merged.toolMap, "mappings"),
      ).length,
      schemaCount: Object.keys(assembly.merged.schemas).length,
    },
    generatedAt: Date.now(),
  };
}

function candidateSummary(input: ValidateYapMountCandidateInput) {
  return {
    yapId: input.yap.id,
    skillPackId: input.candidatePack.id,
    mountKey: input.candidateMount.mountKey,
    enabled: input.candidateMount.enabled,
    replacingMountId: input.replacingMountId ?? null,
  };
}

function emptySummary() {
  return {
    packOrder: [],
    skillCount: 0,
    routeCount: 0,
    toolMappingCount: 0,
    schemaCount: 0,
  };
}

function conflictCode(
  kind: "skill" | "route" | "tool-map" | "schema",
): YapMountValidationIssue["code"] {
  if (kind === "tool-map") return "duplicate_tool_mapping";
  if (kind === "route") return "duplicate_route";
  if (kind === "schema") return "duplicate_schema";
  return "duplicate_skill";
}

function compatibilityRangeForYap(
  skillPack: SkillPackRow,
  yapSlug: string,
): string | null {
  const value = skillPack.compatibility[yapSlug];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function recordAt(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
