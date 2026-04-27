/**
 * Yigfinance Import Preview
 *
 * Scans a Yigfinance-style repository and returns an honest, read-only import
 * preview without publishing any YAP records or SkillPack artifacts.
 *
 * License: Apache 2.0
 */

import fs from "node:fs/promises";
import path from "node:path";
import type {
  SkillPackArtifactType,
  YapImportPreview,
  YapImportPreviewPack,
  YapImportPreviewSource,
} from "@yigyaps/types";

const DEFAULT_PLUGIN_DIR = path.join(
  "generated",
  "yigthinker",
  ".yigthinker-plugin",
);
const DEFAULT_COMMANDS_DIR = path.join("generated", "yigthinker", "commands");
const DEFAULT_SKILLS_DIR = path.join("generated", "claude", "skills");
const DEFAULT_TESTS_DIR = "tests";
const DEFAULT_QUALITY_REPORT_PATHS = [
  path.join(".yigyaps", "quality-report.json"),
  path.join(".yigyaps", "quality", "quality-report.json"),
  path.join("generated", "yigyaps", "quality-report.json"),
];
const DEFAULT_ETO_MOUNT_KEY = "eto";
const DEFAULT_ETO_MOUNT_POINT = "extensions";
const DEFAULT_ETO_MOUNT_PRIORITY = 20;
const MAX_EVAL_ARTIFACT_BYTES = 256 * 1024;
const ETO_EXTENSION_SKILLS = new Set([
  "project-margin-review",
  "ncc-rootcause-analysis",
  "contract-asset-liability-review",
  "functional-cost-review",
  "sales-coverage-review",
  "order-intake-review",
  "pvm-analysis",
  "cash-conversion-review",
]);

interface YigfinanceImportArtifactPlan {
  artifactType: SkillPackArtifactType;
  artifactPath: string;
  mediaType: string;
  content: unknown;
  skillName?: string;
}

export interface YigfinanceImportPackPlan {
  name: string;
  version: string;
  displayName: string;
  description: string;
  packType: "core" | "extension";
  contractVersion: string;
  compatibility: Record<string, unknown>;
  manifest: Record<string, unknown>;
  source: "imported";
  status: "active";
  artifacts: YigfinanceImportArtifactPlan[];
}

export interface YigfinanceDefaultMountExecutionPlan {
  skillPackName: string;
  skillPackVersion: string;
  mountKey: string;
  mountPoint: string;
  displayName: string;
  priority: number;
  enabled: boolean;
  required: boolean;
  config: Record<string, unknown>;
  constraints: Record<string, unknown>;
}

export interface YigfinanceImportExecutionPlan {
  preview: YapImportPreview;
  yap: {
    slug: string;
    version: string;
    displayName: string;
    description: string;
    readme?: string;
    category: string;
    tags: string[];
    visibility: "public" | "private" | "unlisted";
    status: "draft" | "active";
    assemblyConfig: Record<string, unknown>;
  };
  skillPack: YigfinanceImportPackPlan;
  extensionPacks: YigfinanceImportPackPlan[];
  defaultMounts: YigfinanceDefaultMountExecutionPlan[];
}

export class ImportPreviewError extends Error {
  constructor(
    public readonly statusCode: 400 | 403 | 422,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ImportPreviewError";
  }
}

export interface YigfinanceImportPreviewOptions {
  sourceDir: string;
  slug?: string;
  displayName?: string;
  description?: string;
  includeDefaultExtensions?: boolean;
  defaultExtensionMountKey?: string;
}

