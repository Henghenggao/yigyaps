#!/usr/bin/env node

/**
 * YigYaps CLI — The Economic Gateway to the MCP Ecosystem
 *
 * This is the main entry point for the YigYaps CLI.
 * It handles command registration and global error handling.
 *
 * License: Apache 2.0
 */

import { Command } from "commander";
import { CliError, handleGlobalError } from "./lib/errors.js";

// Command Imports
import { loginCommand } from "./commands/login.js";
import { whoamiCommand } from "./commands/whoami.js";
import { logoutCommand } from "./commands/logout.js";
import { validateCommand } from "./commands/validate.js";
import { publishCommand } from "./commands/publish.js";
import { devCommand, devServerCommand } from "./commands/dev.js";
import { statusCommand } from "./commands/status.js";
import { initCommand } from "./commands/init.js";
import { searchCommand } from "./commands/search.js";
import { infoCommand } from "./commands/info.js";
import { installCommand } from "./commands/install.js";
import { listCommand } from "./commands/list.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { mcpConfigCommand } from "./commands/mcp.js";
import { runCommand } from "./commands/run.js";
import { doctorCommand } from "./commands/doctor.js";
import { interactiveCommand } from "./commands/interactive.js";
import { onboardingCommand } from "./commands/onboarding.js";
import { exportCommand } from "./commands/export.js";
import { mcpBridgeCommand } from "./commands/mcp-bridge.js";
import {
  yapAssemblyExportCommand,
  yapImportCommand,
  yapMountAddCommand,
  yapMountSwitchCommand,
  yapMountValidateCommand,
  yapPackPublishCommand,
  yapRuntimePlanCommand,
} from "./commands/yap.js";
import { getConfig } from "./lib/config.js";
import { checkForUpdates } from "./lib/update-check.js";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = fs.readJsonSync(path.join(__dirname, "../package.json"));

const program = new Command();

