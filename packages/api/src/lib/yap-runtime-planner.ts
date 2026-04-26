/**
 * YAP Runtime Planner
 *
 * Produces a non-executing runtime plan from a resolved YAP assembly.
 *
 * License: Apache 2.0
 */

import type {
  ResolvedYapManifest,
  ResolvedYapSkill,
  YapRuntimePlan,
  YapRuntimePlanCandidate,
  YapRuntimePlanIssue,
  YapRuntimePlanRequest,
} from "@yigyaps/types";

const DEFAULT_MAX_CANDIDATES = 5;
const MAX_CANDIDATES_CAP = 25;

export function planYapRuntime(
  assembly: ResolvedYapManifest,
  request: YapRuntimePlanRequest,
): YapRuntimePlan {
  const maxCandidates = Math.min(
    Math.max(request.maxCandidates ?? DEFAULT_MAX_CANDIDATES, 1),
    MAX_CANDIDATES_CAP,
  );
  const issues: YapRuntimePlanIssue[] = [];
  const warnings: string[] = [...assembly.diagnostics.warnings];

  if (
    request.expectedContractVersion &&
    request.expectedContractVersion !== assembly.merged.contractVersion
  ) {
    issues.push({
      severity: "error",
      code: "contract_version_mismatch",
      message: `Runtime expected contract ${request.expectedContractVersion} but assembly uses ${assembly.merged.contractVersion}`,
      details: {
        expectedContractVersion: request.expectedContractVersion,
        actualContractVersion: assembly.merged.contractVersion,
      },
    });
  }

  if (assembly.diagnostics.conflicts.length > 0) {
    issues.push({
      severity: "warning",
      code: "assembly_conflicts",
      message: "Assembly contains resolver conflicts; candidate ordering may be degraded",
      details: {
        conflicts: assembly.diagnostics.conflicts,
      },
    });
  }

  const skillsByName = new Map(
    assembly.merged.skills.map((skill) => [normalizeKey(skill.name), skill]),
  );
  for (const required of request.requiredSkills ?? []) {
    if (!skillsByName.has(normalizeKey(required))) {
      issues.push({
        severity: "error",
        code: "required_skill_missing",
        message: `Required skill ${required} is not present in the resolved YAP assembly`,
        key: required,
      });
    }
  }

  const candidates = assembly.merged.skills
    .map((skill) => candidateForSkill(assembly, skill, request))
    .filter((candidate) => candidate.score > 0 || isRequiredSkill(candidate, request))
    .sort(compareCandidates)
    .slice(0, maxCandidates);

  if (assembly.merged.skills.length === 0) {
    issues.push({
      severity: "error",
      code: "no_candidate_skills",
      message: "Resolved YAP assembly contains no skills to plan against",
    });
  } else if (candidates.length === 0) {
    issues.push({
      severity: "warning",
      code: "no_candidate_skills",
      message: "No skills matched the task or hints",
    });
  }

  for (const candidate of candidates) {
    if (!candidate.route) {
      issues.push({
        severity: "warning",
        code: "missing_route",
        message: `Candidate skill ${candidate.skill.name} does not have a route graph entry`,
        key: candidate.skill.name,
      });
    }
    if (Object.keys(candidate.toolMappings).length === 0) {
      issues.push({
        severity: "warning",
        code: "missing_tool_mapping",
        message: `Candidate skill ${candidate.skill.name} does not have a tool-map entry`,
        key: candidate.skill.name,
      });
    }
  }

  const hasErrors = issues.some((issue) => issue.severity === "error");
  const hasWarnings = issues.some((issue) => issue.severity === "warning");

  return {
    yap: assembly.yap,
    task: request.task,
    status: hasErrors ? "blocked" : hasWarnings ? "degraded" : "ready",
    candidates,
    diagnostics: {
      issues,
      warnings,
    },
    generatedAt: Date.now(),
  };
}

