import { getConfig } from "./config.js";
import { YigYapsRegistryClient, YigYapsPublisherClient } from "@yigyaps/client";

/**
 * Registry Client Factory
 */
export function createRegistryClient(): YigYapsRegistryClient {
    const config = getConfig();
    return new YigYapsRegistryClient({
        baseUrl: config.registryUrl,
        apiKey: config.apiKey,
    });
}

/**
 * Publisher Client Factory
 */
export function createPublisherClient(): YigYapsPublisherClient {
    const config = getConfig();
    if (!config.apiKey) {
        throw new Error("Authentication required. Please run 'yigyaps login' first.");
    }
    return new YigYapsPublisherClient({
        baseUrl: config.registryUrl,
        apiKey: config.apiKey,
    });
}
