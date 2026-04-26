/**
 * YAP Pack Mount Routes
 *
 * Mounts make extension Skill Packs data-driven parts of a YAP assembly.
 *
 * License: Apache 2.0
 */

import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { z } from "zod";
import {
  SkillPackArtifactDAL,
  SkillPackDAL,
  YapDAL,
  YapPackMountDAL,
  type SkillPackRow,
  type YapPackMountRow,
  type YapRow,
} from "@yigyaps/db";
import { optionalAuth, requireAuth } from "../middleware/auth-v2.js";
import { selectCoreSkillPack } from "../lib/yap-core-pack.js";
import { validateYapMountCandidate } from "../lib/yap-mount-validation.js";

const mountKeySchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/);

const mountPointSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9](?:[a-z0-9-/:]{0,118}[a-z0-9])?$/);

const createMountSchema = z.object({
  skillPackId: z.string().min(1),
  mountKey: mountKeySchema,
  mountPoint: mountPointSchema.default("extensions"),
  displayName: z.string().min(1).max(200).optional(),
  priority: z.number().int().min(0).max(10_000).default(100),
  enabled: z.boolean().default(true),
  required: z.boolean().default(false),
  config: z.record(z.string(), z.unknown()).default({}),
  constraints: z.record(z.string(), z.unknown()).default({}),
});

