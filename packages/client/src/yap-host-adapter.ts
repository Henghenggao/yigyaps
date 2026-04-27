/**
 * YAP Host Adapter
 *
 * Small orchestration helper for hosts that want to call a YAP product
 * remotely, then execute the selected SkillPack artifacts locally.
 *
 * License: Apache 2.0
 */

import type {
  RemoteYapManifest,
  ResolvedYapArtifactRef,
  ResolvedYapManifest,
  YapRuntimePlan,
  YapRuntimePlanCandidate,
  YapRuntimePlanRequest,
} from "@yigyaps/types";

export const YIGTHINKER_HOST = "yigthinker";
export const YIGCORE_ADDINS_HOST = "yigcore-addins";

export type YigYapsHostTarget =
  | typeof YIGTHINKER_HOST
  | typeof YIGCORE_ADDINS_HOST
  | (string & {});

export interface YapHostRuntimeClient {
  getYapRemoteManifest(
    yapIdOrSlug: string,
    query?: {
      host?: string;
      hostVersion?: string;
      mountKeys?: string[];
      maxMounts?: number;
    },
  ): Promise<RemoteYapManifest>;

  getYapAssembly(
    yapIdOrSlug: string,
    query?: { maxMounts?: number },
  ): Promise<ResolvedYapManifest>;

  planYapRuntime(
    yapIdOrSlug: string,
    params: YapRuntimePlanRequest,
    query?: { maxMounts?: number },
  ): Promise<YapRuntimePlan>;
}

export interface PrepareYapHostRuntimeOptions {
  yap: string;
  task: string;
  host: YigYapsHostTarget;
  hostVersion?: string;
  mountKeys?: string[];
  maxMounts?: number;
  maxCandidates?: number;
  requiredSkills?: string[];
  expectedContractVersion?: string;
  hints?: YapRuntimePlanRequest["hints"];
  fetchAssembly?: boolean;
}

export interface YapHostRuntimeHandoff {
  mode: "local-plan";
  yap: {
    id: string;
    slug: string;
    version: string;
    displayName: string;
  };
  host: RemoteYapManifest["host"];
  manifest: RemoteYapManifest;
  plan: YapRuntimePlan;
  assembly: ResolvedYapManifest | null;
  selectedCandidate: YapRuntimePlanCandidate | null;
  artifactIndex: ResolvedYapArtifactRef[];
  selectedArtifactIndex: ResolvedYapArtifactRef[];
  endpoints: RemoteYapManifest["remote"]["endpoints"];
  warnings: string[];
}

export async function prepareYapHostRuntime(
  client: YapHostRuntimeClient,
  options: PrepareYapHostRuntimeOptions,
): Promise<YapHostRuntimeHandoff> {
  const manifest = await client.getYapRemoteManifest(options.yap, {
    host: options.host,
    hostVersion: options.hostVersion,
    mountKeys: options.mountKeys,
    maxMounts: options.maxMounts,
  });

  const plan = await client.planYapRuntime(
    options.yap,
    {
      task: options.task,
      requiredSkills: options.requiredSkills,
      expectedContractVersion:
        options.expectedContractVersion ?? manifest.assembly.contractVersion,
      maxCandidates: options.maxCandidates,
      hints: mergeMountHints(options.hints, options.mountKeys),
    },
    { maxMounts: options.maxMounts },
  );

  const assembly =
    options.fetchAssembly === false
      ? null
      : await client.getYapAssembly(options.yap, {
          maxMounts: options.maxMounts,
        });
  const selectedCandidate = plan.candidates[0] ?? null;

  return {
    mode: "local-plan",
    yap: {
      id: manifest.product.id,
      slug: manifest.product.slug,
      version: manifest.product.version,
      displayName: manifest.product.displayName,
    },
    host: manifest.host,
    manifest,
    plan,
    assembly,
    selectedCandidate,
    artifactIndex: manifest.artifacts.index,
    selectedArtifactIndex: selectCandidateArtifacts(
      manifest.artifacts.index,
      selectedCandidate,
    ),
    endpoints: manifest.remote.endpoints,
    warnings: collectHandoffWarnings(manifest, plan, selectedCandidate),
  };
}

function mergeMountHints(
  hints: YapRuntimePlanRequest["hints"],
  mountKeys: string[] | undefined,
): YapRuntimePlanRequest["hints"] {
  if (!mountKeys?.length) {
    return hints;
  }

  const mergedMountKeys = Array.from(
    new Set([...(hints?.mountKeys ?? []), ...mountKeys]),
  );

  return {
    ...hints,
    mountKeys: mergedMountKeys,
  };
}

function selectCandidateArtifacts(
  artifacts: ResolvedYapArtifactRef[],
  candidate: YapRuntimePlanCandidate | null,
): ResolvedYapArtifactRef[] {
  if (!candidate) {
    return [];
  }

  const schemaKeys = new Set(candidate.schemaKeys);
  return artifacts.filter(
    (artifact) =>
      artifact.sourcePackId === candidate.sourcePackId ||
      schemaKeys.has(artifact.artifactPath),
  );
}

function collectHandoffWarnings(
  manifest: RemoteYapManifest,
  plan: YapRuntimePlan,
  selectedCandidate: YapRuntimePlanCandidate | null,
): string[] {
  const warnings = [...manifest.host.compatibility.packs]
    .filter((pack) => pack.compatibility.status !== "declared")
    .map(
      (pack) =>
        `Pack ${pack.name}@${pack.version} has not declared compatibility with ${manifest.host.target}.`,
    );

  if (manifest.host.compatibility.status !== "compatible") {
    warnings.push(
      `Host compatibility is ${manifest.host.compatibility.status} for ${manifest.host.target}.`,
    );
  }

  if (plan.status !== "ready") {
    warnings.push(`Runtime plan status is ${plan.status}.`);
  }

  if (!selectedCandidate) {
    warnings.push("No runtime candidate was selected.");
  }

  return [...warnings, ...plan.diagnostics.warnings];
}
