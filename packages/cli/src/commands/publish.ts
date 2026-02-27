import { CliError } from "../lib/errors.js";
import { packPackage } from "../lib/packager.js";
import { ensureAuthenticated } from "../lib/auth.js";
import { createPublisherClient } from "../lib/registry.js";
import { validateCommand } from "./validate.js";
import { p } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";
import { panel, keyValue } from "../lib/ui/components.js";

interface PublishOptions {
  dryRun?: boolean;
  json?: boolean;
}

/**
 * Publish Command
 */
export async function publishCommand(options: PublishOptions) {
  if (!options.json) {
    p.intro(colors.primary.bold("🚀 Publish Skill to Registry"));
  }

  try {
    // 1. Ensure authenticated
    const user = await ensureAuthenticated();

    if (!options.json) {
      p.log.step(
        `Publishing as ${user.displayName} (${colors.accent(`@${user.githubUsername}`)})`,
      );
    }

    // 2. Internal validation (fail fast)
    await validateCommand();

    // 3. Pack
    const payload = await packPackage(process.cwd());

    if (options.dryRun) {
      if (options.json) {
        console.log(JSON.stringify({ dryRun: true, payload }, null, 2));
      } else {
        const summary = keyValue({
          Package: payload.manifest.name,
          Version: payload.manifest.version,
          Rules: `${payload.rules.length} files`,
          Mode: colors.warning("Dry Run (Preview)"),
        });
        console.log(panel("Publishing Summary", summary));
        p.outro(
          colors.success(
            "Dry run successful! No changes made to the registry.",
          ),
        );
      }
      return;
    }

    // 4. Upload
    const s = p.spinner();
    if (!options.json) s.start("Uploading to YigYaps Registry...");

    try {
      const client = createPublisherClient();

      const result = await client.publishPackage({
        packageId: payload.manifest.name,
        version: payload.manifest.version,
        displayName: payload.manifest.name,
        description: payload.manifest.description,
        authorName: payload.manifest.author,
        category: payload.manifest.yigyaps?.category || "other",
        tags: payload.manifest.yigyaps?.tags || [],
        readme: payload.readme,
        rules: payload.rules.map((r) => ({ path: r.path, content: r.content })),
      });

      if (!options.json) {
        s.stop(
          `Published ${colors.primary(payload.manifest.name)} v${payload.manifest.version}`,
        );
      }

      const packageUrl = `https://yigyaps.com/skills/${result.id}`;
      if (options.json) {
        console.log(
          JSON.stringify({
            success: true,
            packageId: result.id,
            url: packageUrl,
          }),
        );
      } else {
        p.outro(`${colors.success("🚀 Successfully published!")}

🔗 ${colors.link(packageUrl)}

${colors.muted("To try your skill locally, run:")}
${colors.primary(`yigyaps run ${result.id}`)}`);
      }
    } catch (uploadError: unknown) {
      if (!options.json) s.stop("Upload failed");
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : String(uploadError);
      throw CliError.network(`Upload failed: ${message}`);
    }
  } catch (error: unknown) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.system(`Publishing failed: ${message}`);
  }
}
