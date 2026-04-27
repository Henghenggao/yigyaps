/**
 * YAP Import Routes
 *
 * Read-only preview endpoints for staging external product repositories before
 * creating YAP containers and SkillPacks.
 *
 * License: Apache 2.0
 */

import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  SkillPackArtifactDAL,
  SkillPackDAL,
  YapDAL,
  YapPackMountDAL,
  type SkillPackArtifactInsert,
  type SkillPackRow,
  type YapRow,
} from "@yigyaps/db";
import * as schema from "@yigyaps/db";
import type {
  YapImportExecuteResult,
  YapImportExecutePackResult,
} from "@yigyaps/types";
import { requireAuth } from "../middleware/auth-v2.js";
import {
  ImportPreviewError,
  planYigfinanceImportExecution,
  previewYigfinanceImport,
  type YigfinanceImportPackPlan,
} from "../lib/yigfinance-import-preview.js";

const previewBodySchema = z.object({
  format: z.literal("yigfinance").default("yigfinance"),
  sourceDir: z.string().min(1).max(1000),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/)
    .optional(),
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(1000).optional(),
  includeDefaultExtensions: z.boolean().default(true),
  defaultExtensionMountKey: z.string().min(1).max(120).optional(),
});

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "h3",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ["src", "alt", "title", "width", "height"],
    a: ["href", "name", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

export async function yapImportRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/preview",
    {
      preHandler: requireAuth(),
      config: { rateLimit: { max: 12, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = previewBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: parsed.error.issues,
        });
      }

      try {
        const preview = await previewYigfinanceImport(parsed.data);
        reply.header("Cache-Control", "no-store");
        return reply.send(preview);
      } catch (error) {
        if (error instanceof ImportPreviewError) {
          return reply.code(error.statusCode).send({
            error: error.code,
            message: error.message,
            details: error.details,
          });
        }

        throw error;
      }
    },
  );

  fastify.post(
    "/execute",
    {
      preHandler: requireAuth(),
      config: { rateLimit: { max: 6, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const parsed = previewBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: parsed.error.issues,
        });
      }

      try {
        const plan = await planYigfinanceImportExecution(parsed.data);
        const result = await fastify.db.transaction(
          async (tx: NodePgDatabase<typeof schema>) => {
            const yapDAL = new YapDAL(tx);
            const packDAL = new SkillPackDAL(tx);
            const artifactDAL = new SkillPackArtifactDAL(tx);
            const mountDAL = new YapPackMountDAL(tx);
            const now = Date.now();
            const existingYap = await yapDAL.getBySlug(plan.yap.slug);
            let yap: YapRow;
            let yapAction: YapImportExecuteResult["yapAction"];

            if (existingYap) {
              if (
                request.user?.role !== "admin" &&
                existingYap.ownerId !== request.user?.userId
              ) {
                throw new ImportPreviewError(
                  403,
                  "yap_not_owned",
                  "Existing YAP slug belongs to another creator",
                );
              }
              const updated = await yapDAL.update(existingYap.id, {
                version: plan.yap.version,
                displayName: plan.yap.displayName,
                description: plan.yap.description,
                readme: plan.yap.readme
                  ? sanitizeHtml(plan.yap.readme, sanitizeOptions)
                  : null,
                category: plan.yap.category,
                tags: plan.yap.tags,
                visibility: plan.yap.visibility,
                status: plan.yap.status,
                assemblyConfig: plan.yap.assemblyConfig,
                releasedAt: now,
              });
              if (!updated) {
                throw new Error("Failed to update existing YAP");
              }
              yap = updated;
              yapAction = "updated";
            } else {
              yap = await yapDAL.create({
                id: `yap_${now}_${crypto.randomBytes(4).toString("hex")}`,
                slug: plan.yap.slug,
                version: plan.yap.version,
                displayName: plan.yap.displayName,
                description: plan.yap.description,
                readme: plan.yap.readme
                  ? sanitizeHtml(plan.yap.readme, sanitizeOptions)
                  : null,
                ownerId: request.user!.userId,
                ownerName: request.user!.userName,
                category: plan.yap.category,
                tags: plan.yap.tags,
                visibility: plan.yap.visibility,
                status: plan.yap.status,
                assemblyConfig: plan.yap.assemblyConfig,
                createdAt: now,
                updatedAt: now,
                releasedAt: now,
              });
              yapAction = "created";
            }

            const corePack = await upsertSkillPack({
              yap,
              packPlan: plan.skillPack,
              packDAL,
              artifactDAL,
              now,
            });
            const extensionPacks = [];
            for (const extensionPack of plan.extensionPacks) {
              extensionPacks.push(
                await upsertSkillPack({
                  yap,
                  packPlan: extensionPack,
                  packDAL,
                  artifactDAL,
                  now,
                }),
              );
            }

            const defaultMounts = [];
            for (const mountPlan of plan.defaultMounts) {
              const extension = extensionPacks.find(
                (pack) =>
                  pack.name === mountPlan.skillPackName &&
                  pack.version === mountPlan.skillPackVersion,
              );
              if (!extension) continue;

              const existingMount = await mountDAL.getByMountKey(
                yap.id,
                mountPlan.mountKey,
              );
              if (existingMount) {
                const updated = await mountDAL.update(existingMount.id, {
                  skillPackId: extension.id,
                  mountPoint: mountPlan.mountPoint,
                  displayName: mountPlan.displayName,
                  priority: mountPlan.priority,
                  enabled: mountPlan.enabled,
                  required: mountPlan.required,
                  config: mountPlan.config,
                  constraints: mountPlan.constraints,
                });
                if (!updated) throw new Error("Failed to update default mount");
                defaultMounts.push({
                  id: updated.id,
                  mountKey: updated.mountKey,
                  mountPoint: updated.mountPoint,
                  skillPackId: updated.skillPackId,
                  action: "updated" as const,
                });
              } else {
                const mount = await mountDAL.create({
                  id: `ymnt_${now}_${crypto.randomBytes(4).toString("hex")}`,
                  yapId: yap.id,
                  skillPackId: extension.id,
                  mountKey: mountPlan.mountKey,
                  mountPoint: mountPlan.mountPoint,
                  displayName: mountPlan.displayName,
                  priority: mountPlan.priority,
                  enabled: mountPlan.enabled,
                  required: mountPlan.required,
                  config: mountPlan.config,
                  constraints: mountPlan.constraints,
                  createdAt: now,
                  updatedAt: now,
                });
                defaultMounts.push({
                  id: mount.id,
                  mountKey: mount.mountKey,
                  mountPoint: mount.mountPoint,
                  skillPackId: mount.skillPackId,
                  action: "created" as const,
                });
              }
            }

            return {
              success: true,
              preview: plan.preview,
              yap: {
                id: yap.id,
                slug: yap.slug,
                version: yap.version,
                displayName: yap.displayName,
              },
              yapAction,
              corePack,
              extensionPacks,
              defaultMounts,
              assemblyUrl: `/v1/yaps/${encodeURIComponent(yap.slug)}/assembly`,
            } satisfies YapImportExecuteResult;
          },
        );

        reply.header("Cache-Control", "no-store");
        reply.header("Location", result.assemblyUrl);
        return reply.code(result.yapAction === "created" ? 201 : 200).send(result);
      } catch (error) {
        if (error instanceof ImportPreviewError) {
          return reply.code(error.statusCode).send({
            error: error.code,
            message: error.message,
            details: error.details,
          });
        }

        throw error;
      }
    },
  );
}

