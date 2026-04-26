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
}

export interface YigfinanceImportSummary {
  sourceDir: string;
  pluginDir: string;
  commandsDir: string;
  skillsDir: string;
  skillCount: number;
  schemaCount: number;
  commandCount: number;
  skillMarkdownCount: number;
  artifactCount: number;
}

export interface YigfinanceImportPlan {
  yap: CreateYapParams;
  skillPack: CreateSkillPackParams;
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

  const name = readString(skillpackManifest, "name", "skillpack.json") ?? "yigfinance";
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
  const readme = await readOptionalText(path.join(absoluteSourceDir, "README.md"));
  const compatibility = asRecord(
    skillpackManifest.compatibility ?? {},
    "skillpack.json compatibility",
  );

  const artifacts: CreateSkillPackArtifactParams[] = [];
  for (const spec of REQUIRED_BRIDGE_JSON) {
    artifacts.push({
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
    artifacts.push({
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
    artifacts.push({
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
    artifacts.push({
      artifactType: "skill-md",
      artifactPath: `skills/${toPosix(path.relative(skillsDir, file))}`,
      mediaType: "text/markdown",
      content: await fs.readFile(file, "utf8"),
    });
  }

  const hookFiles = await listFiles(path.join(pluginDir, "hooks"), () => true);
  for (const file of hookFiles) {
    artifacts.push({
      artifactType: "other",
      artifactPath: `hooks/${toPosix(path.relative(path.join(pluginDir, "hooks"), file))}`,
      mediaType: mediaTypeFor(file),
      content: await fs.readFile(file, "utf8"),
    });
  }

  const skillCount = Array.isArray(skillpackManifest.skills)
    ? skillpackManifest.skills.length
    : 0;

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
        mountedPacks: [],
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
      manifest: skillpackManifest,
      source: "imported",
      status: "active",
      artifacts,
    },
    summary: {
      sourceDir: absoluteSourceDir,
      pluginDir,
      commandsDir,
      skillsDir,
      skillCount,
      schemaCount: schemaFiles.length,
      commandCount: commandFiles.length,
      skillMarkdownCount: skillFiles.length,
      artifactCount: artifacts.length + 1,
    },
  };
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
