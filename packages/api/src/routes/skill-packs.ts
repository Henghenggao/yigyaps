/**
 * Skill Pack Routes
 *
 * Nested under YAPs because Skill Packs are assembled inside a YAP container.
 *
 * License: Apache 2.0
 */

import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { z } from "zod";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  SkillPackArtifactDAL,
  SkillPackDAL,
  YapDAL,
  type SkillPackArtifactInsert,
  type SkillPackArtifactRow,
  type YapRow,
} from "@yigyaps/db";
import * as schema from "@yigyaps/db";
import { optionalAuth, requireAuth } from "../middleware/auth-v2.js";

const artifactTypeSchema = z.enum([
  "skillpack",
  "tool-map",
  "routes",
  "feedback",
  "update",
  "schema",
  "command",
  "skill-md",
  "other",
]);

const artifactPathSchema = z
  .string()
  .min(1)
  .max(500)
  .refine(
    (value) =>
      !value.includes("\0") &&
      !value.startsWith("/") &&
      !value.startsWith("\\") &&
      !/^[a-zA-Z]:[\\/]/.test(value) &&
      !value.split(/[\\/]/).includes(".."),
    "Artifact path must be relative and cannot contain traversal segments",
  );

const createArtifactSchema = z.object({
  artifactType: artifactTypeSchema,
  artifactPath: artifactPathSchema,
  mediaType: z.string().min(1).max(100).default("application/json"),
  content: z.unknown(),
});

const createSkillPackSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9-]{0,118}[a-z0-9]$/),
  version: z.string().min(1).max(40),
  displayName: z.string().min(1).max(200),
  description: z.string().min(10).max(1000),
  packType: z.enum(["core", "extension"]).default("extension"),
  contractVersion: z.string().min(1).max(40).default("1.0"),
  compatibility: z.record(z.string(), z.unknown()).default({}),
  manifest: z.record(z.string(), z.unknown()),
  source: z.enum(["manual", "imported", "generated"]).default("manual"),
  status: z.enum(["draft", "active"]).default("active"),
  artifacts: z.array(createArtifactSchema).max(500).default([]),
});

const yapParamsSchema = z.object({
  yapId: z.string().min(1),
});

const packParamsSchema = yapParamsSchema.extend({
  packId: z.string().min(1),
});

const artifactParamsSchema = packParamsSchema.extend({
  artifactId: z.string().min(1),
});

const listArtifactsQuerySchema = z.object({
  artifactType: artifactTypeSchema.optional(),
});

type AccessUser = {
  userId: string;
  role: "user" | "admin";
};

function canReadYap(yap: YapRow, user?: AccessUser): boolean {
  if (user?.role === "admin" || user?.userId === yap.ownerId) return true;
  return yap.status === "active" && yap.visibility !== "private";
}

function canWriteYap(yap: YapRow, user?: AccessUser): boolean {
  return Boolean(user && (user.role === "admin" || user.userId === yap.ownerId));
}

function artifactHash(content: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
}

function normalizeArtifactPath(path: string): string {
  return path.replaceAll("\\", "/");
}

async function resolveYap(yapId: string, yapDAL: YapDAL): Promise<YapRow | null> {
  return yapId.startsWith("yap_")
    ? await yapDAL.getById(yapId)
    : await yapDAL.getBySlug(yapId);
}

function toArtifactInsert(
  skillPackId: string,
  now: number,
  artifact: z.infer<typeof createArtifactSchema>,
): SkillPackArtifactInsert {
  const normalizedPath = normalizeArtifactPath(artifact.artifactPath);
  return {
    id: `spa_${now}_${crypto.randomBytes(4).toString("hex")}`,
    skillPackId,
    artifactType: artifact.artifactType,
    artifactPath: normalizedPath,
    mediaType: artifact.mediaType,
    content: artifact.content,
    contentSha256: artifactHash(artifact.content),
    createdAt: now,
    updatedAt: now,
  };
}

