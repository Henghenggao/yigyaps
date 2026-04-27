/**
 * YAP Import Preview Types
 *
 * Read-only contracts for staging external product repositories before
 * publishing them as YAP assemblies.
 *
 * License: Apache 2.0
 */

import type { YapStatus, YapVisibility } from "./yap.js";

export type YapImportFormat = "yigfinance";

export interface YapImportPreviewSource {
  sourceDir: string;
  pluginDir: string;
  commandsDir: string;
  skillsDir: string;
  testsDir: string;
}

export interface YapImportPreviewYap {
  slug: string;
  version: string;
  displayName: string;
  description: string;
  category: string;
  tags: string[];
  visibility: YapVisibility;
  status: Extract<YapStatus, "draft" | "active">;
}

export interface YapImportPreviewPack {
  name: string;
  version: string;
  displayName: string;
  packType: "core" | "extension";
  contractVersion: string;
  skillCount: number;
  artifactCount: number;
}

export interface YapImportPreviewMount {
  skillPackName: string;
  skillPackVersion: string;
  mountKey: string;
  mountPoint: string;
  displayName: string;
  priority: number;
  enabled: boolean;
  required: boolean;
}

export interface YapImportPreviewSummary {
  skillCount: number;
  coreSkillCount: number;
  schemaCount: number;
  commandCount: number;
  skillMarkdownCount: number;
  evalArtifactCount: number;
  qualityReportStatus: string | null;
  artifactCount: number;
  extensionPackCount: number;
  extensionSkillCount: number;
  defaultMountCount: number;
}

export interface YapImportPreview {
  format: YapImportFormat;
  source: YapImportPreviewSource;
  yap: YapImportPreviewYap;
  corePack: YapImportPreviewPack;
  extensionPacks: YapImportPreviewPack[];
  defaultMounts: YapImportPreviewMount[];
  summary: YapImportPreviewSummary;
  warnings: string[];
  generatedAt: number;
}

export interface YapImportExecutePackResult {
  id: string;
  name: string;
  version: string;
  packType: "core" | "extension";
  action: "created" | "updated";
  artifactCount: number;
}

export interface YapImportExecuteMountResult {
  id: string;
  mountKey: string;
  mountPoint: string;
  skillPackId: string;
  action: "created" | "updated";
}

export interface YapImportExecuteResult {
  success: true;
  preview: YapImportPreview;
  yap: {
    id: string;
    slug: string;
    version: string;
    displayName: string;
  };
  yapAction: "created" | "updated";
  corePack: YapImportExecutePackResult;
  extensionPacks: YapImportExecutePackResult[];
  defaultMounts: YapImportExecuteMountResult[];
  assemblyUrl: string;
}
