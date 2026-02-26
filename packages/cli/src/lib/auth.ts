import { getConfig, type ConfigSchema } from "./config.js";
import { CliError } from "./errors.js";
import { createRegistryClient } from "./registry.js";
import { type AuthUser } from "@yigyaps/client";

/**
 * Authentication Helpers
 */

/**
 * Ensures the user is authenticated.
 * Throws a CliError if not logged in.
 */
export async function ensureAuthenticated() {
  const { apiKey } = getConfig();
  if (!apiKey) {
    throw CliError.user("You are not logged in. Run 'yigyaps login' first.");
  }

  try {
    const client = createRegistryClient();
    // Validate current token/key by fetching user info
    const me = await client.getMe();
    return me as UserProfile;
  } catch {
    throw CliError.network(
      "Failed to verify authentication. Your login may have expired. Please login again.",
    );
  }
}

/**
 * Returns basic session info from local config without network check
 */
export function getSession(): ConfigSchema {
  return getConfig();
}

/**
 * Types for user information from the API
 */
export type UserProfile = AuthUser;
