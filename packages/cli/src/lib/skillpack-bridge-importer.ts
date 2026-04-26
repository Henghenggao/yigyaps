import fs from "fs-extra";
import path from "path";
import type {
  CreateSkillPackArtifactParams,
  CreateSkillPackParams,
} from "@yigyaps/client";
import { CliError } from "./errors.js";

const BRIDGE_PLUGIN_DIR = path.join(
  "generated",
  "yigthinker",
  ".yigthinker-plugin",
);

const OPTIONAL_JSON_ARTIFACTS: Array<{
  file: string;
  artifactType: CreateSkillPackArtifactParams["artifactType"];
}> = [
  { file: "plugin.json", artifactType: "other" },
  { file: "routes.json", artifactType: "routes" },
  { file: "tool-map.json", artifactType: "tool-map" },
  { file: "feedback.json", artifactType: "feedback" },
  { file: "update.json", artifactType: "update" },
];

export interface SkillPackBridgePlanOptions {
  packType?: CreateSkillPackParams["packType"];
  status?: CreateSkillPackParams["status"];
  source?: CreateSkillPackParams["source"];
  displayName?: string;
  description?: string;
  commandsDir?: string;
  skillsDir?: string;
}

export interface SkillPackBridgeSummary {
  sourceDir: string;
  pluginDir: string;
  schemaCount: number;
  commandCount: number;
  skillMarkdownCount: number;
  artifactCount: number;
}

export interface SkillPackBridgePlan {
  skillPack: CreateSkillPackParams;
  summary: SkillPackBridgeSummary;
}

export async function planSkillPackBridgePublish(
  sourceDir: string,
  options: SkillPackBridgePlanOptions = {},
): Promise<SkillPackBridgePlan> {
  const absoluteSourceDir = path.resolve(sourceDir);
  await ensureDirectory(absoluteSourceDir, "SkillPack source directory");

  const pluginDir = await resolvePluginDir(absoluteSourceDir);
  const manifest = await readJsonRecord(
    path.join(pluginDir, "skillpack.json"),
    "skillpack.json",
  );
  const pluginManifest = await readOptionalJsonRecord(
    path.join(pluginDir, "plugin.json"),
    "plugin.json",
  );
  const name = readString(manifest, "name", "skillpack.json");
  const version = readString(manifest, "version", "skillpack.json");
  const description =
    options.description ??
    optionalString(pluginManifest, "description") ??
    `${name} SkillPack Bridge artifacts`;

  const artifacts: CreateSkillPackArtifactParams[] = [];
  for (const spec of OPTIONAL_JSON_ARTIFACTS) {
    const filePath = path.join(pluginDir, spec.file);
    if (await fs.pathExists(filePath)) {
      artifacts.push({
        artifactType: spec.artifactType,
        artifactPath: spec.file,
        mediaType: "application/json",
        content: await readJsonRecord(filePath, spec.file),
      });
    }
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

  const commandsDir = options.commandsDir
    ? path.resolve(absoluteSourceDir, options.commandsDir)
    : path.resolve(absoluteSourceDir, "commands");
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

  const skillsDir = options.skillsDir
    ? path.resolve(absoluteSourceDir, options.skillsDir)
    : path.resolve(absoluteSourceDir, "skills");
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

  return {
    skillPack: {
      name,
      version,
      displayName: options.displayName ?? toDisplayName(name),
      description,
      packType: options.packType ?? "extension",
      contractVersion: optionalString(manifest, "contract_version") ?? "1.0",
      compatibility: asRecord(manifest.compatibility ?? {}, "compatibility"),
      manifest,
      source: options.source ?? "imported",
      status: options.status ?? "active",
      artifacts,
    },
    summary: {
      sourceDir: absoluteSourceDir,
      pluginDir,
      schemaCount: schemaFiles.length,
      commandCount: commandFiles.length,
      skillMarkdownCount: skillFiles.length,
      artifactCount: artifacts.length + 1,
    },
  };
}

async function resolvePluginDir(sourceDir: string): Promise<string> {
  if (await fs.pathExists(path.join(sourceDir, "skillpack.json"))) {
    return sourceDir;
  }

  const nested = path.join(sourceDir, BRIDGE_PLUGIN_DIR);
  if (await fs.pathExists(path.join(nested, "skillpack.json"))) {
    return nested;
  }

  throw CliError.user(
    `No skillpack.json found in ${sourceDir} or ${path.join(sourceDir, BRIDGE_PLUGIN_DIR)}`,
  );
}

async function ensureDirectory(dir: string, label: string): Promise<void> {
  if (!(await fs.pathExists(dir))) {
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
  if (!(await fs.pathExists(filePath))) {
    throw CliError.user(`Required SkillPack artifact missing: ${filePath}`);
  }
  try {
    return asRecord(JSON.parse(await fs.readFile(filePath, "utf8")), label);
  } catch (error) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.user(`Invalid JSON in ${label}: ${message}`);
  }
}

async function readOptionalJsonRecord(
  filePath: string,
  label: string,
): Promise<Record<string, unknown> | null> {
  if (!(await fs.pathExists(filePath))) return null;
  return readJsonRecord(filePath, label);
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
): string {
  const value = record[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  throw CliError.user(`${label}.${key} must be a non-empty string`);
}

function optionalString(
  record: Record<string, unknown> | null,
  key: string,
): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