function parseCsvOption(value?: string): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function parseNumberOption(value?: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

program
  .name("yigyaps")
  .description(
    "YigYaps CLI — Marketplace and Tools for Skill Creators and Consumers",
  )
  .version("0.1.0");

// ─── Phase 1: Creator Commands ────────────────────────────────────────────────

program
  .command("init")
  .description("Initialize a new skill package in the current directory")
  .argument("[name]", "Name of the skill package")
  .action(initCommand);

program
  .command("validate")
  .description("Validate your skill package manifest and structure")
  .action(validateCommand);

program
  .command("login")
  .description("Login to your YigYaps account")
  .action(loginCommand);

program
  .command("whoami")
  .description("Show current logged-in user")
  .action(whoamiCommand);

program
  .command("logout")
  .description("Clear local session and logout")
  .action(logoutCommand);

program
  .command("publish")
  .description("Publish your skill package to the YigYaps Registry")
  .option("--dry-run", "Validate and pack without uploading")
  .option("--json", "Output results in JSON format")
  .action(publishCommand);

program
  .command("dev")
  .description("Start local development sandbox (MCP server)")
  .option(
    "-p, --port <number>",
    "Port for SSE transport (not implemented)",
    "3000",
  )
  .action(devCommand);

program
  .command("dev-server")
  .description("Internal: Run the MCP sandbox server on stdio")
  .action(devServerCommand);

program
  .command("status")
  .description("Check status of a published package")
  .argument("<id>", "Package ID or internal ID")
  .action(statusCommand);

const yap = program
  .command("yap")
  .description("Manage YAP containers and SkillPack assemblies");

yap
  .command("import")
  .description("Import a Yigfinance-style SkillPack Bridge repository as a YAP")
  .argument("<sourceDir>", "Path to the source repository")
  .option("--slug <slug>", "YAP slug (defaults to skillpack name)")
  .option("--display-name <name>", "YAP display name")
  .option("--description <description>", "YAP description")
  .option("--category <category>", "YAP category", "finance")
  .option("--tags <csv>", "Comma-separated YAP tags")
  .option("--visibility <visibility>", "public, private, or unlisted", "public")
  .option("--status <status>", "active or draft", "active")
  .option(
    "--plugin-dir <path>",
    "Bridge plugin directory relative to sourceDir",
  )
  .option(
    "--commands-dir <path>",
    "Command markdown directory relative to sourceDir",
  )
  .option(
    "--skills-dir <path>",
    "Generated SKILL.md directory relative to sourceDir",
  )
  .option("--dry-run", "Build the import plan without uploading")
  .option("--json", "Output results in JSON format")
  .action((sourceDir, options) =>
    yapImportCommand(sourceDir, {
      ...options,
      tags: parseCsvOption(options.tags),
    }),
  );

const yapPack = yap
  .command("pack")
  .description("Publish SkillPack Bridge artifacts under a YAP");

yapPack
  .command("publish")
  .description("Publish a SkillPack Bridge directory under a YAP")
  .argument("<yap>", "YAP ID or slug")
  .argument("<sourceDir>", "Bridge plugin directory or repository root")
  .option("--pack-type <type>", "core or extension", "extension")
  .option("--status <status>", "active or draft", "active")
  .option("--display-name <name>", "SkillPack display name")
  .option("--description <description>", "SkillPack description")
  .option("--commands-dir <path>", "Command markdown directory relative to sourceDir")
  .option("--skills-dir <path>", "Generated SKILL.md directory relative to sourceDir")
  .option("--dry-run", "Build the publish plan without uploading")
  .option("--json", "Output results in JSON format")
  .action((yapIdOrSlug, sourceDir, options) =>
    yapPackPublishCommand(yapIdOrSlug, sourceDir, options),
  );

const yapMount = yap
  .command("mount")
  .description("Validate, add, and switch mounted extension packs");

yapMount
  .command("validate")
  .description("Validate an extension pack before mounting or switching")
  .argument("<yap>", "YAP ID or slug")
  .argument("<skillPackId>", "SkillPack ID to validate")
  .requiredOption("--mount-key <key>", "Stable mount key")
  .option("--mount-point <path>", "Mount point", "extensions")
  .option("--display-name <name>", "Mount display name")
  .option("--priority <number>", "Mount priority")
  .option("--disabled", "Validate as disabled")
  .option("--required", "Mark mount as required")
  .option("--json", "Output results in JSON format")
  .action((yapIdOrSlug, skillPackId, options) =>
    yapMountValidateCommand(yapIdOrSlug, skillPackId, {
      ...options,
      priority: parseNumberOption(options.priority),
    }),
  );

yapMount
  .command("add")
  .description("Add an extension pack mount to a YAP")
  .argument("<yap>", "YAP ID or slug")
  .argument("<skillPackId>", "SkillPack ID to mount")
  .requiredOption("--mount-key <key>", "Stable mount key")
  .option("--mount-point <path>", "Mount point", "extensions")
  .option("--display-name <name>", "Mount display name")
  .option("--priority <number>", "Mount priority")
  .option("--disabled", "Create mount disabled")
  .option("--required", "Mark mount as required")
  .option("--json", "Output results in JSON format")
  .action((yapIdOrSlug, skillPackId, options) =>
    yapMountAddCommand(yapIdOrSlug, skillPackId, {
      ...options,
      priority: parseNumberOption(options.priority),
    }),
  );

yapMount
  .command("switch")
  .description("Switch an existing mount slot to another extension pack")
  .argument("<yap>", "YAP ID or slug")
  .argument("<mountId>", "Mount ID to update")
  .argument("<skillPackId>", "Replacement SkillPack ID")
  .option("--mount-key <key>", "Rename the stable mount key")
  .option("--mount-point <path>", "Mount point")
  .option("--display-name <name>", "Mount display name")
  .option("--priority <number>", "Mount priority")
  .option("--disabled", "Switch mount to disabled")
  .option("--required", "Mark mount as required")
  .option("--json", "Output results in JSON format")
  .action((yapIdOrSlug, mountId, skillPackId, options) =>
    yapMountSwitchCommand(yapIdOrSlug, mountId, skillPackId, {
      ...options,
      priority: parseNumberOption(options.priority),
    }),
  );

const yapAssembly = yap
  .command("assembly")
  .description("Export resolved YAP assemblies");

yapAssembly
  .command("export")
  .description("Export a resolved YAP assembly")
  .argument("<yap>", "YAP ID or slug")
  .option("-o, --output <file>", "Output JSON file")
  .option("--max-mounts <number>", "Maximum mounted packs to resolve")
  .option("--json", "Print JSON to stdout")
  .action((yapIdOrSlug, options) =>
    yapAssemblyExportCommand(yapIdOrSlug, {
      ...options,
      maxMounts: parseNumberOption(options.maxMounts),
    }),
  );

// ─── Phase 2: Consumer Commands ───────────────────────────────────────────────

const yapRuntime = yap
  .command("runtime")
  .description("Inspect runtime planning for resolved YAP assemblies");

yapRuntime
  .command("plan")
  .description("Plan candidate skills/routes/tools for a task")
  .argument("<yap>", "YAP ID or slug")
  .requiredOption("--task <text>", "Task to plan against the resolved YAP")
  .option("--required-skills <csv>", "Comma-separated required skill names")
  .option("--expected-contract-version <version>", "Required assembly contract version")
  .option("--max-candidates <number>", "Maximum candidate skills to return")
  .option("--max-mounts <number>", "Maximum mounted packs to resolve")
  .option("--skill-names <csv>", "Comma-separated skill hint names")
  .option("--mount-keys <csv>", "Comma-separated mount key hints")
  .option("--route-keys <csv>", "Comma-separated route key hints")
  .option("--tool-keys <csv>", "Comma-separated tool-map key hints")
  .option("--json", "Print JSON to stdout")
  .action((yapIdOrSlug, options) =>
    yapRuntimePlanCommand(yapIdOrSlug, {
      ...options,
      requiredSkills: parseCsvOption(options.requiredSkills),
      maxCandidates: parseNumberOption(options.maxCandidates),
      maxMounts: parseNumberOption(options.maxMounts),
      skillNames: parseCsvOption(options.skillNames),
      mountKeys: parseCsvOption(options.mountKeys),
      routeKeys: parseCsvOption(options.routeKeys),
      toolKeys: parseCsvOption(options.toolKeys),
    }),
  );

program
  .command("search")
  .description("Find skills in the YigYaps Registry")
  .argument("[query]", "Search query")
  .option("-c, --category <string>", "Filter by category")
  .option("-l, --limit <number>", "Limit number of results", "10")
  .option("--json", "Output results in JSON format")
  .action(searchCommand);

program
  .command("info")
  .description("Get detailed information about a skill package")
  .argument("<id>", "Package ID or internal ID")
  .option("--json", "Output results in JSON format")
  .action(infoCommand);

program
  .command("install")
  .description("Install a skill to an agent")
  .argument("<id>", "Package ID or internal ID")
  .option("-a, --agent-id <string>", "Target agent ID")
  .option("-y, --yes", "Skip confirmation")
  .action(installCommand);

program
  .command("list")
  .description("List your installed skills")
  .option("--json", "Output results in JSON format")
  .action(listCommand);

program
  .command("uninstall")
  .description("Uninstall a skill")
  .argument("<id>", "Installation ID")
  .option("-y, --yes", "Skip confirmation")
  .action(uninstallCommand);

// ─── Phase 3: AI-Assisted & Ecosystem ─────────────────────────────────────────

program
  .command("run")
  .description("Start a local MCP sandbox for a remote skill")
  .argument("<id>", "Package ID or internal ID")
  .action(runCommand);

program
  .command("doctor")
  .description("Diagnostic tool for YigYaps CLI")
  .action(doctorCommand);

program
  .command("export")
  .description("Export a skill as a SKILL.md file (for SkillsMP and ecosystem)")
  .argument("<packageId>", "Package ID (e.g. expert/investment-eval)")
  .option("--format <format>", "Export format", "skill-md")
  .option("-o, --output <file>", "Output file path")
  .option("--json", "Output results in JSON format")
  .action(exportCommand);

program
  .command("mcp-bridge")
  .description(
    "Start an MCP stdio bridge for a remote marketplace skill (use with Claude Desktop)",
  )
  .argument("<skillId>", "Package ID (e.g. expert/investment-eval)")
  .option("--api-key <key>", "YigYaps API key (defaults to stored key)")
  .option("--api-url <url>", "YigYaps API URL (defaults to https://api.yigyaps.com)")
  .action(mcpBridgeCommand);

// ─── Ecosystem Commands ───────────────────────────────────────────────────────

const mcp = program
  .command("mcp")
  .description("Manage MCP host configurations");

mcp
  .command("config")
  .description(
    "Configure a host application (e.g. Claude Desktop) to use YigYaps",
  )
  .action(mcpConfigCommand);

// ─── Global Error Handling ────────────────────────────────────────────────────

program.on("command:*", () => {
  handleGlobalError(
    CliError.user(
      "Unknown command. Type 'yigyaps --help' for available commands.",
    ),
  );
});

export async function run() {
  try {
    // Silently check for updates (only if not JSON output)
    if (!process.argv.includes("--json")) {
      checkForUpdates(pkg).catch(() => {
        // Update check is non-critical; silently ignore network errors
      });
    }

    // If no arguments are provided, enter interactive mode
    if (process.argv.length <= 2) {
      const { firstRun } = getConfig();
      if (firstRun) {
        await onboardingCommand();
      } else {
        await interactiveCommand();
      }
      return;
    }

    await program.parseAsync(process.argv);
  } catch (error) {
    await handleGlobalError(error);
  }
}
