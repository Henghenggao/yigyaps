/**
 * @yigyaps/api — Public API
 *
 * Exports Fastify route plugins for use in custom server setups.
 * For standalone deployment, run server.ts directly.
 *
 * License: Apache 2.0
 */

export { packagesRoutes } from "./routes/packages.js";
export { installationsRoutes } from "./routes/installations.js";
export { reviewsRoutes } from "./routes/reviews.js";
export { mintsRoutes } from "./routes/mints.js";
export { registryRoutes, wellKnownRoutes } from "./routes/registry.js";