function ensureNoDuplicateArtifacts(
  artifacts: Array<z.infer<typeof createArtifactSchema>>,
): string | null {
  const seen = new Set<string>();
  for (const artifact of artifacts) {
    const key = `${artifact.artifactType}:${normalizeArtifactPath(artifact.artifactPath)}`;
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}

export async function skillPacksRoutes(fastify: FastifyInstance) {
  const yapDAL = new YapDAL(fastify.db);
  const packDAL = new SkillPackDAL(fastify.db);
  const artifactDAL = new SkillPackArtifactDAL(fastify.db);

  fastify.post<{ Params: { yapId: string } }>(
    "/:yapId/skill-packs",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = yapParamsSchema.safeParse(request.params);
      const bodyParsed = createSkillPackSchema.safeParse(request.body);
      if (!paramsParsed.success || !bodyParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: paramsParsed.success
            ? bodyParsed.error?.issues
            : paramsParsed.error.issues,
        });
      }

      const yap = await resolveYap(paramsParsed.data.yapId, yapDAL);
      if (!yap) return reply.code(404).send({ error: "YAP not found" });
      if (!canWriteYap(yap, request.user)) {
        return reply.code(403).send({ error: "Not authorized to update this YAP" });
      }

      const body = bodyParsed.data;
      const existing = await packDAL.getByNameVersion(
        yap.id,
        body.name,
        body.version,
      );
      if (existing) {
        return reply.code(409).send({
          error: "Skill Pack version already exists",
          name: body.name,
          version: body.version,
        });
      }

      const duplicate = ensureNoDuplicateArtifacts([
        {
          artifactType: "skillpack",
          artifactPath: "skillpack.json",
          mediaType: "application/json",
          content: body.manifest,
        },
        ...body.artifacts,
      ]);
      if (duplicate) {
        return reply.code(400).send({
          error: "Duplicate artifact",
          artifact: duplicate,
        });
      }

      const now = Date.now();
      const skillPackId = `spack_${now}_${crypto.randomBytes(4).toString("hex")}`;
      const result = await fastify.db.transaction(
        async (tx: NodePgDatabase<typeof schema>) => {
          const packDALTx = new SkillPackDAL(tx);
          const artifactDALTx = new SkillPackArtifactDAL(tx);

          const skillPack = await packDALTx.create({
            id: skillPackId,
            yapId: yap.id,
            name: body.name,
            version: body.version,
            displayName: body.displayName,
            description: body.description,
            packType: body.packType,
            contractVersion: body.contractVersion,
            compatibility: body.compatibility,
            manifest: body.manifest,
            source: body.source,
            status: body.status,
            createdAt: now,
            updatedAt: now,
            releasedAt: now,
          });

          const artifacts = [
            toArtifactInsert(skillPack.id, now, {
              artifactType: "skillpack",
              artifactPath: "skillpack.json",
              mediaType: "application/json",
              content: body.manifest,
            }),
            ...body.artifacts.map((artifact) =>
              toArtifactInsert(skillPack.id, now, artifact),
            ),
          ];

          const savedArtifacts = await artifactDALTx.createMany(artifacts);
          return { skillPack, artifacts: savedArtifacts };
        },
      );

      reply.header(
        "Location",
        `/v1/yaps/${yap.id}/skill-packs/${result.skillPack.id}`,
      );
      return reply.code(201).send(result);
    },
  );

  fastify.get<{ Params: { yapId: string } }>(
    "/:yapId/skill-packs",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const paramsParsed = yapParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: paramsParsed.error.issues,
        });
      }

      const yap = await resolveYap(paramsParsed.data.yapId, yapDAL);
      if (!yap || !canReadYap(yap, request.user)) {
        return reply.code(404).send({ error: "YAP not found" });
      }

      const skillPacks = await packDAL.listByYap(yap.id);
      return reply.send({ skillPacks, total: skillPacks.length });
    },
  );

  fastify.get<{ Params: { yapId: string; packId: string } }>(
    "/:yapId/skill-packs/:packId",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const paramsParsed = packParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: paramsParsed.error.issues,
        });
      }

      const yap = await resolveYap(paramsParsed.data.yapId, yapDAL);
      if (!yap || !canReadYap(yap, request.user)) {
        return reply.code(404).send({ error: "YAP not found" });
      }

      const skillPack = await packDAL.getById(paramsParsed.data.packId);
      if (!skillPack || skillPack.yapId !== yap.id) {
        return reply.code(404).send({ error: "Skill Pack not found" });
      }

      return reply.send(skillPack);
    },
  );

  fastify.get<{
    Params: { yapId: string; packId: string };
    Querystring: { artifactType?: SkillPackArtifactRow["artifactType"] };
  }>(
    "/:yapId/skill-packs/:packId/artifacts",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const paramsParsed = packParamsSchema.safeParse(request.params);
      const queryParsed = listArtifactsQuerySchema.safeParse(request.query);
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

      const skillPack = await packDAL.getById(paramsParsed.data.packId);
      if (!skillPack || skillPack.yapId !== yap.id) {
        return reply.code(404).send({ error: "Skill Pack not found" });
      }

      const artifacts = await artifactDAL.listBySkillPack(
        skillPack.id,
        queryParsed.data.artifactType,
      );
      return reply.send({ artifacts, total: artifacts.length });
    },
  );

  fastify.get<{ Params: { yapId: string; packId: string; artifactId: string } }>(
    "/:yapId/skill-packs/:packId/artifacts/:artifactId",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const paramsParsed = artifactParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: paramsParsed.error.issues,
        });
      }

      const yap = await resolveYap(paramsParsed.data.yapId, yapDAL);
      if (!yap || !canReadYap(yap, request.user)) {
        return reply.code(404).send({ error: "YAP not found" });
      }

      const skillPack = await packDAL.getById(paramsParsed.data.packId);
      if (!skillPack || skillPack.yapId !== yap.id) {
        return reply.code(404).send({ error: "Skill Pack not found" });
      }

      const artifact = await artifactDAL.getById(paramsParsed.data.artifactId);
      if (!artifact || artifact.skillPackId !== skillPack.id) {
        return reply.code(404).send({ error: "Artifact not found" });
      }

      return reply.send(artifact);
    },
  );
}
