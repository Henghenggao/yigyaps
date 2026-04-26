/**
 * YAP Runtime Planner Types
 *
 * A runtime plan is a non-executing planner result. It maps a task to candidate
 * skills/routes/tools from a resolved YAP assembly.
 *
 * License: Apache 2.0
 */

import type { Yap } from "./yap.js";
import type { ResolvedYapSkill } from "./yap-assembly.js";

export type YapRuntimePlanStatus = "ready" | "degraded" | "blocked";
export type YapRuntimePlanIssueSeverity = "warning" | "error";

export interface YapRuntimePlanRequest {
  task: string;
  requiredSkills?: string[];
  expectedContractVersion?: string;
  maxCandidates?: number;
  hints?: {
    skillNames?: string[];
    mountKeys?: string[];
    routeKeys?: string[];
    toolKeys?: string[];
  };
}

export interface YapRuntimePlanIssue {
  severity: YapRuntimePlanIssueSeverity;
  code:
    | "assembly_conflicts"
    | "contract_version_mismatch"
    | "required_skill_missing"
    | "no_candidate_skills"
    | "missing_route"
    | "missing_tool_mapping";
  message: string;
  key?: string;
  details?: Record<string, unknown>;
}

export interface YapRuntimePlanCandidate {
  skill: ResolvedYapSkill;
  sourcePackId: string;
  sourcePackName: string;
  sourceMountKey: string | null;
  routeKey: string | null;
  route: Record<string, unknown> | null;
  toolMappings: Record<string, unknown>;
  schemaKeys: string[];
  score: number;
  reasons: string[];
}

export interface YapRuntimePlan {
  yap: Yap;
  task: string;
  status: YapRuntimePlanStatus;
  candidates: YapRuntimePlanCandidate[];
  diagnostics: {
    issues: YapRuntimePlanIssue[];
    warnings: string[];
  };
  generatedAt: number;
}
