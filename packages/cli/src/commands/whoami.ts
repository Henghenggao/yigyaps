import { ensureAuthenticated } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

/**
 * Whoami Command
 */
export async function whoamiCommand() {
    const user = await ensureAuthenticated();

    logger.info("YigYaps — Current Session");
    console.log(`\n👤 Logged in as: ${user.displayName} (@${user.githubUsername})`);
    console.log(`   ID:   ${user.id}`);
    console.log(`   Tier: ${user.tier}`);
    console.log(`   Role: ${user.role}`);
    console.log(`\n   Skills:   ${user.totalPackages ?? 0}`);
    console.log(`   Earnings: $${user.totalEarningsUsd ?? "0.00"}\n`);
}
