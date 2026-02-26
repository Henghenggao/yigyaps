import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import { ensureAuthenticated } from "../lib/auth.js";
import inquirer from "inquirer";

interface UninstallOptions {
    yes?: boolean;
}

/**
 * Uninstall Command
 * 
 * Remove a skill installation.
 */
export async function uninstallCommand(id: string, options: UninstallOptions) {
    try {
        // 1. Ensure authenticated
        await ensureAuthenticated();

        const client = createRegistryClient();

        // 2. Confirm if no -y flag
        if (!options.yes) {
            const { confirm } = await inquirer.prompt([
                {
                    type: "confirm",
                    name: "confirm",
                    message: `Are you sure you want to uninstall installation '${id}'?`,
                    default: false
                }
            ]);
            if (!confirm) return;
        }

        const ora = (await import("ora")).default;
        const spinner = ora(`Uninstalling '${id}'...`).start();

        try {
            await client.uninstall(id);
            spinner.succeed(`Successfully uninstalled '${id}'`);
        } catch (err: unknown) {
            spinner.fail("Uninstall failed.");
            const message = err instanceof Error ? err.message : String(err);
            throw CliError.network(`Uninstall failed: ${message}`);
        }
    } catch (error: unknown) {
        if (error instanceof CliError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw CliError.system(`Uninstall command failed: ${message}`);
    }
}