async function upsertSkillPack(params: {
  yap: YapRow;
  packPlan: YigfinanceImportPackPlan;
  packDAL: SkillPackDAL;
  artifactDAL: SkillPackArtifactDAL;
  now: number;
}): Promise<YapImportExecutePackResult> {
  const existing = await params.packDAL.getByNameVersion(
    params.yap.id,
    params.packPlan.name,
    params.packPlan.version,
  );
  const skillPackId =
    existing?.id ??
    `spack_${params.now}_${crypto.randomBytes(4).toString("hex")}`;
  const packData = {
    yapId: params.yap.id,
    name: params.packPlan.name,
    version: params.packPlan.version,
    displayName: params.packPlan.displayName,
    description: params.packPlan.description,
    packType: params.packPlan.packType,
    contractVersion: params.packPlan.contractVersion,
    compatibility: params.packPlan.compatibility,
    manifest: params.packPlan.manifest,
    source: params.packPlan.source,
    status: params.packPlan.status,
    releasedAt: params.now,
  };

  let skillPack: SkillPackRow;
  let action: YapImportExecutePackResult["action"];
  if (existing) {
    const updated = await params.packDAL.update(existing.id, packData);
    if (!updated) throw new Error("Failed to update SkillPack");
    await params.artifactDAL.deleteBySkillPack(existing.id);
    skillPack = updated;
    action = "updated";
  } else {
    skillPack = await params.packDAL.create({
      id: skillPackId,
      ...packData,
      createdAt: params.now,
      updatedAt: params.now,
    });
    action = "created";
  }

  const artifacts = buildSkillPackArtifacts(
    skillPack.id,
    params.now,
    params.packPlan.manifest,
    params.packPlan.artifacts,
  );
  await params.artifactDAL.createMany(artifacts);

  return {
    id: skillPack.id,
    name: skillPack.name,
    version: skillPack.version,
    packType: skillPack.packType,
    action,
    artifactCount: artifacts.length,
  };
}

function buildSkillPackArtifacts(
  skillPackId: string,
  now: number,
  manifest: Record<string, unknown>,
  artifacts: YigfinanceImportPackPlan["artifacts"],
): SkillPackArtifactInsert[] {
  return [
    toArtifactInsert(skillPackId, now, {
      artifactType: "skillpack",
      artifactPath: "skillpack.json",
      mediaType: "application/json",
      content: manifest,
    }),
    ...artifacts.map((artifact) => toArtifactInsert(skillPackId, now, artifact)),
  ];
}

function toArtifactInsert(
  skillPackId: string,
  now: number,
  artifact: YigfinanceImportPackPlan["artifacts"][number],
): SkillPackArtifactInsert {
  return {
    id: `spa_${now}_${crypto.randomBytes(4).toString("hex")}`,
    skillPackId,
    artifactType: artifact.artifactType,
    artifactPath: artifact.artifactPath.replaceAll("\\", "/"),
    mediaType: artifact.mediaType,
    content: artifact.content,
    contentSha256: crypto
      .createHash("sha256")
      .update(JSON.stringify(artifact.content))
      .digest("hex"),
    createdAt: now,
    updatedAt: now,
  };
}