export async function previewYigfinanceImport(
  options: YigfinanceImportPreviewOptions,
): Promise<YapImportPreview> {
  const sourceDir = await resolveAllowedSourceDir(options.sourceDir);
  const source: YapImportPreviewSource = {
    sourceDir,
    pluginDir: path.resolve(sourceDir, DEFAULT_PLUGIN_DIR),
    commandsDir: path.resolve(sourceDir, DEFAULT_COMMANDS_DIR),
    skillsDir: path.resolve(sourceDir, DEFAULT_SKILLS_DIR),
    testsDir: path.resolve(sourceDir, DEFAULT_TESTS_DIR),
  };

  await ensureDirectory(source.sourceDir, "source directory");
  await ensureDirectory(source.pluginDir, "Yigfinance plugin directory");
  await ensureDirectory(source.commandsDir, "Yigfinance commands directory");
  await ensureDirectory(source.skillsDir, "Yigfinance skills directory");

  const skillpackManifest = await readJsonRecord(
    path.join(source.pluginDir, "skillpack.json"),
    "skillpack.json",
  );
  const pluginManifest = await readJsonRecord(
    path.join(source.pluginDir, "plugin.json"),
    "plugin.json",
  );
  for (const file of ["routes.json", "tool-map.json", "feedback.json", "update.json"]) {
    await readJsonRecord(path.join(source.pluginDir, file), file);
  }

  const schemaFiles = await listFiles(path.join(source.pluginDir, "schemas"), (
    file,
  ) => file.endsWith(".json"));
  const commandFiles = await listFiles(source.commandsDir, (file) =>
    file.endsWith(".md"),
  );
  const skillFiles = await listFiles(
    source.skillsDir,
    (file) => path.basename(file) === "SKILL.md",
  );
  const hookFiles = await listFiles(path.join(source.pluginDir, "hooks"), () => true);

  const name =
    readString(skillpackManifest, "name") ??
    readString(pluginManifest, "name") ??
    "yigfinance";
  const version =
    readString(skillpackManifest, "version") ??
    readString(pluginManifest, "version") ??
    "0.1.0";
  const contractVersion =
    readString(skillpackManifest, "contract_version") ?? "1.0";
  const description =
    options.description ??
    readString(pluginManifest, "description") ??
    "Finance analysis skill stack for CFO-grade financial analysis";
  const displayName =
    options.displayName ??
    toDisplayName(readString(pluginManifest, "name") ?? name);
  const slug = options.slug ?? name;
  const skillNames = readSkillNames(skillpackManifest);
  const includeDefaultExtensions = options.includeDefaultExtensions !== false;
  const etoSkillNames = includeDefaultExtensions
    ? [...skillNames].filter((skillName) => ETO_EXTENSION_SKILLS.has(skillName))
    : [];
  const coreSkillNames =
    etoSkillNames.length > 0
      ? new Set([...skillNames].filter((skillName) => !etoSkillNames.includes(skillName)))
      : skillNames;
  const evalArtifacts = await collectEvalArtifacts(source.testsDir, skillNames);
  const qualityReport = await buildQualityReportArtifact({
    sourceDir: source.sourceDir,
    testsDir: source.testsDir,
    evalArtifacts,
    skillNames,
  });
  const coreEvalArtifactCount = countEvalArtifacts(
    evalArtifacts,
    coreSkillNames,
    true,
  );
  const extensionEvalArtifactCount =
    etoSkillNames.length > 0
      ? countEvalArtifacts(evalArtifacts, new Set(etoSkillNames), false)
      : 0;
  const coreSkillCount =
    etoSkillNames.length > 0 ? skillNames.size - etoSkillNames.length : skillNames.size;
  const requiredBridgeArtifactCount = 5;
  const unscopedArtifactCount = requiredBridgeArtifactCount + hookFiles.length;
  const coreArtifactCount =
    unscopedArtifactCount +
    countSkillScopedFiles(schemaFiles, etoSkillNames, false) +
    countSkillScopedFiles(commandFiles, etoSkillNames, false) +
    countSkillScopedFiles(skillFiles, etoSkillNames, false) +
    coreEvalArtifactCount +
    1 +
    1;
  const extensionArtifactCount =
    etoSkillNames.length > 0
      ? 4 +
        countSkillScopedFiles(schemaFiles, etoSkillNames, true) +
        countSkillScopedFiles(commandFiles, etoSkillNames, true) +
        countSkillScopedFiles(skillFiles, etoSkillNames, true) +
        extensionEvalArtifactCount +
        1
      : 0;

  const extensionPacks: YapImportPreviewPack[] =
    etoSkillNames.length > 0
      ? [
          {
            name: `${name}-eto-professional-projects`,
            version,
            displayName: "Yigfinance ETO Professional Projects",
            packType: "extension",
            contractVersion,
            skillCount: etoSkillNames.length,
            artifactCount: extensionArtifactCount,
          },
        ]
      : [];

  const warnings = [];
  if (skillFiles.length < skillNames.size) {
    warnings.push(
      `${skillNames.size - skillFiles.length} skills do not have indexed SKILL.md files`,
    );
  }
  if (extensionPacks.length === 0 && includeDefaultExtensions) {
    warnings.push("No default ETO extension skills detected");
  }

  return {
    format: "yigfinance",
    source,
    yap: {
      slug,
      version,
      displayName,
      description,
      category: "finance",
      tags: ["finance", "cfo", "analysis", "yigfinance"],
      visibility: "public",
      status: "active",
    },
    corePack: {
      name,
      version,
      displayName,
      packType: "core",
      contractVersion,
      skillCount: coreSkillCount,
      artifactCount: coreArtifactCount,
    },
    extensionPacks,
    defaultMounts:
      extensionPacks.length > 0
        ? [
            {
              skillPackName: extensionPacks[0].name,
              skillPackVersion: extensionPacks[0].version,
              mountKey:
                options.defaultExtensionMountKey ?? DEFAULT_ETO_MOUNT_KEY,
              mountPoint: DEFAULT_ETO_MOUNT_POINT,
              displayName: "ETO Project Pack",
              priority: DEFAULT_ETO_MOUNT_PRIORITY,
              enabled: true,
              required: false,
            },
          ]
        : [],
    summary: {
      skillCount: skillNames.size,
      coreSkillCount,
      schemaCount: schemaFiles.length,
      commandCount: commandFiles.length,
      skillMarkdownCount: skillFiles.length,
      evalArtifactCount: evalArtifacts.length,
      qualityReportStatus: qualityReportStatus(qualityReport.content),
      artifactCount: coreArtifactCount + extensionArtifactCount,
      extensionPackCount: extensionPacks.length,
      extensionSkillCount: etoSkillNames.length,
      defaultMountCount: extensionPacks.length > 0 ? 1 : 0,
    },
    warnings,
    generatedAt: Date.now(),
  };
}

