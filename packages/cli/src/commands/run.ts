import { logger } from "../lib/logger.js";
import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import { SkillSandbox } from "../lib/sandbox.js";
import chalk from "chalk";

interface RunOptions {
  verbose?: boolean;
}

/**
 * Run Command
 *
 * Start a local MCP sandbox for a remote skill.
 */
export async function runCommand(id: string, _options: RunOptions) {
  try {
    const client = createRegistryClient();

    const ora = (await import("ora")).default;
    const spinner = ora(`Preparing to run skill '${id}'...`).start();

    try {
      // 1. Fetch Skill Info
      let pkg;
      try {
        pkg = await client.getByPackageId(id);
      } catch {
        pkg = await client.getById(id);
      }

      // 2. Fetch Rules
      const { rules } = await client.getRules(pkg.id);

      spinner.succeed(`Loaded skill '${pkg.displayName}' v${pkg.version}`);

      // 3. Start Sandbox
      logger.info(chalk.cyan(`\n🚀 Starting Local MCP Sandbox...`));
      logger.info(chalk.gray(`Skill: ${pkg.displayName} (${pkg.packageId})`));
      logger.info(chalk.gray(`Author: ${pkg.authorName}`));
      logger.info(chalk.gray(`Transport: stdio`));

      console.log(
        chalk.yellow(`\n[WARNING] This is a temporary sandbox via stdio.`),
      );
      console.log(chalk.yellow(`To exit, press Ctrl+C.\n`));

      const sandbox = new SkillSandbox({
        manifest: {
          name: pkg.packageId,
          version: pkg.version,
          description: pkg.description,
          author: pkg.authorName,
          category: pkg.category,
        } as any,
        rules: rules,
      });

      await sandbox.start();
    } catch (err: unknown) {
      spinner.fail("Failed to load skill.");
      const message = err instanceof Error ? err.message : String(err);
      throw CliError.network(`Could not run skill: ${message}`);
    }
  } catch (error: unknown) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.system(`Run command failed: ${message}`);
  }
}
