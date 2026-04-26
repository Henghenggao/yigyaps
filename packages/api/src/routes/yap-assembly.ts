/**
 * YAP Assembly Routes
 *
 * Exposes the resolved read model for a YAP's core Skill Pack plus enabled
 * mounted extension packs.
 *
 * License: Apache 2.0
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  SkillPackArtifactDAL,
  SkillPackDAL,
  YapDAL,
  YapPackMountDAL,
  type YapRow,
} from "@yigyaps/db";
import { optionalAuth } from "../middleware/auth-v2.js";
import { resolveYapAssembly } from "../lib/yap-assembly-resolver.js";
import { selectCoreSkillPack } from "../lib/yap-core-pack.js";

const yapParamsSchema = z.object({
  yapId: z.string().min(1),
});

const assemblyQuerySchema = z.object({
  maxMounts: z.coerce.number().int().min(0).max(100).default(50),
});

type AccessUser = {
  userId: string;
  role: "user" | "admin";
};

function canReadYap(yap: YapRow, user?: AccessUser): boolean {
  if (user?.role === "admin" || user?.userId === yap.ownerId) return true;
  return yap.status === "active" && yap.visibility !== "private";
}

async function resolveYap(yapId: string, yapDAL: YapDAL): Promise<YapRow | null> {
  return yapId.startsWith("yap_")
    ? await yapDAL.getById(yapId)
    : await yapDAL.getBySlug(yapId);
}

export async function yapAssemblyRoutes(fastify: FastifyInstance) {
  const yapDAL = new YapDAL(fastify.db);
  const packDAL = new SkillPackDAL(fastify.db);
  const mountDAL = new YapPackMountDAL(fastify.db);
  const artifactDAL = new SkillPackArtifactDAL(fastify.db);

  fastify.get<{ Params: { yapId: string }; Querystring: { maxMounts?: number } }>(
    "/:yapId/assembly",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const paramsParsed = yapParamsSchema.safeParse(request.params);
      const queryParsed = assemblyQuerySchema.safeParse(request.query);
      if (!paramsParsed.success || !queryParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: paramsParsed.success
            ? queryParsed.error?.issues
            : paramsParsed.error.issues,
        });
      }

      const yap = await resolveYap(paramsParsed.data.yapId, yapDAL);
      if (!yap || !canReadYap(yap, request.user)) {
        return reply.code(404).send({ error: "YAP not found" });
      }

      const maxMounts = queryParsed.data.maxMounts;
      const [skillPacks, mountsResult] = await Promise.all([
        packDAL.listByYap(yap.id),
        mountDAL.listByYap(yap.id, {
          enabled: true,
          limit: maxMounts,
          offset: 0,
        }),
      ]);

      if (mountsResult.total > maxMounts) {
        return reply.code(409).send({
          error: "Assembly has too many mounted packs",
          total: mountsResult.total,
          maxMounts,
        });
      }

      const corePack = selectCoreSkillPack(yap, skillPacks);
      if (!corePack) {
        return reply.code(409).send({
          error: "YAP core Skill Pack not found",
          yapId: yap.id,
        });
      }

      const [coreArtifacts, mountedArtifacts] = await Promise.all([
        artifactDAL.listBySkillPack(corePack.id),
        Promise.all(
          mountsResult.mounts.map(({ skillPack }) =>
            artifactDAL.listBySkillPack(skillPack.id),
          ),
        ),
      ]);

      const assembly = resolveYapAssembly({
        yap,
        corePack: {
          role: "core",
          mount: null,
          skillPack: corePack,
          artifacts: coreArtifacts,
        },
        mountedPacks: mountsResult.mounts.map((mounted, index) => ({
          role: "mount",
          mount: mounted.mount,
          skillPack: mounted.skillPack,
          artifacts: mountedArtifacts[index] ?? [],
        })),
      });

      reply.header("Cache-Control", "no-store");
      return reply.send(assembly);
    },
  );
}