export async function planYigfinanceImportExecution(
  options: YigfinanceImportPreviewOptions,
): Promise<YigfinanceImportExecutionPlan> {
  const sourceDir = await resolveAllowedSourceDir(options.sourceDir);
  const source: YapImportPreviewSource = {
    sourceDir,
    pluginDir: path.resolve(sourceDir, DEFAULT_PLUGIN_DIR),
    commandsDir: path.resolve(sourceDir, DEFAULT_COMMANDS_DIR),
    skillsDir: path.resolve(sourceDir, DEFAULT_SKILLS_DIR),
    testsDir: path.resolve(sourceDir, DEFAULT_TESTS_DIR),
  };

  await ensureDirectory(source.sourceDir, "source directory");
  await ensureDirectory(source.pluginDir, "Yigfinance plugin directory");
  await ensureDirectory(source.commandsDir, "Yigfinance commands directory");
  await ensureDirectory(source.skillsDir, "Yigfinance skills directory");

  const skillpackManifest = await readJsonRecord(
    path.join(source.pluginDir, "skillpack.json"),
    "skillpack.json",
  );
  const pluginManifest = await readJsonRecord(
    path.join(source.pluginDir, "plugin.json"),
    "plugin.json",
  );
  const baseArtifacts: YigfinanceImportArtifactPlan[] = [];
  for (const spec of [
    ["plugin.json", "other"],
    ["routes.json", "routes"],
    ["tool-map.json", "tool-map"],
    ["feedback.json", "feedback"],
    ["update.json", "update"],
  ] as const) {
    baseArtifacts.push({
      artifactType: spec[1],
      artifactPath: spec[0],
      mediaType: "application/json",
      content: await readJsonRecord(path.join(source.pluginDir, spec[0]), spec[0]),
    });
  }

  const schemaFiles = await listFiles(path.join(source.pluginDir, "schemas"), (
    file,
  ) => file.endsWith(".json"));
  for (const file of schemaFiles) {
    baseArtifacts.push({
      artifactType: "schema",
      artifactPath: `schemas/${toPosix(path.relative(path.join(source.pluginDir, "schemas"), file))}`,
      mediaType: "application/schema+json",
      content: await readJsonRecord(file, path.basename(file)),
    });
  }

  const commandFiles = await listFiles(source.commandsDir, (file) =>
    file.endsWith(".md"),
  );
  for (const file of commandFiles) {
    baseArtifacts.push({
      artifactType: "command",
      artifactPath: `commands/${toPosix(path.relative(source.commandsDir, file))}`,
      mediaType: "text/markdown",
      content: await fs.readFile(file, "utf8"),
    });
  }

  const skillFiles = await listFiles(
    source.skillsDir,
    (file) => path.basename(file) === "SKILL.md",
  );
  for (const file of skillFiles) {
    baseArtifacts.push({
      artifactType: "skill-md",
      artifactPath: `skills/${toPosix(path.relative(source.skillsDir, file))}`,
      mediaType: "text/markdown",
      content: await fs.readFile(file, "utf8"),
    });
  }

  const hooksDir = path.join(source.pluginDir, "hooks");
  const hookFiles = await listFiles(hooksDir, () => true);
  for (const file of hookFiles) {
    baseArtifacts.push({
      artifactType: "other",
      artifactPath: `hooks/${toPosix(path.relative(hooksDir, file))}`,
      mediaType: mediaTypeFor(file),
      content: await fs.readFile(file, "utf8"),
    });
  }

  const name =
    readString(skillpackManifest, "name") ??
    readString(pluginManifest, "name") ??
    "yigfinance";
  const version =
    readString(skillpackManifest, "version") ??
    readString(pluginManifest, "version") ??
    "0.1.0";
  const contractVersion =
    readString(skillpackManifest, "contract_version") ?? "1.0";
  const description =
    options.description ??
    readString(pluginManifest, "description") ??
    "Finance analysis skill stack for CFO-grade financial analysis";
  const displayName =
    options.displayName ??
    toDisplayName(readString(pluginManifest, "name") ?? name);
  const slug = options.slug ?? name;
  const compatibility = asRecord(skillpackManifest.compatibility ?? {});
  const skillNames = readSkillNames(skillpackManifest);
  const includeDefaultExtensions = options.includeDefaultExtensions !== false;
  const etoSkillNames = includeDefaultExtensions
    ? [...skillNames].filter((skillName) => ETO_EXTENSION_SKILLS.has(skillName))
    : [];
  const coreSkillNames =
    etoSkillNames.length > 0
      ? new Set([...skillNames].filter((skillName) => !etoSkillNames.includes(skillName)))
      : skillNames;
  const evalArtifacts = await collectEvalArtifacts(source.testsDir, skillNames);
  const qualityReport = await buildQualityReportArtifact({
    sourceDir: source.sourceDir,
    testsDir: source.testsDir,
    evalArtifacts,
    skillNames,
  });
  baseArtifacts.push(...evalArtifacts);
  baseArtifacts.push(qualityReport);
  const coreArtifacts =
    etoSkillNames.length > 0
      ? filterArtifacts(baseArtifacts, coreSkillNames, {
          includeToolMap: true,
          includeHooks: true,
          includeSharedEvalAssets: true,
        })
      : baseArtifacts;
  const extensionPacks =
    etoSkillNames.length > 0
      ? [
          buildEtoExtensionPack({
            sourceName: name,
            version,
            description,
            compatibility,
            contractVersion,
            sourceManifest: skillpackManifest,
            sourceArtifacts: baseArtifacts,
            skillNames: new Set(etoSkillNames),
            yapSlug: slug,
          }),
        ]
      : [];
  const defaultMounts: YigfinanceDefaultMountExecutionPlan[] =
    extensionPacks.length > 0
      ? [
          {
            skillPackName: extensionPacks[0].name,
            skillPackVersion: extensionPacks[0].version,
            mountKey: options.defaultExtensionMountKey ?? DEFAULT_ETO_MOUNT_KEY,
            mountPoint: DEFAULT_ETO_MOUNT_POINT,
            displayName: "ETO Project Pack",
            priority: DEFAULT_ETO_MOUNT_PRIORITY,
            enabled: true,
            required: false,
            config: {
              source: "yigfinance-import",
              defaultPack: "eto-professional-projects",
            },
            constraints: {},
          },
        ]
      : [];
  const readme = await readOptionalText(path.join(source.sourceDir, "README.md"));
  const warnings = [];
  if (skillFiles.length < skillNames.size) {
    warnings.push(
      `${skillNames.size - skillFiles.length} skills do not have indexed SKILL.md files`,
    );
  }
  if (extensionPacks.length === 0 && includeDefaultExtensions) {
    warnings.push("No default ETO extension skills detected");
  }

  const corePack: YigfinanceImportPackPlan = {
    name,
    version,
    displayName,
    description,
    packType: "core",
    contractVersion,
    compatibility,
    manifest:
      etoSkillNames.length > 0
        ? filterSkillpackManifest(skillpackManifest, coreSkillNames)
        : skillpackManifest,
    source: "imported",
    status: "active",
    artifacts: coreArtifacts,
  };
  const preview: YapImportPreview = {
    format: "yigfinance",
    source,
    yap: {
      slug,
      version,
      displayName,
      description,
      category: "finance",
      tags: ["finance", "cfo", "analysis", "yigfinance"],
      visibility: "public",
      status: "active",
    },
    corePack: {
      name: corePack.name,
      version: corePack.version,
      displayName: corePack.displayName,
      packType: "core",
      contractVersion,
      skillCount: coreSkillNames.size,
      artifactCount: corePack.artifacts.length + 1,
    },
    extensionPacks: extensionPacks.map((pack) => ({
      name: pack.name,
      version: pack.version,
      displayName: pack.displayName,
      packType: "extension",
      contractVersion: pack.contractVersion,
      skillCount: readSkillNames(pack.manifest).size,
      artifactCount: pack.artifacts.length + 1,
    })),
    defaultMounts: defaultMounts.map((mount) => ({
      skillPackName: mount.skillPackName,
      skillPackVersion: mount.skillPackVersion,
      mountKey: mount.mountKey,
      mountPoint: mount.mountPoint,
      displayName: mount.displayName,
      priority: mount.priority,
      enabled: mount.enabled,
      required: mount.required,
    })),
    summary: {
      skillCount: skillNames.size,
      coreSkillCount: coreSkillNames.size,
      schemaCount: schemaFiles.length,
      commandCount: commandFiles.length,
      skillMarkdownCount: skillFiles.length,
      evalArtifactCount: evalArtifacts.length,
      qualityReportStatus: qualityReportStatus(qualityReport.content),
      artifactCount:
        corePack.artifacts.length +
        1 +
        extensionPacks.reduce((sum, pack) => sum + pack.artifacts.length + 1, 0),
      extensionPackCount: extensionPacks.length,
      extensionSkillCount: etoSkillNames.length,
      defaultMountCount: defaultMounts.length,
    },
    warnings,
    generatedAt: Date.now(),
  };

  return {
    preview,
    yap: {
      ...preview.yap,
      readme,
      assemblyConfig: {
        assemblyKind: "core-plus-mounts",
        corePack: { name, version },
        mountedPacks: defaultMounts.map((mount) => ({
          mountKey: mount.mountKey,
          mountPoint: mount.mountPoint,
          priority: mount.priority,
          default: true,
          pack: {
            name: mount.skillPackName,
            version: mount.skillPackVersion,
          },
        })),
        bridge: {
          source: "yigfinance",
          pluginDir: toPosix(DEFAULT_PLUGIN_DIR),
          commandsDir: toPosix(DEFAULT_COMMANDS_DIR),
          skillsDir: toPosix(DEFAULT_SKILLS_DIR),
        },
      },
    },
    skillPack: corePack,
    extensionPacks,
    defaultMounts,
  };
}

