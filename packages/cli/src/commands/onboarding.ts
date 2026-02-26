import { p, assertNotCancelled } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";
import { renderBanner } from "../lib/ui/banner.js";
import { loginCommand } from "./login.js";
import { mcpConfigCommand } from "./mcp.js";
import { updateConfig } from "../lib/config.js";

/**
 * Guided Onboarding Flow
 */
export async function onboardingCommand() {
  renderBanner();

  p.intro(colors.primary.bold("Welcome to YigYaps! 🚀"));

  p.note(
    `YigYaps is the ultimate ecosystem for AI-powered skills.
We'll help you get set up in just a few steps.`,
    "Guided Setup",
  );

  // 1. Login
  const doLogin = assertNotCancelled(
    await p.confirm({
      message: "Step 1: Authenticate with GitHub. Ready to login?",
      initialValue: true,
    }),
  );

  if (doLogin) {
    await loginCommand({});
  } else {
    p.log.warn(
      "Skipping login. You can browse skills, but publishing/installing requires auth.",
    );
  }

  // 2. MCP Setup
  const setupMcp = assertNotCancelled(
    await p.confirm({
      message:
        "Step 2: Configure MCP Host (Claude Desktop). Would you like to do this now?",
      initialValue: true,
    }),
  );

  if (setupMcp) {
    await mcpConfigCommand();
  }

  // 3. Mark onboarding as complete
  updateConfig({ firstRun: false });

  p.outro(`${colors.success("🎉 You're all set!")}
    
${colors.muted("Try running")} ${colors.primary("yigyaps")} ${colors.muted("to see the main menu.")}
${colors.muted("Or search for skills with")} ${colors.primary("yigyaps search <query>")}`);
}
