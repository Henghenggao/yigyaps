import { setConfig } from "../lib/config.js";
import { CliError } from "../lib/errors.js";
import { YigYapsRegistryClient } from "@yigyaps/client";
import { getConfig } from "../lib/config.js";
import { p, assertNotCancelled } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";

interface LoginOptions {
  apiKey?: string;
}

/**
 * Login Command
 */
export async function loginCommand(options: LoginOptions) {
  p.intro(colors.primary.bold("🔑 YigYaps CLI — Authentication"));

  let apiKey = options.apiKey;

  if (!apiKey) {
    p.note(`To login, please obtain an API Key from your YigYaps dashboard:
${colors.link("https://yigyaps.com/settings/api-keys")}`);

    apiKey = assertNotCancelled(
      await p.password({
        message: "Enter your API Key:",
        mask: "*",
        validate: (input: string | undefined) => {
          if (!input || !input.startsWith("yg_"))
            return "Invalid API key format. Should start with 'yg_'";
          return undefined;
        },
      }),
    );
  }

  const s = p.spinner();
  s.start("Verifying API Key...");

  try {
    // Verification step
    const testClient = new YigYapsRegistryClient({
      baseUrl: getConfig().registryUrl,
      apiKey: apiKey,
    });

    const user = await testClient.getMe();
    s.stop(`Authenticated as ${colors.primary(user.displayName)} (${user.id})`);

    // Persist
    setConfig("apiKey", apiKey);
    setConfig("lastLogin", new Date().toISOString());

    p.outro(
      colors.success(
        "Login successful! Your credentials have been saved locally.",
      ),
    );
  } catch {
    s.stop("Verification failed");
    throw CliError.network(
      "Login failed. Please check your API key and internet connection.",
    );
  }
}