async function resolveAllowedSourceDir(sourceDir: string): Promise<string> {
  const roots = allowedImportRoots();
  if (roots.length === 0) {
    throw new ImportPreviewError(
      403,
      "import_roots_not_configured",
      "YAP import preview is not configured on this server",
    );
  }

  const trimmed = sourceDir.trim();
  if (!trimmed || trimmed.includes("\0")) {
    throw new ImportPreviewError(
      400,
      "invalid_source_dir",
      "sourceDir must be a non-empty path",
    );
  }

  const candidates = candidateSourceDirs(trimmed, roots);
  for (const candidate of candidates) {
    const matchingRoot = roots.find((root) => isInside(candidate, root));
    if (!matchingRoot) continue;
    if (await directoryExists(candidate)) return candidate;
  }

  throw new ImportPreviewError(
    403,
    "source_dir_not_allowed",
    "sourceDir must resolve inside an allowed import root",
  );
}

function allowedImportRoots(): string[] {
  return (process.env.YAP_IMPORT_ALLOWED_ROOTS ?? "")
    .split(path.delimiter)
    .map((root) => root.trim())
    .filter(Boolean)
    .map((root) => path.resolve(root));
}

function candidateSourceDirs(sourceDir: string, roots: string[]): string[] {
  const candidates = new Set<string>();
  const windowsPathLeaf = /^[a-z]:[\\/]/i.test(sourceDir)
    ? sourceDir.replaceAll("\\", "/").split("/").filter(Boolean).at(-1)
    : undefined;

  if (path.isAbsolute(sourceDir)) {
    candidates.add(path.resolve(sourceDir));
  } else {
    for (const root of roots) candidates.add(path.resolve(root, sourceDir));
  }

  if (windowsPathLeaf) {
    for (const root of roots) candidates.add(path.resolve(root, windowsPathLeaf));
  }

  return [...candidates];
}

