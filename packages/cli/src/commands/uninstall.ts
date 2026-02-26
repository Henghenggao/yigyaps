import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import { ensureAuthenticated } from "../lib/auth.js";
import { p, assertNotCancelled } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";

interface UninstallOptions {
  yes?: boolean;
}

/**
 * Uninstall Command
 */
export async function uninstallCommand(id: string, options: UninstallOptions) {
  p.intro(colors.primary.bold(`🗑️ Uninstall Skill: ${id}`));
  const s = p.spinner();

  try {
    // 1. Ensure authenticated
    await ensureAuthenticated();

    const client = createRegistryClient();

    // 2. Confirm if no -y flag
    if (!options.yes) {
      const confirm = assertNotCancelled(
        await p.confirm({
          message: `Are you sure you want to uninstall installation '${id}'?`,
          initialValue: false,
        }),
      );
      if (!confirm) {
        p.cancel("Operation cancelled.");
        return;
      }
    }

    s.start(`Uninstalling '${id}'...`);

    try {
      await client.uninstall(id);
      s.stop(`Successfully uninstalled '${id}'`);
      p.outro(colors.success("✨ Uninstallation Complete!"));
    } catch (err: unknown) {
      s.stop("Uninstall failed");
      const message = err instanceof Error ? err.message : String(err);
      throw CliError.network(`Uninstall failed: ${message}`);
    }
  } catch (error: unknown) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.system(`Uninstall command failed: ${message}`);
  }
}
