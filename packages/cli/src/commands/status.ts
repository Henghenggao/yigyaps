import { logger } from "../lib/logger.js";
import { createRegistryClient } from "../lib/registry.js";
import { CliError } from "../lib/errors.js";

/**
 * Status Command
 */
export async function statusCommand(packageId: string) {
    try {
        const client = createRegistryClient();

        const ora = (await import("ora")).default;
        const spinner = ora(`Fetching status for '${packageId}'...`).start();

        try {
            const pkg = await client.getByPackageId(packageId);
            spinner.stop();

            logger.info(`Package Status: ${packageId}`);
            console.log(`\n📦 ${pkg.displayName} v${pkg.version}`);
            console.log(`   Status:   ✅ Live`);
            console.log(`   Author:   ${pkg.authorName}`);
            console.log(`   Maturity: ${pkg.maturity}`);
            console.log(`\n   Installs: ${pkg.installCount ?? 0}`);
            console.log(`   Rating:   ⭐ ${pkg.rating ?? "N/A"}/5 (${pkg.ratingCount ?? 0} reviews)`);
            console.log(`\n   URL:      https://yigyaps.com/skills/${pkg.id}\n`);
        } catch {
            spinner.fail(`Package '${packageId}' not found or inaccessible.`);
            throw CliError.user(`Could not find package with ID '${packageId}'.`);
        }
    } catch (error: unknown) {
        if (error instanceof CliError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw CliError.system(`Status check failed: ${message}`);
    }
}
