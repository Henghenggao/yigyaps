/**
 * @yigyaps/client — Public API
 *
 * TypeScript/JavaScript SDK for the YigYaps open skill marketplace.
 *
 * @example
 * // Consumers: search and install skills
 * import { YigYapsRegistryClient } from "@yigyaps/client";
 * const client = new YigYapsRegistryClient();
 * const results = await client.search({ query: "github" });
 *
 * @example
 * // Publishers: publish skills (Yigstudio or third-party creators)
 * import { YigYapsPublisherClient } from "@yigyaps/client";
 * const publisher = new YigYapsPublisherClient({ apiKey: process.env.YIGYAPS_API_KEY });
 * await publisher.publishPackage({ packageId: "my-skill", displayName: "My Skill", ... });
 *
 * License: Apache 2.0
 */

export * from "./registry-client.js";
export * from "./publisher-client.js";
export * from "./security-client.js";
