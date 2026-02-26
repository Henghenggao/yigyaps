import { logger } from "../lib/logger.js";
import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import Table from "cli-table3";

interface SearchOptions {
    category?: string;
    limit?: string;
    json?: boolean;
}

/**
 * Search Command
 * 
 * Find skills in the YigYaps registry.
 */
export async function searchCommand(query: string | undefined, options: SearchOptions) {
    try {
        const client = createRegistryClient();

        const ora = (await import("ora")).default;
        const spinner = options.json ? null : ora("Searching YigYaps Registry...").start();

        try {
            const result = await client.search({
                query,
                category: options.category as any,
                limit: options.limit ? parseInt(options.limit) : 10,
            });

            if (spinner) spinner.stop();

            if (options.json) {
                console.log(JSON.stringify(result, null, 2));
                return;
            }

            if (result.packages.length === 0) {
                logger.info("No skills found matching your query.");
                return;
            }

            logger.info(`Found ${result.total} skill(s):`);

            const table = new Table({
                head: ["ID", "Name", "Version", "Author", "Installs"],
                style: { head: ["cyan", "bold"], border: ["gray"] }
            });

            for (const pkg of result.packages) {
                table.push([
                    pkg.packageId,
                    pkg.displayName,
                    `v${pkg.version}`,
                    pkg.authorName,
                    pkg.installCount || 0
                ]);
            }

            console.log(table.toString());
            console.log(`\nUse 'yigyaps info <id>' to see details about a skill.`);

        } catch (err: unknown) {
            if (spinner) spinner.fail("Search failed.");
            const message = err instanceof Error ? err.message : String(err);
            throw CliError.network(`Search failed: ${message}`);
        }
    } catch (error: unknown) {
        if (error instanceof CliError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw CliError.system(`Search command failed: ${message}`);
    }
}
