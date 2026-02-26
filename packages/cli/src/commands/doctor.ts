import { logger } from "../lib/logger.js";
import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import { getSession } from "../lib/auth.js";
import chalk from "chalk";
import os from "os";
import path from "path";
import fs from "fs-extra";

/**
 * Doctor Command
 * 
 * Diagnostic tool for YigYaps CLI.
 */
export async function doctorCommand() {
    try {
        logger.info(chalk.bold.cyan("\n👨‍⚕️ YigYaps CLI Diagnostics\n"));

        // 1. Check Node.js
        const nodeVersion = process.version;
        const major = parseInt(nodeVersion.slice(1).split(".")[0]);
        if (major >= 18) {
            logger.success(`Node.js: ${nodeVersion} (Supported)`);
        } else {
            logger.error(`Node.js: ${nodeVersion} (Required: >= 18.0.0)`);
        }

        // 2. Check Auth Status
        const session = getSession();
        if (session.apiKey) {
            logger.success(`Authentication: API Key is configured`);
        } else {
            logger.warn(`Authentication: Not logged in (Use 'yigyaps login')`);
        }

        // 3. Check Registry Connectivity
        const ora = (await import("ora")).default;
        const spinner = ora("Checking Registry connectivity...").start();
        try {
            const client = createRegistryClient();
            await client.getDiscovery();
            spinner.succeed("Registry: Connected (https://api.yigyaps.com)");
        } catch {
            spinner.fail("Registry: Could not connect to API.");
        }

        // 4. Check MCP Host Configs
        await checkMcpHosts();

        // 5. System Info
        logger.info(`\n${chalk.bold("System Info:")}`);
        console.log(`  OS:      ${process.platform} (${os.release()})`);
        console.log(`  Arch:    ${process.arch}`);
        console.log(`  Shell:   ${process.env.SHELL || "N/A"}`);
        console.log(`  CWD:     ${process.cwd()}`);

        logger.info(chalk.bold.green("\nDiagnosis complete!\n"));

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw CliError.system(`Doctor failed: ${message}`);
    }
}

async function checkMcpHosts() {
    const isWindows = process.platform === "win32";
    const claudePath = isWindows
        ? path.join(os.homedir(), "AppData", "Roaming", "Claude", "claude_desktop_config.json")
        : path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");

    if (await fs.pathExists(claudePath)) {
        try {
            const config = await fs.readJson(claudePath);
            const isConfigured = config.mcpServers && config.mcpServers.yigyaps;
            if (isConfigured) {
                logger.success("Claude Desktop: Configured with YigYaps");
            } else {
                logger.warn("Claude Desktop: Found, but not configured with YigYaps (Use 'yigyaps mcp config')");
            }
        } catch {
            logger.error("Claude Desktop: Config file is corrupted");
        }
    } else {
        logger.info("Claude Desktop: Not found (Skipped)");
    }
}
