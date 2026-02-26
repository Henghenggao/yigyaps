import { setConfig } from "../lib/config.js";
import { logger } from "../lib/logger.js";
import { CliError } from "../lib/errors.js";
import { YigYapsRegistryClient } from "@yigyaps/client";
import { getConfig } from "../lib/config.js";

interface LoginOptions {
    apiKey?: string;
}

/**
 * Login Command
 * 
 * MVP: Support manual API key entry.
 */
export async function loginCommand(options: LoginOptions) {
    let apiKey = options.apiKey;

    if (!apiKey) {
        logger.info("YigYaps CLI — Authentication");
        console.log("\nTo login, please obtain an API Key from your YigYaps dashboard:");
        console.log("👉 https://yigyaps.com/settings/api-keys\n");

        const inquirer = (await import("inquirer")).default;
        const answers = await inquirer.prompt([
            {
                type: "password",
                name: "apiKey",
                message: "Enter your API Key:",
                mask: "*",
                validate: (input: string) => input.startsWith("yg_") || "Invalid API key format. Should start with 'yg_'",
            },
        ]);
        apiKey = answers.apiKey;
    }

    try {
        const ora = (await import("ora")).default;
        const spinner = ora("Verifying API Key...").start();

        // Verification step
        const testClient = new YigYapsRegistryClient({
            baseUrl: getConfig().registryUrl,
            apiKey: apiKey
        });

        const user = await testClient.getMe();
        spinner.succeed(`Authenticated as ${user.displayName} (@${user.githubUsername})`);

        // Persist
        setConfig("apiKey", apiKey);
        setConfig("lastLogin", new Date().toISOString());

        logger.success("Login successful! Your credentials have been saved locally.");
    } catch {
        throw CliError.network("Login failed. Please check your API key and internet connection.");
    }
}
