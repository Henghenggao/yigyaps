import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import { ensureAuthenticated } from "../lib/auth.js";
import { p } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";
import { skillListItem } from "../lib/ui/components.js";

interface ListOptions {
  json?: boolean;
}

/**
 * List Command
 */
export async function listCommand(options: ListOptions) {
  const s = p.spinner();

  try {
    // 1. Ensure authenticated
    await ensureAuthenticated();

    const client = createRegistryClient();

    if (!options.json) {
      s.start("Fetching your installed skills...");
    }

    try {
      const { installations } = await client.getInstallations();

      if (!options.json) {
        s.stop(`Found ${colors.primary(installations.length)} installations`);
      }

      if (options.json) {
        console.log(JSON.stringify(installations, null, 2));
        return;
      }

      if (installations.length === 0) {
        p.intro(colors.primary.bold("📦 Your Skills"));
        p.note("You haven't installed any skills yet.", "Empty Library");
        p.outro(
          `${colors.muted("Try")} ${colors.primary("yigyaps search")} ${colors.muted("to discover new capabilities!")}`,
        );
        return;
      }

      // Render rich list items
      // Note: Installation object might need mapping to SkillPackage for skillListItem
      // For now, we'll use a direct panel list or map what we have
      console.log(
        "\n" +
          installations
            .map((inst) =>
              skillListItem({
                packageId: inst.packageId,
                displayName: inst.packageId, // We might not have displayName in inst, fallback to ID
                version: "installed",
                authorName: inst.agentId,
                description: `Installed on agent: ${inst.agentId}`,
                category: inst.status,
              }),
            )
            .join("\n\n") +
          "\n",
      );

      p.outro(
        `${colors.muted(`Use ${colors.primary(`yigyaps status <id>`)} to check a specific installation.`)}`,
      );
    } catch (err: unknown) {
      if (!options.json) s.stop("Failed to list installations");
      const message = err instanceof Error ? err.message : String(err);
      throw CliError.network(`List failed: ${message}`);
    }
  } catch (error: unknown) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.system(`List command failed: ${message}`);
  }
}
