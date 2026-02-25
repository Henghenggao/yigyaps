/**
 * Fastify type augmentation for YigYaps API
 * Declares custom properties added to the Fastify instance
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@yigyaps/db";

declare module "fastify" {
  interface FastifyInstance {
    db: NodePgDatabase<typeof schema>;
  }
}
