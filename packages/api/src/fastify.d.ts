/**
 * Fastify type augmentation for YigYaps API
 * Declares custom properties added to the Fastify instance
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

declare module "fastify" {
  interface FastifyInstance {
    db: NodePgDatabase;
  }
}