function isInside(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function ensureDirectory(dir: string, label: string): Promise<void> {
  if (!(await directoryExists(dir))) {
    throw new ImportPreviewError(
      422,
      "missing_import_artifact",
      `${label} not found`,
      { path: dir },
    );
  }
}

async function directoryExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function readJsonRecord(
  filePath: string,
  label: string,
): Promise<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(stripJsonBom(await fs.readFile(filePath, "utf8")));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error(`${label} must be an object`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ImportPreviewError(
        422,
        "missing_import_artifact",
        `Required Yigfinance artifact missing: ${label}`,
        { path: filePath },
      );
    }
    throw new ImportPreviewError(
      422,
      "invalid_import_artifact",
      error instanceof Error ? error.message : `Invalid JSON in ${label}`,
      { path: filePath },
    );
  }
}

async function readOptionalJsonRecord(
  filePath: string,
): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(stripJsonBom(await fs.readFile(filePath, "utf8")));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function readJsonArray<T>(filePath: string): Promise<T[] | null> {
  try {
    const parsed = JSON.parse(stripJsonBom(await fs.readFile(filePath, "utf8")));
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function readJsonObject(
  filePath: string,
): Promise<Record<string, unknown> | null> {
  return readOptionalJsonRecord(filePath);
}

function stripJsonBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

async function listFiles(
  root: string,
  include: (filePath: string) => boolean,
): Promise<string[]> {
  if (!(await directoryExists(root))) return [];

  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const child = path.join(root, entry.name);
      if (entry.isDirectory()) return listFiles(child, include);
      return include(child) ? [child] : [];
    }),
  );
  return files.flat().sort();
}

