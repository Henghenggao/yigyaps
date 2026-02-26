import { CliError } from "../lib/errors.js";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { p, assertNotCancelled } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";

/**
 * MCP Command Group
 */
export async function mcpConfigCommand() {
  p.intro(colors.primary.bold("🔌 Configure MCP Host"));

  try {
    const host = assertNotCancelled(
      await p.select({
        message: "Select the host application to configure:",
        options: [
          {
            value: "claude",
            label: "Claude Desktop",
            hint: "Standard Claude desktop app",
          },
          // { value: "cursor", label: "Cursor", hint: "AI-native code editor" },
        ],
      }),
    );

    if (host === "claude") {
      await configureClaudeDesktop();
    }
  } catch (error: unknown) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw CliError.system(`MCP config failed: ${message}`);
  }
}

async function configureClaudeDesktop() {
  const isWindows = process.platform === "win32";
  const configPath = isWindows
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

  if (!(await fs.pathExists(configPath))) {
    p.note(
      `Claude Desktop config not found at:
${colors.muted(configPath)}`,
      "Configuration Missing",
    );

    const create = assertNotCancelled(
      await p.confirm({
        message: "Do you want to create a new config file?",
        initialValue: true,
      }),
    );

    if (!create) return;
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, { mcpServers: {} }, { spaces: 2 });
  }

  const s = p.spinner();
  s.start("Updating Claude Desktop configuration...");

  const config = await fs.readJson(configPath);
  if (!config.mcpServers) config.mcpServers = {};

  const serverName = "yigyaps";
  const binaryPath = "npx";

  config.mcpServers[serverName] = {
    command: binaryPath,
    args: ["-y", "@yigyaps/cli", "dev-server"],
  };

  await fs.writeJson(configPath, config, { spaces: 2 });
  s.stop(`Successfully configured Claude Desktop!`);

  p.outro(`${colors.success("✨ Setup Complete!")}

Next Steps:
  ${colors.muted("1.")} Restart Claude Desktop
  ${colors.muted("2.")} Your YigYaps skills are now available in the local sandbox

${colors.muted("💡 Pro-tip: For marketplace skills, use 'yigyaps install'")}`);
}
