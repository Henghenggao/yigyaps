import fs from "fs-extra";
import path from "path";
import type {
  CreateSkillPackArtifactParams,
  CreateSkillPackParams,
  CreateYapParams,
} from "@yigyaps/client";
import { CliError } from "./errors.js";

const DEFAULT_PLUGIN_DIR = path.join(
  "generated",
  "yigthinker",
  ".yigthinker-plugin",
);
const DEFAULT_COMMANDS_DIR = path.join("generated", "yigthinker", "commands");
const DEFAULT_SKILLS_DIR = path.join("generated", "claude", "skills");
const DEFAULT_ETO_MOUNT_KEY = "eto";
const DEFAULT_ETO_MOUNT_POINT = "extensions";
const DEFAULT_ETO_MOUNT_PRIORITY = 20;
const ETO_EXTENSION_SKILLS = [
  "project-margin-review",
  "ncc-rootcause-analysis",
  "contract-asset-liability-review",
  "functional-cost-review",
  "sales-coverage-review",
  "order-intake-review",
  "pvm-analysis",
  "cash-conversion-review",
];

interface JsonArtifactSpec {
  file: string;
  artifactType: CreateSkillPackArtifactParams["artifactType"];
  artifactPath: string;
}

const REQUIRED_BRIDGE_JSON: JsonArtifactSpec[] = [
  { file: "plugin.json", artifactType: "other", artifactPath: "plugin.json" },
  { file: "routes.json", artifactType: "routes", artifactPath: "routes.json" },
  {
    file: "tool-map.json",
    artifactType: "tool-map",
    artifactPath: "tool-map.json",
  },
  {
    file: "feedback.json",
    artifactType: "feedback",
    artifactPath: "feedback.json",
  },
  { file: "update.json", artifactType: "update", artifactPath: "update.json" },
];

export interface YigfinanceImportPlanOptions {
  slug?: string;
  displayName?: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility?: CreateYapParams["visibility"];
  status?: CreateYapParams["status"];
  pluginDir?: string;
  commandsDir?: string;
  skillsDir?: string;
  includeDefaultExtensions?: boolean;
  defaultExtensionMountKey?: string;
}

export interface YigfinanceImportSummary {
  sourceDir: string;
  pluginDir: string;
  commandsDir: string;
  skillsDir: string;
  skillCount: number;
  coreSkillCount: number;
  schemaCount: number;
  commandCount: number;
  skillMarkdownCount: number;
  artifactCount: number;
  extensionPackCount: number;
  extensionSkillCount: number;
  defaultMountCount: number;
}