const updateMountSchema = z
  .object({
    skillPackId: z.string().min(1).optional(),
    mountKey: mountKeySchema.optional(),
    mountPoint: mountPointSchema.optional(),
    displayName: z.string().min(1).max(200).optional(),
    priority: z.number().int().min(0).max(10_000).optional(),
    enabled: z.boolean().optional(),
    required: z.boolean().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    constraints: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean().optional());

const listMountsQuerySchema = z.object({
  enabled: booleanQuerySchema,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const mountValidationSchema = z.object({
  skillPackId: z.string().min(1),
  mountKey: mountKeySchema,
  replacingMountId: z.string().min(1).optional(),
  mountPoint: mountPointSchema.default("extensions"),
  displayName: z.string().min(1).max(200).optional(),
  priority: z.number().int().min(0).max(10_000).default(100),
  enabled: z.boolean().default(true),
  required: z.boolean().default(false),
  config: z.record(z.string(), z.unknown()).default({}),
  constraints: z.record(z.string(), z.unknown()).default({}),
});

const yapParamsSchema = z.object({
  yapId: z.string().min(1),
});

const mountParamsSchema = yapParamsSchema.extend({
  mountId: z.string().min(1),
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

async function resolveYap(yapId: string, yapDAL: YapDAL): Promise<YapRow | null> {
  return yapId.startsWith("yap_")
    ? await yapDAL.getById(yapId)
    : await yapDAL.getBySlug(yapId);
}

async function resolveMountablePack(
  skillPackId: string,
  yap: YapRow,
  packDAL: SkillPackDAL,
): Promise<SkillPackRow | "missing" | "wrong-yap" | "not-extension" | "archived"> {
  const skillPack = await packDAL.getById(skillPackId);
  if (!skillPack) return "missing";
  if (skillPack.yapId !== yap.id) return "wrong-yap";
  if (skillPack.packType !== "extension") return "not-extension";
  if (skillPack.status === "archived") return "archived";
  return skillPack;
}

function mountResponse(mount: YapPackMountRow, skillPack: SkillPackRow) {
  return { mount, skillPack };
}

export async function yapMountsRoutes(fastify: FastifyInstance) {
  const yapDAL = new YapDAL(fastify.db);
  const packDAL = new SkillPackDAL(fastify.db);
  const mountDAL = new YapPackMountDAL(fastify.db);
  const artifactDAL = new SkillPackArtifactDAL(fastify.db);

  async function buildMountValidation(params: {
    yap: YapRow;
    skillPack: SkillPackRow;
    mountKey: string;
    replacingMountId?: string;
    mountPoint: string;
    displayName?: string;
    priority: number;
    enabled: boolean;
    required: boolean;
    config: Record<string, unknown>;
    constraints: Record<string, unknown>;
  }) {
    const now = Date.now();
    const candidateMount: YapPackMountRow = {
      id: params.replacingMountId ?? `ymnt_candidate_${now}`,
      yapId: params.yap.id,
      skillPackId: params.skillPack.id,
      mountKey: params.mountKey,
      mountPoint: params.mountPoint,
      displayName: params.displayName ?? params.skillPack.displayName,
      priority: params.priority,
      enabled: params.enabled,
      required: params.required,
      config: params.config,
      constraints: params.constraints,
      createdAt: now,
      updatedAt: now,
    };

    const [skillPacks, mountsResult] = await Promise.all([
      packDAL.listByYap(params.yap.id),
      mountDAL.listByYap(params.yap.id, {
        enabled: true,
        limit: 100,
        offset: 0,
      }),
    ]);

    const corePack = selectCoreSkillPack(params.yap, skillPacks);
    const existingMounts = mountsResult.mounts.filter(
      ({ mount }) => mount.id !== params.replacingMountId,
    );
    const [coreArtifacts, candidateArtifacts, existingArtifacts] =
      await Promise.all([
        corePack ? artifactDAL.listBySkillPack(corePack.id) : Promise.resolve([]),
        artifactDAL.listBySkillPack(params.skillPack.id),
        Promise.all(
          existingMounts.map(({ skillPack }) =>
            artifactDAL.listBySkillPack(skillPack.id),
          ),
        ),
      ]);

    return validateYapMountCandidate({
      yap: params.yap,
      corePack,
      coreArtifacts,
      existingMounts: existingMounts.map((item, index) => ({
        mount: item.mount,
        skillPack: item.skillPack,
        artifacts: existingArtifacts[index] ?? [],
      })),
      candidateMount,
      candidatePack: params.skillPack,
      candidateArtifacts,
      replacingMountId: params.replacingMountId,
    });
  }

  fastify.post<{ Params: { yapId: string } }>(
    "/:yapId/mount-validations",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = yapParamsSchema.safeParse(request.params);
      const bodyParsed = mountValidationSchema.safeParse(request.body);
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
      const skillPack = await resolveMountablePack(body.skillPackId, yap, packDAL);
      if (skillPack === "missing" || skillPack === "wrong-yap") {
        return reply.code(404).send({ error: "Skill Pack not found" });
      }
      if (skillPack === "not-extension") {
        return reply
          .code(400)
          .send({ error: "Only extension Skill Packs can be mounted" });
      }
      if (skillPack === "archived") {
        return reply
          .code(409)
          .send({ error: "Archived Skill Packs cannot be mounted" });
      }

      if (body.replacingMountId) {
        const replacingMount = await mountDAL.getById(body.replacingMountId);
        if (!replacingMount || replacingMount.yapId !== yap.id) {
          return reply.code(404).send({ error: "Mount not found" });
        }
      }

      const validation = await buildMountValidation({
        yap,
        skillPack,
        mountKey: body.mountKey,
        replacingMountId: body.replacingMountId,
        mountPoint: body.mountPoint,
        displayName: body.displayName,
        priority: body.priority,
        enabled: body.enabled,
        required: body.required,
        config: body.config,
        constraints: body.constraints,
      });

      return reply.send(validation);
    },
  );

  fastify.post<{ Params: { yapId: string } }>(
    "/:yapId/mounts",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = yapParamsSchema.safeParse(request.params);
      const bodyParsed = createMountSchema.safeParse(request.body);
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
      const skillPack = await resolveMountablePack(body.skillPackId, yap, packDAL);
      if (skillPack === "missing" || skillPack === "wrong-yap") {
        return reply.code(404).send({ error: "Skill Pack not found" });
      }
      if (skillPack === "not-extension") {
        return reply
          .code(400)
          .send({ error: "Only extension Skill Packs can be mounted" });
      }
      if (skillPack === "archived") {
        return reply
          .code(409)
          .send({ error: "Archived Skill Packs cannot be mounted" });
      }

      const existing = await mountDAL.getByMountKey(yap.id, body.mountKey);
      if (existing) {
        return reply.code(409).send({
          error: "Mount key already exists",
          mountKey: body.mountKey,
        });
      }

      if (body.enabled) {
        const validation = await buildMountValidation({
          yap,
          skillPack,
          mountKey: body.mountKey,
          mountPoint: body.mountPoint,
          displayName: body.displayName,
          priority: body.priority,
          enabled: body.enabled,
          required: body.required,
          config: body.config,
          constraints: body.constraints,
        });
        if (validation.status === "blocked") {
          return reply.code(409).send({
            error: "Mount validation failed",
            validation,
          });
        }
      }

      const now = Date.now();
      const mount = await mountDAL.create({
        id: `ymnt_${now}_${crypto.randomBytes(4).toString("hex")}`,
        yapId: yap.id,
        skillPackId: skillPack.id,
        mountKey: body.mountKey,
        mountPoint: body.mountPoint,
        displayName: body.displayName ?? skillPack.displayName,
        priority: body.priority,
        enabled: body.enabled,
        required: body.required,
        config: body.config,
        constraints: body.constraints,
        createdAt: now,
        updatedAt: now,
      });

      reply.header("Location", `/v1/yaps/${yap.id}/mounts/${mount.id}`);
      return reply.code(201).send(mountResponse(mount, skillPack));
    },
  );

  fastify.get<{ Params: { yapId: string } }>(
    "/:yapId/mounts",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const paramsParsed = yapParamsSchema.safeParse(request.params);
      const queryParsed = listMountsQuerySchema.safeParse(request.query);
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

      const query = queryParsed.data;
      const result = await mountDAL.listByYap(yap.id, {
        enabled: query.enabled,
        limit: query.limit,
        offset: query.offset,
      });
      return reply.send({
        mounts: result.mounts,
        total: result.total,
        limit: query.limit,
        offset: query.offset,
      });
    },
  );

  fastify.get<{ Params: { yapId: string; mountId: string } }>(
    "/:yapId/mounts/:mountId",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const paramsParsed = mountParamsSchema.safeParse(request.params);
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

      const mount = await mountDAL.getById(paramsParsed.data.mountId);
      if (!mount || mount.yapId !== yap.id) {
        return reply.code(404).send({ error: "Mount not found" });
      }

      const skillPack = await packDAL.getById(mount.skillPackId);
      if (!skillPack) return reply.code(404).send({ error: "Skill Pack not found" });
      return reply.send(mountResponse(mount, skillPack));
    },
  );

  fastify.patch<{ Params: { yapId: string; mountId: string } }>(
    "/:yapId/mounts/:mountId",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = mountParamsSchema.safeParse(request.params);
      const bodyParsed = updateMountSchema.safeParse(request.body);
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

      const mount = await mountDAL.getById(paramsParsed.data.mountId);
      if (!mount || mount.yapId !== yap.id) {
        return reply.code(404).send({ error: "Mount not found" });
      }

      const body = bodyParsed.data;
      let nextSkillPack = await packDAL.getById(mount.skillPackId);
      if (!nextSkillPack) {
        return reply.code(404).send({ error: "Skill Pack not found" });
      }

      if (body.skillPackId) {
        const resolved = await resolveMountablePack(body.skillPackId, yap, packDAL);
        if (resolved === "missing" || resolved === "wrong-yap") {
          return reply.code(404).send({ error: "Skill Pack not found" });
        }
        if (resolved === "not-extension") {
          return reply
            .code(400)
            .send({ error: "Only extension Skill Packs can be mounted" });
        }
        if (resolved === "archived") {
          return reply
            .code(409)
            .send({ error: "Archived Skill Packs cannot be mounted" });
        }
        nextSkillPack = resolved;
      }

      if (body.mountKey && body.mountKey !== mount.mountKey) {
        const existing = await mountDAL.getByMountKey(yap.id, body.mountKey);
        if (existing) {
          return reply.code(409).send({
            error: "Mount key already exists",
            mountKey: body.mountKey,
          });
        }
      }

      const nextEnabled = body.enabled ?? mount.enabled;
      if (nextEnabled) {
        const validation = await buildMountValidation({
          yap,
          skillPack: nextSkillPack,
          mountKey: body.mountKey ?? mount.mountKey,
          replacingMountId: mount.id,
          mountPoint: body.mountPoint ?? mount.mountPoint,
          displayName: body.displayName ?? nextSkillPack.displayName,
          priority: body.priority ?? mount.priority,
          enabled: nextEnabled,
          required: body.required ?? mount.required,
          config: body.config ?? mount.config,
          constraints: body.constraints ?? mount.constraints,
        });
        if (validation.status === "blocked") {
          return reply.code(409).send({
            error: "Mount validation failed",
            validation,
          });
        }
      }

      const updated = await mountDAL.update(mount.id, {
        skillPackId: body.skillPackId,
        mountKey: body.mountKey,
        mountPoint: body.mountPoint,
        displayName:
          body.displayName ?? (body.skillPackId ? nextSkillPack.displayName : undefined),
        priority: body.priority,
        enabled: body.enabled,
        required: body.required,
        config: body.config,
        constraints: body.constraints,
      });

      if (!updated) return reply.code(404).send({ error: "Mount not found" });
      return reply.send(mountResponse(updated, nextSkillPack));
    },
  );

  fastify.delete<{ Params: { yapId: string; mountId: string } }>(
    "/:yapId/mounts/:mountId",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = mountParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: paramsParsed.error.issues,
        });
      }

      const yap = await resolveYap(paramsParsed.data.yapId, yapDAL);
      if (!yap) return reply.code(404).send({ error: "YAP not found" });
      if (!canWriteYap(yap, request.user)) {
        return reply.code(403).send({ error: "Not authorized to update this YAP" });
      }

      const mount = await mountDAL.getById(paramsParsed.data.mountId);
      if (!mount || mount.yapId !== yap.id) {
        return reply.code(404).send({ error: "Mount not found" });
      }

      await mountDAL.delete(mount.id);
      return reply.code(204).send();
    },
  );
}
