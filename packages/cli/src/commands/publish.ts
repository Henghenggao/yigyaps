import { logger } from "../lib/logger.js";
import { CliError } from "../lib/errors.js";
import { packPackage } from "../lib/packager.js";
import { ensureAuthenticated } from "../lib/auth.js";
import { createPublisherClient } from "../lib/registry.js";
import { validateCommand } from "./validate.js";

interface PublishOptions {
    dryRun?: boolean;
    json?: boolean;
}

/**
 * Publish Command
 */
export async function publishCommand(options: PublishOptions) {
    try {
        // 1. Ensure authenticated
        const user = await ensureAuthenticated();

        if (!options.json) {
            logger.info(`Publishing as ${user.displayName} (@${user.githubUsername})...`);
        }

        // 2. Internal validation (fail fast)
        await validateCommand();

        // 3. Pack
        const payload = await packPackage(process.cwd());

        if (options.dryRun) {
            if (options.json) {
                console.log(JSON.stringify({ dryRun: true, payload }, null, 2));
            } else {
                logger.info("Dry run: Package is valid and ready to publish.");
                console.log(`\n📦 Package: ${payload.manifest.name} v${payload.manifest.version}`);
                console.log(`📄 Rules:   ${payload.rules.length} files`);
                logger.success("\nDry run successful! No changes made to the registry.");
            }
            return;
        }

        // 4. Upload
        const ora = (await import("ora")).default;
        const spinner = options.json ? null : ora("Uploading to YigYaps Registry...").start();

        try {
            const client = createPublisherClient();

            const result = await client.publishPackage({
                packageId: payload.manifest.name,
                version: payload.manifest.version,
                displayName: payload.manifest.name,
                description: payload.manifest.description,
                authorName: payload.manifest.author,
                category: payload.manifest.yigyaps?.category || "general",
                tags: payload.manifest.yigyaps?.tags || [],
                readme: payload.readme,
                rules: payload.rules.map(r => ({ path: r.path, content: r.content }))
            });

            if (spinner) {
                spinner.succeed(`Published ${payload.manifest.name} v${payload.manifest.version}`);
            }

            const packageUrl = `https://yigyaps.com/skills/${result.id}`;
            if (options.json) {
                console.log(JSON.stringify({ success: true, packageId: result.id, url: packageUrl }));
            } else {
                logger.success(`\n🚀 Successfully published!`);
                console.log(`🔗 URL: ${packageUrl}`);
                console.log(`\nTo integrate with your MCP client, use:`);
                console.log(`npx -y @yigyaps/cli run ${result.id}`);
            }
        } catch (uploadError: unknown) {
            if (spinner) spinner.fail("Upload failed.");
            const message = uploadError instanceof Error ? uploadError.message : String(uploadError);
            throw CliError.network(`Upload failed: ${message}`);
        }

    } catch (error: unknown) {
        if (error instanceof CliError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw CliError.system(`Publishing failed: ${message}`);
    }
}