export interface YigfinanceDefaultMountPlan {
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

export interface YigfinanceImportPlan {
  yap: CreateYapParams;
  skillPack: CreateSkillPackParams;
  extensionPacks: CreateSkillPackParams[];
  defaultMounts: YigfinanceDefaultMountPlan[];
  summary: YigfinanceImportSummary;
}

export async function planYigfinanceImport(
  sourceDir: string,
  options: YigfinanceImportPlanOptions = {},
): Promise<YigfinanceImportPlan> {
  const absoluteSourceDir = path.resolve(sourceDir);
  await ensureDirectory(absoluteSourceDir, "Yigfinance source directory");

  const pluginDir = path.resolve(
    absoluteSourceDir,
    options.pluginDir ?? DEFAULT_PLUGIN_DIR,
  );
  const commandsDir = path.resolve(
    absoluteSourceDir,
    options.commandsDir ?? DEFAULT_COMMANDS_DIR,
  );
  const skillsDir = path.resolve(
    absoluteSourceDir,
    options.skillsDir ?? DEFAULT_SKILLS_DIR,
  );

  await ensureDirectory(pluginDir, "Yigfinance plugin directory");
  await ensureDirectory(commandsDir, "Yigfinance commands directory");
  await ensureDirectory(skillsDir, "Yigfinance skills directory");

  const skillpackPath = path.join(pluginDir, "skillpack.json");
  const skillpackManifest = await readJsonRecord(
    skillpackPath,
    "skillpack.json",
  );
  const pluginManifest = await readJsonRecord(
    path.join(pluginDir, "plugin.json"),
    "plugin.json",
  );

  const name =
    readString(skillpackManifest, "name", "skillpack.json") ?? "yigfinance";
  const version =
    readString(skillpackManifest, "version", "skillpack.json") ??
    readString(pluginManifest, "version", "plugin.json") ??
    "0.1.0";
  const description =
    options.description ??
    readString(pluginManifest, "description", "plugin.json") ??
    "Finance analysis skill stack for CFO-grade financial analysis";
  const displayName =
    options.displayName ??
    readDisplayName(pluginManifest, "name") ??
    toDisplayName(name);
  const slug = options.slug ?? name;
  const readme = await readOptionalText(
    path.join(absoluteSourceDir, "README.md"),
  );
  const compatibility = asRecord(
    skillpackManifest.compatibility ?? {},
    "skillpack.json compatibility",
  );

  const baseArtifacts: CreateSkillPackArtifactParams[] = [];
  for (const spec of REQUIRED_BRIDGE_JSON) {
    baseArtifacts.push({
      artifactType: spec.artifactType,
      artifactPath: spec.artifactPath,
      mediaType: "application/json",
      content: await readJsonRecord(path.join(pluginDir, spec.file), spec.file),
    });
  }

  const schemaFiles = await listFiles(path.join(pluginDir, "schemas"), (file) =>
    file.endsWith(".json"),
  );
  for (const file of schemaFiles) {
    baseArtifacts.push({
      artifactType: "schema",
      artifactPath: `schemas/${toPosix(path.relative(path.join(pluginDir, "schemas"), file))}`,
      mediaType: "application/schema+json",
      content: await readJsonRecord(file, path.basename(file)),
    });
  }

  const commandFiles = await listFiles(commandsDir, (file) =>
    file.endsWith(".md"),
  );
  for (const file of commandFiles) {
    baseArtifacts.push({
      artifactType: "command",
      artifactPath: `commands/${toPosix(path.relative(commandsDir, file))}`,
      mediaType: "text/markdown",
      content: await fs.readFile(file, "utf8"),
    });
  }

  const skillFiles = await listFiles(
    skillsDir,
    (file) => path.basename(file) === "SKILL.md",
  );
  for (const file of skillFiles) {
    baseArtifacts.push({
      artifactType: "skill-md",
      artifactPath: `skills/${toPosix(path.relative(skillsDir, file))}`,
      mediaType: "text/markdown",
      content: await fs.readFile(file, "utf8"),
    });
  }

  const hookFiles = await listFiles(path.join(pluginDir, "hooks"), () => true);
  for (const file of hookFiles) {
    baseArtifacts.push({
      artifactType: "other",
      artifactPath: `hooks/${toPosix(path.relative(path.join(pluginDir, "hooks"), file))}`,
      mediaType: mediaTypeFor(file),
      content: await fs.readFile(file, "utf8"),
    });
  }

  const skillCount = Array.isArray(skillpackManifest.skills)
    ? skillpackManifest.skills.length
    : 0;
  const allSkillNames = readSkillNames(skillpackManifest);
  const includeDefaultExtensions = options.includeDefaultExtensions !== false;
  const etoSkillNames = includeDefaultExtensions
    ? ETO_EXTENSION_SKILLS.filter((skillName) => allSkillNames.has(skillName))
    : [];
  const extensionPacks =
    etoSkillNames.length > 0
      ? [
          buildEtoExtensionPack({
            sourceName: name,
            version,
            description,
            compatibility,
            contractVersion:
              readString(
                skillpackManifest,
                "contract_version",
                "skillpack.json",
              ) ?? "1.0",
            sourceManifest: skillpackManifest,
            sourceArtifacts: baseArtifacts,
            skillNames: new Set(etoSkillNames),
            yapSlug: slug,
          }),
        ]
      : [];
  const defaultMounts =
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
  const coreSkillNames =
    etoSkillNames.length > 0
      ? differenceSet(allSkillNames, new Set(etoSkillNames))
      : allSkillNames;
  const coreManifest =
    etoSkillNames.length > 0
      ? filterSkillpackManifest(skillpackManifest, coreSkillNames)
      : skillpackManifest;
  const coreArtifacts =
    etoSkillNames.length > 0
      ? filterArtifacts(baseArtifacts, coreSkillNames, {
          includeToolMap: true,
          includeHooks: true,
        })
      : baseArtifacts;

  return {
    yap: {
      slug,
      version,
      displayName,
      description,
      readme,
      category: options.category ?? "finance",
      tags: options.tags ?? ["finance", "cfo", "analysis", "yigfinance"],
      visibility: options.visibility ?? "public",
      status: options.status ?? "active",
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
          pluginDir: toPosix(options.pluginDir ?? DEFAULT_PLUGIN_DIR),
          commandsDir: toPosix(options.commandsDir ?? DEFAULT_COMMANDS_DIR),
          skillsDir: toPosix(options.skillsDir ?? DEFAULT_SKILLS_DIR),
        },
      },
    },
    skillPack: {
      name,
      version,
      displayName,
      description,
      packType: "core",
      contractVersion:
        readString(skillpackManifest, "contract_version", "skillpack.json") ??
        "1.0",
      compatibility,
      manifest: coreManifest,
      source: "imported",
      status: "active",
      artifacts: coreArtifacts,
    },
    extensionPacks,
    defaultMounts,
    summary: {
      sourceDir: absoluteSourceDir,
      pluginDir,
      commandsDir,
      skillsDir,
      skillCount,
      coreSkillCount: coreSkillNames.size,
      schemaCount: schemaFiles.length,
      commandCount: commandFiles.length,
      skillMarkdownCount: skillFiles.length,
      artifactCount: coreArtifacts.length + 1,
      extensionPackCount: extensionPacks.length,
      extensionSkillCount: etoSkillNames.length,
      defaultMountCount: defaultMounts.length,
    },
  };
}

