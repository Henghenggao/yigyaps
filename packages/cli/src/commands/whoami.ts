import { ensureAuthenticated } from "../lib/auth.js";
import { p } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";
import { panel, keyValue } from "../lib/ui/components.js";

/**
 * Whoami Command
 */
export async function whoamiCommand() {
  p.intro(colors.primary.bold("👤 Current Session"));

  try {
    const user = await ensureAuthenticated();

    const profile = keyValue({
      User: `${user.displayName} (${colors.accent(`@${user.githubUsername}`)})`,
      ID: colors.muted(user.id),
      Tier: user.tier.toUpperCase(),
      Role: user.role,
      Verified: user.isVerifiedCreator
        ? colors.success("Yes")
        : colors.muted("No"),
      Skills: String(user.totalPackages ?? 0),
      Earnings: colors.success(`$${user.totalEarningsUsd ?? "0.00"}`),
    });

    console.log(panel("Account Dashboard", profile));

    p.outro(
      colors.muted(
        `Logged in via GitHub. Run ${colors.primary("yigyaps logout")} to sign out.`,
      ),
    );
  } catch (error: unknown) {
    p.log.error("Authentication check failed. Please login again.");
    throw error;
  }
}