function candidateForSkill(
  assembly: ResolvedYapManifest,
  skill: ResolvedYapSkill,
  request: YapRuntimePlanRequest,
): YapRuntimePlanCandidate {
  const reasons: string[] = [];
  let score = 0;
  const normalizedSkill = normalizeKey(skill.name);
  const taskTokens = tokenSet(request.task);
  const skillTokens = tokenSet(
    `${skill.name} ${JSON.stringify(skill.definition)} ${skill.sourcePackName} ${skill.sourceMountKey ?? ""}`,
  );

  const requiredSkills = new Set(
    (request.requiredSkills ?? []).map((item) => normalizeKey(item)),
  );
  if (requiredSkills.has(normalizedSkill)) {
    score += 120;
    reasons.push("required skill");
  }

  const hintSkillNames = new Set(
    (request.hints?.skillNames ?? []).map((item) => normalizeKey(item)),
  );
  if (hintSkillNames.has(normalizedSkill)) {
    score += 90;
    reasons.push("skill hint");
  }

  if (
    skill.sourceMountKey &&
    (request.hints?.mountKeys ?? [])
      .map((item) => normalizeKey(item))
      .includes(normalizeKey(skill.sourceMountKey))
  ) {
    score += 35;
    reasons.push("mount hint");
  }

  const route = routeForSkill(assembly, skill.name);
  if (route) {
    const routeHints = new Set(
      (request.hints?.routeKeys ?? []).map((item) => normalizeKey(item)),
    );
    if (routeHints.has(normalizedSkill)) {
      score += 40;
      reasons.push("route hint");
    }
    score += 10;
    reasons.push("route available");
  }

  const toolMappings = toolMappingsForSkill(assembly, skill);
  const hintedTools = new Set(
    (request.hints?.toolKeys ?? []).map((item) => normalizeKey(item)),
  );
  for (const key of Object.keys(toolMappings)) {
    const normalizedTool = normalizeKey(key);
    if (hintedTools.has(normalizedTool)) {
      score += 35;
      reasons.push("tool hint");
    }
  }
  if (Object.keys(toolMappings).length > 0) {
    score += 10;
    reasons.push("tool mapping available");
  }

  const schemaKeys = schemaKeysForSkill(assembly, skill);
  if (schemaKeys.length > 0) {
    score += 5;
    reasons.push("schema available");
  }

  const overlap = countOverlap(taskTokens, skillTokens);
  if (overlap > 0) {
    score += overlap * 12;
    reasons.push(`${overlap} task token matches`);
  }

  return {
    skill,
    sourcePackId: skill.sourcePackId,
    sourcePackName: skill.sourcePackName,
    sourceMountKey: skill.sourceMountKey,
    routeKey: route ? skill.name : null,
    route,
    toolMappings,
    schemaKeys,
    score,
    reasons,
  };
}

function isRequiredSkill(
  candidate: YapRuntimePlanCandidate,
  request: YapRuntimePlanRequest,
): boolean {
  return (request.requiredSkills ?? [])
    .map((item) => normalizeKey(item))
    .includes(normalizeKey(candidate.skill.name));
}

function compareCandidates(
  left: YapRuntimePlanCandidate,
  right: YapRuntimePlanCandidate,
): number {
  if (right.score !== left.score) return right.score - left.score;
  return left.skill.name.localeCompare(right.skill.name);
}

function routeForSkill(
  assembly: ResolvedYapManifest,
  skillName: string,
): Record<string, unknown> | null {
  const routes = recordAt(assembly.merged.routes, "skills");
  const route = routes[skillName];
  return isRecord(route) ? route : null;
}

function toolMappingsForSkill(
  assembly: ResolvedYapManifest,
  skill: ResolvedYapSkill,
): Record<string, unknown> {
  const mappings = recordAt(assembly.merged.toolMap, "mappings");
  const result: Record<string, unknown> = {};
  const normalizedSkill = normalizeKey(skill.name);
  for (const [key, value] of Object.entries(mappings)) {
    const haystack = normalizeKey(`${key} ${JSON.stringify(value)}`);
    if (haystack.includes(normalizedSkill)) {
      result[key] = value;
    }
  }
  return result;
}

function schemaKeysForSkill(
  assembly: ResolvedYapManifest,
  skill: ResolvedYapSkill,
): string[] {
  const normalizedSkill = normalizeKey(skill.name);
  return Object.keys(assembly.merged.schemas).filter((key) =>
    normalizeKey(key).includes(normalizedSkill),
  );
}

function tokenSet(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3),
  );
}

function countOverlap(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function recordAt(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
