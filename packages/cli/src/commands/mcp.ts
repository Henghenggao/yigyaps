import { logger } from "../lib/logger.js";
import { CliError } from "../lib/errors.js";
import fs from "fs-extra";
import path from "path";
import os from "os";
import inquirer from "inquirer";
import chalk from "chalk";

/**
 * MCP Command Group
 */
export async function mcpConfigCommand() {
    try {
        const { host } = await inquirer.prompt([
            {
                type: "list",
                name: "host",
                message: "Select the host application to configure:",
                choices: [
                    { name: "Claude Desktop", value: "claude" },
                    // { name: "Cursor", value: "cursor" }, // Not implemented yet
                    // { name: "Other (Manual)", value: "manual" }
                ]
            }
        ]);

        if (host === "claude") {
            await configureClaudeDesktop();
        }
    } catch (error: unknown) {
        if (error instanceof CliError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw CliError.system(`MCP config failed: ${message}`);
    }
}

async function configureClaudeDesktop() {
    const isWindows = process.platform === "win32";
    const configPath = isWindows
        ? path.join(os.homedir(), "AppData", "Roaming", "Claude", "claude_desktop_config.json")
        : path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");

    if (!(await fs.pathExists(configPath))) {
        logger.info(`Claude Desktop config not found at: ${configPath}`);
        const { create } = await inquirer.prompt([
            {
                type: "confirm",
                name: "create",
                message: "Do you want to create a new config file?",
                default: true
            }
        ]);
        if (!create) return;
        await fs.ensureDir(path.dirname(configPath));
        await fs.writeJson(configPath, { mcpServers: {} }, { spaces: 2 });
    }

    const config = await fs.readJson(configPath);
    if (!config.mcpServers) config.mcpServers = {};

    const serverName = "yigyaps";
    const binaryPath = "npx"; // Simplified for now, in production we might use direct path to yigyaps

    config.mcpServers[serverName] = {
        command: binaryPath,
        args: ["-y", "@yigyaps/cli", "dev-server"]
    };

    await fs.writeJson(configPath, config, { spaces: 2 });
    logger.success(`Successfully configured Claude Desktop!`);
    logger.info(`Path: ${configPath}`);
    console.log(`\n${chalk.bold("Next Steps:")}`);
    console.log(`1. Restart Claude Desktop.`);
    console.log(`2. Your YigYaps skills are now available in the local sandbox.`);
    logger.hint("Note: This configures the local development sandbox. For marketplace skills, use 'yigyaps install'.");
}
