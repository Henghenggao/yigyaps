import { clearConfig } from "../lib/config.js";
import { logger } from "../lib/logger.js";

/**
 * Logout Command
 */
export async function logoutCommand() {
  clearConfig();
  logger.success(
    "Logged out successfully. Local credentials have been cleared.",
  );
}
