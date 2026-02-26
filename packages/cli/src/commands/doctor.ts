import { CliError } from "../lib/errors.js";
import { createRegistryClient } from "../lib/registry.js";
import { getSession } from "../lib/auth.js";
import os from "os";
import path from "path";
import fs from "fs-extra";
import { p } from "../lib/ui/prompts.js";
import { colors, icons } from "../lib/ui/theme.js";
import { panel, keyValue } from "../lib/ui/components.js";

/**
 * Doctor Command
 */
export async function doctorCommand() {
  p.intro(colors.primary.bold("👨‍⚕️ YigYaps CLI Diagnostics"));

  try {
    // 1. System Info Panel
    const sysInfo = keyValue({
      OS: `${process.platform} (${os.release()})`,
      Arch: process.arch,
      Node: process.version,
      Shell: process.env.SHELL || "N/A",
      CWD: process.cwd(),
    });
    console.log(panel("System Information", sysInfo));

    // 2. Health Checks
    const s = p.spinner();

    // Node.js Check
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split(".")[0]);
    if (major >= 18) {
      p.log.success(`Node.js ${colors.muted(nodeVersion)}: Supported`);
    } else {
      p.log.error(`Node.js ${colors.muted(nodeVersion)}: Required >= 18.0.0`);
    }

    // Auth Check
    const session = getSession();
    if (session.apiKey) {
      p.log.success("Authentication: API Key configured");
    } else {
      p.log.warn(
        `Authentication: Not logged in (run ${colors.primary("yigyaps login")})`,
      );
    }

    // Registry Check
    s.start("Checking Registry connectivity...");
    try {
      const client = createRegistryClient();
      await client.getDiscovery();
      s.stop(
        `${icons.success} Registry: Connected (${colors.link("api.yigyaps.com")})`,
      );
    } catch {
      s.stop(`${icons.error} Registry: Connection failed`);
    }

    // 3. MCP Host Checks
    await checkMcpHosts();

    p.outro(colors.success("Diagnosis complete! Your environment is ready."));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.system(`Doctor failed: ${message}`);
  }
}

async function checkMcpHosts() {
  const isWindows = process.platform === "win32";
  const claudePath = isWindows
    ? path.join(
        os.homedir(),
        "AppData",
        "Roaming",
        "Claude",
        "claude_desktop_config.json",
      )
    : path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      );

  if (await fs.pathExists(claudePath)) {
    try {
      const config = await fs.readJson(claudePath);
      const isConfigured = config.mcpServers && config.mcpServers.yigyaps;
      if (isConfigured) {
        p.log.success("Claude Desktop: Properly configured");
      } else {
        p.log.warn(
          `Claude Desktop: Not configured (run ${colors.primary("yigyaps mcp config")})`,
        );
      }
    } catch {
      p.log.error("Claude Desktop: Config file is corrupted");
    }
  } else {
    p.log.step(colors.muted("Claude Desktop: Not found (Skipped)"));
  }
}
