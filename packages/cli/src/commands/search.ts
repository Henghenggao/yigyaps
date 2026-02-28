import type { SkillPackageCategory } from "@yigyaps/types";
import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import { p } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";
import { skillListItem } from "../lib/ui/components.js";

interface SearchOptions {
  category?: string;
  limit?: string;
  json?: boolean;
}

/**
 * Search Command
 */
export async function searchCommand(
  query: string | undefined,
  options: SearchOptions,
) {
  const s = p.spinner();

  try {
    const client = createRegistryClient();

    if (!options.json) {
      s.start(
        query
          ? `Searching for '${colors.primary(query)}'...`
          : "Browsing latest skills...",
      );
    }

    try {
      const result = await client.search({
        query,
        category: options.category as SkillPackageCategory | undefined,
        limit: options.limit ? parseInt(options.limit) : 10,
      });

      if (!options.json) {
        s.stop(`Found ${colors.primary(result.total)} results`);
      }

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.packages.length === 0) {
        p.note("No skills found matching your query.", "Search Results");
        return;
      }

      // Render rich list items
      console.log(
        "\n" +
          result.packages.map((pkg) => skillListItem(pkg)).join("\n\n") +
          "\n",
      );

      p.outro(
        `${colors.muted(`Use ${colors.primary(`yigyaps info <id>`)} to see details.`)}`,
      );
    } catch (err: unknown) {
      if (!options.json) s.stop("Search failed");
      const message = err instanceof Error ? err.message : String(err);
      throw CliError.network(`Search failed: ${message}`);
    }
  } catch (error: unknown) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.system(`Search command failed: ${message}`);
  }
}
