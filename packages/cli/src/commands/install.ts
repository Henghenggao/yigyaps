import { logger } from "../lib/logger.js";
import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import { ensureAuthenticated } from "../lib/auth.js";
import inquirer from "inquirer";

interface InstallOptions {
    agentId?: string;
    yes?: boolean;
}

/**
 * Install Command
 * 
 * Register a skill installation for an agent.
 */
export async function installCommand(id: string, options: InstallOptions) {
    try {
        // 1. Ensure authenticated
        const user = await ensureAuthenticated();

        const client = createRegistryClient();

        // 2. Resolve package info
        const ora = (await import("ora")).default;
        const fetchSpinner = ora(`Checking skill '${id}'...`).start();

        let pkg;
        try {
            try {
                pkg = await client.getByPackageId(id);
            } catch {
                pkg = await client.getById(id);
            }
            fetchSpinner.stop();
        } catch {
            fetchSpinner.fail(`Skill '${id}' not found.`);
            throw CliError.user(`Skill '${id}' not found in the registry.`);
        }

        // 3. Confirm installation if no -y flag
        if (!options.yes) {
            const { confirm } = await inquirer.prompt([
                {
                    type: "confirm",
                    name: "confirm",
                    message: `Install '${pkg.displayName}' (v${pkg.version})?`,
                    default: true
                }
            ]);
            if (!confirm) return;
        }

        // 4. Get Agent ID
        let agentId = options.agentId;
        if (!agentId) {
            const { selectedAgentId } = await inquirer.prompt([
                {
                    type: "input",
                    name: "selectedAgentId",
                    message: "Enter the Agent ID to install to:",
                    default: "default-agent"
                }
            ]);
            agentId = selectedAgentId;
        }

        // 5. Install
        const installSpinner = ora(`Installing to agent '${agentId}'...`).start();

        try {
            const result = await client.install({
                packageId: pkg.id,
                yigbotId: agentId as string,
                userTier: user.tier,
            });

            installSpinner.succeed(`Successfully installed ${pkg.displayName} to '${agentId}'`);
            logger.info(`Installation ID: ${result.id}`);
            console.log(`\nView detailed results at: https://yigyaps.com/skills/${pkg.id}`);

        } catch (err: unknown) {
            installSpinner.fail("Installation failed.");
            const message = err instanceof Error ? err.message : String(err);
            throw CliError.network(`Installation failed: ${message}`);
        }

    } catch (error: unknown) {
        if (error instanceof CliError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw CliError.system(`Install command failed: ${message}`);
    }
}
