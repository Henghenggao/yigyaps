import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import { ensureAuthenticated } from "../lib/auth.js";
import { p, assertNotCancelled } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";
import { skillCard } from "../lib/ui/components.js";

interface InstallOptions {
  agentId?: string;
  yes?: boolean;
}

/**
 * Install Command
 *
 * Register a skill installation for an agent.
 */
export async function installCommand(id: string, options: InstallOptions) {
  p.intro(colors.primary.bold(`📥 Install Skill: ${id}`));
  const s = p.spinner();

  try {
    // 1. Ensure authenticated
    const user = await ensureAuthenticated();

    const client = createRegistryClient();

    // 2. Resolve package info
    s.start(`Checking skill '${id}' in registry...`);

    let pkg;
    try {
      try {
        pkg = await client.getByPackageId(id);
      } catch {
        pkg = await client.getById(id);
      }
      s.stop("Skill identified");
    } catch {
      s.stop("Skill not found");
      throw CliError.user(`Skill '${id}' not found in the registry.`);
    }

    // Show preview card
    console.log(skillCard(pkg as any));

    // 3. Confirm installation if no -y flag
    if (!options.yes) {
      const confirm = assertNotCancelled(
        await p.confirm({
          message: `Install '${pkg.displayName}' (v${pkg.version})?`,
          initialValue: true,
        }),
      );
      if (!confirm) {
        p.cancel("Installation aborted.");
        return;
      }
    }

    // 4. Get Agent ID
    let agentId = options.agentId;
    if (!agentId) {
      agentId = assertNotCancelled(
        await p.text({
          message: "Enter the Agent ID to install to:",
          placeholder: "yigbot_123...",
          validate: (v: string | undefined) =>
            v ? undefined : "Agent ID is required",
        }),
      );
    }

    // 5. Install
    s.start(`Installing to agent '${agentId}'...`);

    try {
      await client.install({
        packageId: pkg.id,
        yigbotId: agentId as string,
        userTier: user.tier,
      });

      s.stop(
        `Successfully installed ${colors.primary(pkg.displayName)} to ${colors.accent(agentId)}`,
      );

      p.outro(`${colors.success("✨ Installation Complete!")}

Next steps:
  ${colors.muted("•")} Open YigYaps app to see the new skill
  ${colors.muted("•")} Ask your agent about its new capabilities
  ${colors.muted("•")} Details: ${colors.link(`https://yigyaps.com/skills/${pkg.id}`)}`);
    } catch (err: unknown) {
      s.stop("Installation failed");
      const message = err instanceof Error ? err.message : String(err);
      throw CliError.network(`Installation failed: ${message}`);
    }
  } catch (error: unknown) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.system(`Install command failed: ${message}`);
  }
}
