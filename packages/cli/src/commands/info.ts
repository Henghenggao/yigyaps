import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import { p } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";
import { skillCard } from "../lib/ui/components.js";

interface InfoOptions {
  json?: boolean;
}

/**
 * Info Command
 */
export async function infoCommand(id: string, options: InfoOptions) {
  const s = p.spinner();

  try {
    const client = createRegistryClient();

    if (!options.json) {
      s.start(`Fetching details for '${id}'...`);
    }

    try {
      // Try by packageId first (more human friendly)
      let pkg;
      try {
        pkg = await client.getByPackageId(id);
      } catch {
        // Fallback to internal ID
        pkg = await client.getById(id);
      }

      if (!options.json) {
        s.stop("Skill details retrieved");
      }

      if (options.json) {
        console.log(JSON.stringify(pkg, null, 2));
        return;
      }

      // Render rich UI card
      console.log(skillCard(pkg));

      p.outro(
        `${colors.muted("To install this skill, run:")} ${colors.success(`yigyaps install ${pkg.packageId}`)}`,
      );
    } catch {
      if (!options.json) s.stop("Skill not found");
      throw CliError.user(`Skill '${id}' not found in the registry.`);
    }
  } catch (error: unknown) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.system(`Info command failed: ${message}`);
  }
}
