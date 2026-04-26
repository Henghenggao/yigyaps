/**
 * Skill Pack Types
 *
 * Skill Packs are mountable modules inside a YAP. Their artifacts preserve the
 * SkillPack Bridge contract used by Yigfinance and future YAPs.
 *
 * License: Apache 2.0
 */

export type SkillPackType = "core" | "extension";
export type SkillPackStatus = "draft" | "active" | "archived";
export type SkillPackSource = "manual" | "imported" | "generated";

export type SkillPackArtifactType =
  | "skillpack"
  | "tool-map"
  | "routes"
  | "feedback"
  | "update"
  | "schema"
  | "command"
  | "skill-md"
  | "other";

export interface SkillPack {
  id: string;
  yapId: string;
  name: string;
  version: string;
  displayName: string;
  description: string;
  packType: SkillPackType;
  contractVersion: string;
  compatibility: Record<string, unknown>;
  manifest: Record<string, unknown>;
  source: SkillPackSource;
  status: SkillPackStatus;
  createdAt: number;
  updatedAt: number;
  releasedAt: number;
}

export interface SkillPackArtifact {
  id: string;
  skillPackId: string;
  artifactType: SkillPackArtifactType;
  artifactPath: string;
  mediaType: string;
  content: unknown;
  contentSha256: string;
  createdAt: number;
  updatedAt: number;
}

export interface YapPackMount {
  id: string;
  yapId: string;
  skillPackId: string;
  mountKey: string;
  mountPoint: string;
  displayName: string;
  priority: number;
  enabled: boolean;
  required: boolean;
  config: Record<string, unknown>;
  constraints: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface YapPackMountWithSkillPack {
  mount: YapPackMount;
  skillPack: SkillPack;
}
