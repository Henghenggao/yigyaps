import { createRegistryClient } from "../lib/registry.js";
import { CliError } from "../lib/errors.js";
import { p } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";
import { panel, keyValue } from "../lib/ui/components.js";

/**
 * Status Command
 */
export async function statusCommand(packageId: string) {
  const s = p.spinner();

  try {
    const client = createRegistryClient();
    s.start(`Fetching status for '${packageId}'...`);

    try {
      const pkg = await client.getByPackageId(packageId);
      s.stop("Status retrieved");

      const content = keyValue({
        Package: pkg.displayName,
        Version: pkg.version,
        Status: colors.success("Live"),
        Author: `@${pkg.authorName}`,
        Category: pkg.category,
        Maturity: pkg.maturity,
        Installs: String(pkg.installCount ?? 0),
        Rating: `⭐ ${pkg.rating ?? "N/A"} (${pkg.ratingCount ?? 0} reviews)`,
      });

      console.log(panel(`${packageId} Status`, content));

      p.outro(
        `${colors.muted("View details online:")} ${colors.link(`https://yigyaps.com/skills/${pkg.id}`)}`,
      );
    } catch {
      s.stop("Package not found");
      throw CliError.user(`Could not find package with ID '${packageId}'.`);
    }
  } catch (error: unknown) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.system(`Status check failed: ${message}`);
  }
}
