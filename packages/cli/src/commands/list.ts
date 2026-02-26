import { logger } from "../lib/logger.js";
import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import { ensureAuthenticated } from "../lib/auth.js";
import Table from "cli-table3";

interface ListOptions {
    json?: boolean;
}

/**
 * List Command
 * 
 * List all installed skills for the current user.
 */
export async function listCommand(options: ListOptions) {
    try {
        // 1. Ensure authenticated
        await ensureAuthenticated();

        const client = createRegistryClient();

        const ora = (await import("ora")).default;
        const spinner = options.json ? null : ora("Fetching your installed skills...").start();

        try {
            const { installations } = await client.getInstallations();

            if (spinner) spinner.stop();

            if (options.json) {
                console.log(JSON.stringify(installations, null, 2));
                return;
            }

            if (installations.length === 0) {
                logger.info("You haven't installed any skills yet.");
                logger.hint("Try 'yigyaps search' to discover skills!");
                return;
            }

            logger.info(`You have ${installations.length} installed skill(s):`);

            const table = new Table({
                head: ["Install ID", "Package", "Agent", "Status", "Installed At"],
                style: { head: ["cyan", "bold"], border: ["gray"] }
            });

            for (const inst of installations) {
                table.push([
                    inst.id,
                    inst.packageId,
                    inst.agentId,
                    inst.status === "active" ? "✅ active" : "⚠️ " + inst.status,
                    new Date(inst.installedAt).toLocaleDateString()
                ]);
            }

            console.log(table.toString());

        } catch (err: unknown) {
            if (spinner) spinner.fail("Failed to list installations.");
            const message = err instanceof Error ? err.message : String(err);
            throw CliError.network(`List failed: ${message}`);
        }
    } catch (error: unknown) {
        if (error instanceof CliError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw CliError.system(`List command failed: ${message}`);
    }
}