function buildEtoExtensionPack(params: {
  sourceName: string;
  version: string;
  description: string;
  compatibility: Record<string, unknown>;
  contractVersion: string;
  sourceManifest: Record<string, unknown>;
  sourceArtifacts: CreateSkillPackArtifactParams[];
  skillNames: Set<string>;
  yapSlug: string;
}): CreateSkillPackParams {
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
      pluginName: name,
      pluginDescription:
        "ETO professional project analysis extension for Yigfinance",
    }),
  };
}

function readSkillNames(manifest: Record<string, unknown>): Set<string> {
  const rawSkills = manifest.skills;
  if (!Array.isArray(rawSkills)) return new Set();

  return new Set(
    rawSkills.flatMap((skill) => {
      if (!skill || typeof skill !== "object" || Array.isArray(skill)) {
        return [];
      }
      const name = (skill as Record<string, unknown>).name;
      return typeof name === "string" ? [name] : [];
    }),
  );
}

function differenceSet(left: Set<string>, right: Set<string>): Set<string> {
  return new Set([...left].filter((value) => !right.has(value)));
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

function filterArtifacts(
  artifacts: CreateSkillPackArtifactParams[],
  skillNames: Set<string>,
  options: {
    includeToolMap: boolean;
    includeHooks: boolean;
    pluginName?: string;
    pluginDescription?: string;
  },
): CreateSkillPackArtifactParams[] {
  return artifacts.flatMap((artifact) => {
    if (artifact.artifactType === "routes") {
      return [
        {
          ...artifact,
          content: filterSkillsObjectArtifact(artifact.content, skillNames),
        },
      ];
    }
    if (artifact.artifactType === "feedback") {
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
    if (
      artifact.artifactPath === "plugin.json" &&
      (options.pluginName || options.pluginDescription)
    ) {
      return [
        {
          ...artifact,
          content: {
            ...asRecord(artifact.content, "plugin.json artifact"),
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
  const record = asRecord(content, "skill-scoped artifact");
  const skills = asOptionalRecord(record.skills);
  if (!skills) return record;

  return {
    ...record,
    skills: Object.fromEntries(
      Object.entries(skills).filter(([skillName]) => skillNames.has(skillName)),
    ),
  };
}

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function isSkillScopedArtifact(
  artifact: CreateSkillPackArtifactParams,
): boolean {
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

async function ensureDirectory(dir: string, label: string): Promise<void> {
  const exists = await fs.pathExists(dir);
  if (!exists) {
    throw CliError.user(`${label} not found: ${dir}`);
  }

  const stat = await fs.stat(dir);
  if (!stat.isDirectory()) {
    throw CliError.user(`${label} is not a directory: ${dir}`);
  }
}

async function readJsonRecord(
  filePath: string,
  label: string,
): Promise<Record<string, unknown>> {
  const exists = await fs.pathExists(filePath);
  if (!exists) {
    throw CliError.user(`Required Yigfinance artifact missing: ${filePath}`);
  }

  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    return asRecord(parsed, label);
  } catch (error) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.user(`Invalid JSON in ${label}: ${message}`);
  }
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw CliError.user(`${label} must be a JSON object`);
}

function readString(
  record: Record<string, unknown>,
  key: string,
  label: string,
): string | undefined {
  const value = record[key];
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (value == null) return undefined;
  throw CliError.user(`${label}.${key} must be a string`);
}

function readDisplayName(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? toDisplayName(value)
    : undefined;
}

async function readOptionalText(filePath: string): Promise<string | undefined> {
  if (!(await fs.pathExists(filePath))) return undefined;
  return fs.readFile(filePath, "utf8");
}

async function listFiles(
  root: string,
  include: (filePath: string) => boolean,
): Promise<string[]> {
  if (!(await fs.pathExists(root))) return [];

  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) return listFiles(fullPath, include);
      if (entry.isFile() && include(fullPath)) return [fullPath];
      return [];
    }),
  );

  return files.flat().sort((a, b) => a.localeCompare(b));
}

function toDisplayName(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function mediaTypeFor(filePath: string): string {
  if (filePath.endsWith(".py")) return "text/x-python";
  if (filePath.endsWith(".md")) return "text/markdown";
  if (filePath.endsWith(".json")) return "application/json";
  return "text/plain";
}
