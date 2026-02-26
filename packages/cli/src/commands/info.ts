import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import chalk from "chalk";

interface InfoOptions {
    json?: boolean;
}

/**
 * Info Command
 * 
 * Display detailed information about a skill package.
 */
export async function infoCommand(id: string, options: InfoOptions) {
    try {
        const client = createRegistryClient();

        const ora = (await import("ora")).default;
        const spinner = options.json ? null : ora(`Fetching details for '${id}'...`).start();

        try {
            // Try by packageId first (more human friendly)
            let pkg;
            try {
                pkg = await client.getByPackageId(id);
            } catch {
                // Fallback to internal ID
                pkg = await client.getById(id);
            }

            if (spinner) spinner.stop();

            if (options.json) {
                console.log(JSON.stringify(pkg, null, 2));
                return;
            }

            console.log(chalk.bold.cyan(`\n📦 ${pkg.displayName} (${pkg.packageId})`));
            console.log(chalk.gray(`v${pkg.version} • ${pkg.maturity} • ${pkg.license}`));
            console.log(`\n${pkg.description}`);

            console.log(`\n${chalk.bold("Author:")}   ${pkg.authorName}`);
            console.log(`${chalk.bold("Category:")} ${pkg.category}`);
            if (pkg.tags && pkg.tags.length > 0) {
                console.log(`${chalk.bold("Tags:")}     ${pkg.tags.join(", ")}`);
            }

            console.log(`\n${chalk.bold("Marketplace Stats:")}`);
            console.log(`  Installs: ${pkg.installCount || 0}`);
            console.log(`  Rating:   ⭐ ${pkg.rating || "N/A"} (${pkg.ratingCount || 0} reviews)`);

            if (pkg.readme) {
                console.log(`\n${chalk.bold("README Summary:")}`);
                const preview = pkg.readme.length > 300 ? pkg.readme.slice(0, 300) + "..." : pkg.readme;
                console.log(chalk.dim(preview));
            }

            console.log(`\nURL: https://yigyaps.com/skills/${pkg.id}`);
            console.log(`\nTo install this skill, run:`);
            console.log(chalk.green(`  yigyaps install ${pkg.packageId}`));

        } catch {
            if (spinner) spinner.fail("Could not find skill.");
            throw CliError.user(`Skill '${id}' not found in the registry.`);
        }
    } catch (error: unknown) {
        if (error instanceof CliError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw CliError.system(`Info command failed: ${message}`);
    }
}
