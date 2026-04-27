/**
 * Resolved YAP Assembly Types
 *
 * A resolved assembly is the read model for a YAP's core Skill Pack plus
 * mounted extension packs.
 *
 * License: Apache 2.0
 */

import type { Yap } from "./yap.js";
import type {
  SkillPack,
  SkillPackArtifact,
  YapPackMount,
} from "./skill-pack.js";

export interface ResolvedYapArtifactRef {
  id: string;
  artifactType: SkillPackArtifact["artifactType"];
  artifactPath: string;
  mediaType: string;
  contentSha256: string;
  sourcePackId: string;
  sourcePackName: string;
  sourceMountKey: string | null;
}

export interface ResolvedYapPackArtifacts {
  manifest: Record<string, unknown>;
  routes: Record<string, unknown> | null;
  toolMap: Record<string, unknown> | null;
  feedback: Record<string, unknown> | null;
  update: Record<string, unknown> | null;
  schemas: Record<string, unknown>;
  qualityReports: Record<string, unknown>[];
  artifactIndex: ResolvedYapArtifactRef[];
}

export interface ResolvedYapPack {
  role: "core" | "mount";
  mount: YapPackMount | null;
  skillPack: SkillPack;
  artifacts: ResolvedYapPackArtifacts;
}

export interface ResolvedYapSkill {
  name: string;
  version?: string;
  status?: string;
  sourcePackId: string;
  sourcePackName: string;
  sourceMountKey: string | null;
  definition: Record<string, unknown>;
}

export interface ResolvedYapConflict {
  kind: "skill" | "route" | "tool-map" | "schema";
  key: string;
  sourcePackIds: string[];
  message: string;
}

export interface ResolvedYapManifest {
  yap: Yap;
  corePack: ResolvedYapPack;
  mountedPacks: ResolvedYapPack[];
  merged: {
    contractVersion: string;
    packOrder: string[];
    skills: ResolvedYapSkill[];
    routes: Record<string, unknown>;
    toolMap: Record<string, unknown>;
    schemas: Record<string, unknown>;
    qualityReports: Record<string, unknown>[];
    artifactIndex: ResolvedYapArtifactRef[];
  };
  diagnostics: {
    conflicts: ResolvedYapConflict[];
    warnings: string[];
  };
  generatedAt: number;
}

export type YapMountValidationStatus = "pass" | "warning" | "blocked";
export type YapMountValidationSeverity = "warning" | "error";

export interface YapMountValidationIssue {
  severity: YapMountValidationSeverity;
  code:
    | "missing_core_pack"
    | "contract_version_mismatch"
    | "yap_compatibility_mismatch"
    | "duplicate_skill"
    | "duplicate_route"
    | "duplicate_tool_mapping"
    | "duplicate_schema";
  message: string;
  key?: string;
  sourcePackIds: string[];
  details?: Record<string, unknown>;
}

export interface YapMountValidationResult {
  status: YapMountValidationStatus;
  issues: YapMountValidationIssue[];
  candidate: {
    yapId: string;
    skillPackId: string;
    mountKey: string;
    enabled: boolean;
    replacingMountId: string | null;
  };
  summary: {
    packOrder: string[];
    skillCount: number;
    routeCount: number;
    toolMappingCount: number;
    schemaCount: number;
  };
  generatedAt: number;
}
