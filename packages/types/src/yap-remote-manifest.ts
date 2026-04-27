/**
 * Remote YAP Manifest Types
 *
 * Compact contract used by remote hosts such as Yigthinker and Yigcore add-ins
 * to discover a YAP product, verify the assembly shape, and locate execution
 * planning endpoints without downloading every artifact body first.
 *
 * License: Apache 2.0
 */

import type { ResolvedYapArtifactRef } from "./yap-assembly.js";
import type { YapStatus, YapVisibility } from "./yap.js";

export type RemoteYapManifestSchemaVersion = "yigyaps.remote-manifest.v1";

export type RemoteHostCompatibilityStatus =
  | "compatible"
  | "incompatible"
  | "partial"
  | "unknown";

export interface RemoteYapManifestPackSummary {
  id: string;
  name: string;
  version: string;
  packType: "core" | "extension";
  contractVersion: string;
  artifactCount: number;
  mountKey: string | null;
  mountPoint: string | null;
  compatibility: {
    status: "compatible" | "incompatible" | "declared" | "not_declared";
    range: string | null;
  };
}

export interface RemoteYapManifest {
  schemaVersion: RemoteYapManifestSchemaVersion;
  product: {
    id: string;
    slug: string;
    version: string;
    displayName: string;
    description: string;
    category: string;
    visibility: YapVisibility;
    status: YapStatus;
    ownerName: string;
  };
  host: {
    target: string;
    version: string | null;
    compatibility: {
      status: RemoteHostCompatibilityStatus;
      packs: RemoteYapManifestPackSummary[];
    };
  };
  remote: {
    baseUrl: string;
    endpoints: {
      assembly: string;
      runtimePlan: string;
      remoteManifest: string;
    };
    invocationModes: Array<"local-plan" | "hosted-plan">;
  };
  assembly: {
    generatedAt: number;
    contractVersion: string;
    corePack: RemoteYapManifestPackSummary;
    mountedPacks: RemoteYapManifestPackSummary[];
    packOrder: string[];
    skillCount: number;
    routeCount: number;
    toolMappingCount: number;
    schemaCount: number;
    qualityReportCount: number;
    qualityGateStatus: string | null;
    conflictCount: number;
    warningCount: number;
  };
  artifacts: {
    fetchMode: "assembly";
    index: ResolvedYapArtifactRef[];
  };
  integrity: {
    manifestSha256: string;
    etag: string;
    generatedAt: number;
  };
}