async function collectEvalArtifacts(
  testsDir: string,
  skillNames: Set<string>,
): Promise<YigfinanceImportArtifactPlan[]> {
  const files = await listFiles(testsDir, isImportableEvalAsset);
  const artifacts: YigfinanceImportArtifactPlan[] = [];

  for (const file of files) {
    const stat = await fs.stat(file);
    if (stat.size > MAX_EVAL_ARTIFACT_BYTES) continue;

    const relativePath = toPosix(path.relative(testsDir, file));
    artifacts.push({
      artifactType: isFixturePath(relativePath) ? "fixture" : "eval",
      artifactPath: `tests/${relativePath}`,
      mediaType: mediaTypeFor(file),
      content: await fs.readFile(file, "utf8"),
      skillName: inferSkillNameFromEvalPath(relativePath, skillNames),
    });
  }

  return artifacts;
}

async function buildQualityReportArtifact(params: {
  sourceDir: string;
  testsDir: string;
  evalArtifacts: YigfinanceImportArtifactPlan[];
  skillNames: Set<string>;
}): Promise<YigfinanceImportArtifactPlan> {
  const explicitReport = await readExplicitQualityReport(params.sourceDir);
  if (explicitReport) {
    return {
      artifactType: "quality-report",
      artifactPath: "quality/quality-report.json",
      mediaType: "application/json",
      content: explicitReport,
    };
  }

  const nodeIds = await readJsonArray<string>(
    path.join(params.sourceDir, ".pytest_cache", "v", "cache", "nodeids"),
  );
  const lastFailed = await readJsonObject(
    path.join(params.sourceDir, ".pytest_cache", "v", "cache", "lastfailed"),
  );
  const failedCount = Object.keys(lastFailed ?? {}).length;
  const evalCount = params.evalArtifacts.filter(
    (artifact) => artifact.artifactType === "eval",
  ).length;
  const fixtureCount = params.evalArtifacts.filter(
    (artifact) => artifact.artifactType === "fixture",
  ).length;

  return {
    artifactType: "quality-report",
    artifactPath: "quality/quality-report.json",
    mediaType: "application/json",
    content: {
      schemaVersion: "yigyaps.quality-report.v1",
      source: "yigfinance-import",
      status: failedCount > 0 ? "failed" : "needs-run",
      generatedAt: Date.now(),
      runner: {
        kind: "pytest",
        command: "python -m pytest tests",
        suggestedReportPath: ".yigyaps/quality/pytest-junit.xml",
      },
      evidence: {
        skillCount: params.skillNames.size,
        evalArtifactCount: evalCount,
        fixtureArtifactCount: fixtureCount,
        collectedTestCount: nodeIds?.length ?? null,
        cachedFailedTestCount: failedCount,
      },
      notes:
        failedCount > 0
          ? ["Pytest cache reports previously failed tests; run the quality gate before release."]
          : ["Evaluation assets are indexed; no executed pass report was found."],
    },
  };
}

