import chokidar from "chokidar";
import path from "path";
import { logger } from "../lib/logger.js";
import { CliError } from "../lib/errors.js";
import { packPackage } from "../lib/packager.js";
import { SkillSandbox } from "../lib/sandbox.js";

/**
 * Dev Command
 */
export async function devCommand() {
  const cwd = process.cwd();

  logger.info("🔧  Starting YigYaps skill sandbox...");

  try {
    // Initial pack
    let payload = await packPackage(cwd);
    const sandbox = new SkillSandbox(payload);

    logger.success(
      `  ✅ Loaded ${payload.manifest.name} v${payload.manifest.version}`,
    );
    logger.info(`  📄 Rule files watched: ${payload.rules.length}`);
    console.log('\n  Test with: claude --mcp-server "yigyaps dev-server"');
    logger.hint(
      "Use 'yigyaps dev-server' for standard-io based MCP client connections.",
    );

    // Setup file watcher for hot-reloading
    const watcher = chokidar.watch(
      [
        path.join(cwd, "package.json"),
        path.join(cwd, "rules/**/*"),
        path.join(cwd, "README.md"),
      ],
      {
        ignoreInitial: true,
        persistent: true,
      },
    );

    watcher.on("change", async (filePath) => {
      const relativePath = path.relative(cwd, filePath);
      logger.info(`\n🔄  File changed: ${relativePath}. Reloading...`);

      try {
        payload = await packPackage(cwd);
        sandbox.updatePayload(payload);
        logger.success(`  ✅ Reloaded ${payload.manifest.name}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`  ❌ Failed to reload: ${message}`);
      }
    });

    // Keep process alive
    process.on("SIGINT", () => {
      watcher.close();
      logger.info("\nStopping sandbox...");
      process.exit(0);
    });
  } catch (error: any) {
    if (error instanceof CliError) throw error;
    throw CliError.system(`Sandbox failed to start: ${error.message}`);
  }
}

/**
 * Dev Server Command (StdIO mode for MCP clients)
 * This sits in the background when an MCP client connects.
 */
export async function devServerCommand() {
  try {
    const payload = await packPackage(process.cwd());
    const sandbox = new SkillSandbox(payload);
    await sandbox.start();
  } catch {
    process.exit(1);
  }
}
