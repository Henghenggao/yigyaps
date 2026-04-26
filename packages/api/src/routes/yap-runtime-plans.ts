/**
 * YAP Runtime Plan Routes
 *
 * Produces non-executing runtime plans from resolved YAP assemblies.
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
import { planYapRuntime } from "../lib/yap-runtime-planner.js";

const yapParamsSchema = z.object({
  yapId: z.string().min(1),
});

const planQuerySchema = z.object({
  maxMounts: z.coerce.number().int().min(0).max(100).default(50),
});

const boundedStringArray = z.array(z.string().min(1).max(200)).max(25);

const runtimePlanBodySchema = z.object({
  task: z.string().min(1).max(4000),
  requiredSkills: boundedStringArray.optional(),
  expectedContractVersion: z.string().min(1).max(40).optional(),
  maxCandidates: z.number().int().min(1).max(25).default(5),
  hints: z
    .object({
      skillNames: boundedStringArray.optional(),
      mountKeys: boundedStringArray.optional(),
      routeKeys: boundedStringArray.optional(),
      toolKeys: boundedStringArray.optional(),
    })
    .optional(),
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

export async function yapRuntimePlanRoutes(fastify: FastifyInstance) {
  const yapDAL = new YapDAL(fastify.db);
  const packDAL = new SkillPackDAL(fastify.db);
  const mountDAL = new YapPackMountDAL(fastify.db);
  const artifactDAL = new SkillPackArtifactDAL(fastify.db);

  fastify.post<{
    Params: { yapId: string };
    Querystring: { maxMounts?: number };
  }>(
    "/:yapId/runtime-plans",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const paramsParsed = yapParamsSchema.safeParse(request.params);
      const queryParsed = planQuerySchema.safeParse(request.query);
      const bodyParsed = runtimePlanBodySchema.safeParse(request.body);
      if (!paramsParsed.success || !queryParsed.success || !bodyParsed.success) {
        const details = !paramsParsed.success
          ? paramsParsed.error.issues
          : !queryParsed.success
            ? queryParsed.error.issues
            : bodyParsed.success
              ? []
              : bodyParsed.error.issues;
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details,
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
      return reply.send(planYapRuntime(assembly, bodyParsed.data));
    },
  );
}