async function readExplicitQualityReport(
  sourceDir: string,
): Promise<Record<string, unknown> | null> {
  for (const relativePath of DEFAULT_QUALITY_REPORT_PATHS) {
    const reportPath = path.join(sourceDir, relativePath);
    const report = await readOptionalJsonRecord(reportPath);
    if (!report) continue;
    return {
      schemaVersion: "yigyaps.quality-report.v1",
      source: "explicit-report",
      sourcePath: toPosix(relativePath),
      ...report,
      status: normalizedQualityStatus(report.status),
    };
  }
  return null;
}

function normalizedQualityStatus(value: unknown): string {
  if (
    value === "passed" ||
    value === "failed" ||
    value === "needs-run" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function qualityReportStatus(content: unknown): string | null {
  const report = asOptionalRecord(content);
  const status = report?.status;
  return typeof status === "string" && status.trim() ? status.trim() : null;
}

function isImportableEvalAsset(filePath: string): boolean {
  const normalized = filePath.replaceAll("\\", "/");
  if (normalized.includes("/__pycache__/")) return false;
  const extension = path.extname(filePath).toLowerCase();
  return [".py", ".json", ".yaml", ".yml", ".md", ".txt"].includes(extension);
}

function isFixturePath(relativePath: string): boolean {
  return relativePath
    .split(/[\\/]/)
    .some((part) => part.toLowerCase() === "fixtures");
}

function inferSkillNameFromEvalPath(
  relativePath: string,
  skillNames: Set<string>,
): string | undefined {
  const normalized = toPosix(relativePath).toLowerCase();
  const fileName = normalized.split("/").at(-1) ?? normalized;
  const stem = fileName.replace(/\.schema\.json$/, "").replace(/\.[^.]+$/, "");
  const candidates = new Set([
    slugCandidate(stem),
    slugCandidate(stem.replace(/^test[-_]/, "")),
  ]);

  for (const candidate of candidates) {
    if (skillNames.has(candidate)) return candidate;
  }

  for (const skillName of skillNames) {
    const lowered = skillName.toLowerCase();
    if (
      normalized.includes(lowered) ||
      normalized.includes(lowered.replaceAll("-", "_"))
    ) {
      return skillName;
    }
  }

  return undefined;
}

function slugCandidate(value: string): string {
  return value.toLowerCase().replaceAll("_", "-");
}

function countEvalArtifacts(
  artifacts: YigfinanceImportArtifactPlan[],
  skillNames: Set<string>,
  includeShared: boolean,
): number {
  return artifacts.filter((artifact) => {
    if (artifact.skillName) return skillNames.has(artifact.skillName);
    return includeShared;
  }).length;
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readSkillNames(manifest: Record<string, unknown>): Set<string> {
  const rawSkills = manifest.skills;
  if (!Array.isArray(rawSkills)) return new Set();
  return new Set(
    rawSkills.flatMap((skill) => {
      if (!skill || typeof skill !== "object" || Array.isArray(skill)) return [];
      const name = (skill as Record<string, unknown>).name;
      return typeof name === "string" && name.trim() ? [name.trim()] : [];
    }),
  );
}

function filterSkillpackManifest(
  manifest: Record<string, unknown>,
  skillNames: Set<string>,
): Record<string, unknown> {
  const skills = Array.isArray(manifest.skills)
    ? manifest.skills.filter((skill) => {
        if (!skill || typeof skill !== "object" || Array.isArray(skill)) {
          return false;
        }
        const name = (skill as Record<string, unknown>).name;
        return typeof name === "string" && skillNames.has(name);
      })
    : [];

  return {
    ...manifest,
    skills,
  };
}

function buildEtoExtensionPack(params: {
  sourceName: string;
  version: string;
  description: string;
  compatibility: Record<string, unknown>;
  contractVersion: string;
  sourceManifest: Record<string, unknown>;
  sourceArtifacts: YigfinanceImportArtifactPlan[];
  skillNames: Set<string>;
  yapSlug: string;
}): YigfinanceImportPackPlan {
  const name = `${params.sourceName}-eto-professional-projects`;
  const compatibility = {
    ...params.compatibility,
    [params.yapSlug]: compatibleYapVersionRange(params.version),
  };
  const manifest = {
    ...filterSkillpackManifest(params.sourceManifest, params.skillNames),
    name,
    version: params.version,
    compatibility,
  };

  return {
    name,
    version: params.version,
    displayName: "Yigfinance ETO Professional Projects",
    description: `Engineering-to-order project margin and contract asset/liability extension for ${params.description}`,
    packType: "extension",
    contractVersion: params.contractVersion,
    compatibility,
    manifest,
    source: "imported",
    status: "active",
    artifacts: filterArtifacts(params.sourceArtifacts, params.skillNames, {
      includeToolMap: false,
      includeHooks: false,
      includeSharedEvalAssets: false,
      pluginName: name,
      pluginDescription:
        "ETO professional project analysis extension for Yigfinance",
    }),
  };
}

function filterArtifacts(
  artifacts: YigfinanceImportArtifactPlan[],
  skillNames: Set<string>,
  options: {
    includeToolMap: boolean;
    includeHooks: boolean;
    includeSharedEvalAssets: boolean;
    pluginName?: string;
    pluginDescription?: string;
  },
): YigfinanceImportArtifactPlan[] {
  return artifacts.flatMap((artifact) => {
    if (artifact.artifactType === "routes" || artifact.artifactType === "feedback") {
      return [
        {
          ...artifact,
          content: filterSkillsObjectArtifact(artifact.content, skillNames),
        },
      ];
    }
    if (artifact.artifactType === "tool-map" && !options.includeToolMap) {
      return [];
    }
    if (artifact.artifactPath.startsWith("hooks/") && !options.includeHooks) {
      return [];
    }
    if (artifact.artifactType === "eval" || artifact.artifactType === "fixture") {
      if (artifact.skillName) {
        return skillNames.has(artifact.skillName) ? [artifact] : [];
      }
      return options.includeSharedEvalAssets ? [artifact] : [];
    }
    if (artifact.artifactType === "quality-report") {
      return options.includeSharedEvalAssets ? [artifact] : [];
    }
    if (
      artifact.artifactPath === "plugin.json" &&
      (options.pluginName || options.pluginDescription)
    ) {
      return [
        {
          ...artifact,
          content: {
            ...asRecord(artifact.content),
            ...(options.pluginName ? { name: options.pluginName } : {}),
            ...(options.pluginDescription
              ? { description: options.pluginDescription }
              : {}),
          },
        },
      ];
    }
    if (isSkillScopedArtifact(artifact)) {
      return skillNames.has(skillNameFromArtifactPath(artifact.artifactPath))
        ? [artifact]
        : [];
    }
    return [artifact];
  });
}

function filterSkillsObjectArtifact(
  content: unknown,
  skillNames: Set<string>,
): Record<string, unknown> {
  const record = asRecord(content);
  const skills = asOptionalRecord(record.skills);
  if (!skills) return record;

  return {
    ...record,
    skills: Object.fromEntries(
      Object.entries(skills).filter(([skillName]) => skillNames.has(skillName)),
    ),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new ImportPreviewError(
    422,
    "invalid_import_artifact",
    "Expected import artifact content to be an object",
  );
}

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function isSkillScopedArtifact(artifact: YigfinanceImportArtifactPlan): boolean {
  return (
    artifact.artifactType === "schema" ||
    artifact.artifactType === "command" ||
    artifact.artifactType === "skill-md"
  );
}

function skillNameFromArtifactPath(artifactPath: string): string {
  const normalized = artifactPath.replaceAll("\\", "/");
  if (normalized.startsWith("skills/")) {
    return normalized.split("/")[1] ?? "";
  }
  const fileName = normalized.split("/").at(-1) ?? normalized;
  return fileName.replace(/\.schema\.json$/, "").replace(/\.[^.]+$/, "");
}

function compatibleYapVersionRange(version: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);
  if (!match) return `>=${version}`;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  return `>=${version} <${major}.${minor + 1}.0`;
}

function countSkillScopedFiles(
  files: string[],
  extensionSkillNames: string[],
  extensionOnly: boolean,
): number {
  const extensionSkillSet = new Set(extensionSkillNames);
  return files.filter((file) => {
    const skillName = skillNameFromPath(file);
    const isExtensionSkill = extensionSkillSet.has(skillName);
    return extensionOnly ? isExtensionSkill : !isExtensionSkill;
  }).length;
}

function skillNameFromPath(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  if (normalized.endsWith("/SKILL.md")) {
    return normalized.split("/").at(-2) ?? "";
  }
  return (normalized.split("/").at(-1) ?? normalized)
    .replace(/\.schema\.json$/, "")
    .replace(/\.[^.]+$/, "");
}

function toDisplayName(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toPosix(value: string): string {
  return value.replaceAll(path.sep, "/");
}

function mediaTypeFor(file: string): string {
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".py")) return "text/x-python";
  if (file.endsWith(".yaml") || file.endsWith(".yml")) return "application/yaml";
  if (file.endsWith(".md")) return "text/markdown";
  return "text/plain";
}

async function readOptionalText(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
