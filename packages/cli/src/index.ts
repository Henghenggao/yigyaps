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
import { getConfig } from "./lib/config.js";
import { checkForUpdates } from "./lib/update-check.js";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = fs.readJsonSync(path.join(__dirname, "../package.json"));

const program = new Command();

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

// ─── Phase 2: Consumer Commands ───────────────────────────────────────────────

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
      checkForUpdates(pkg).catch(() => {});
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
