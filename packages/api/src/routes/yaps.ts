/**
 * YAP Routes
 *
 * POST /v1/yaps               - Create a YAP container
 * GET  /v1/yaps               - List public YAPs or caller-owned YAPs
 * GET  /v1/yaps/:id           - Read YAP by internal ID
 * GET  /v1/yaps/by-slug/:slug - Read YAP by stable slug
 *
 * License: Apache 2.0
 */

import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { YapDAL, type YapRow } from "@yigyaps/db";
import { optionalAuth, requireAuth } from "../middleware/auth-v2.js";

const slugSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/);

const createYapSchema = z.object({
  slug: slugSchema,
  version: z.string().min(1).max(40).default("0.1.0"),
  displayName: z.string().min(1).max(200),
  description: z.string().min(10).max(1000),
  readme: z.string().max(20_000).optional(),
  category: z.string().min(1).max(80).default("other"),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  visibility: z.enum(["public", "private", "unlisted"]).default("public"),
  status: z.enum(["draft", "active"]).default("active"),
  assemblyConfig: z.record(z.string(), z.unknown()).default({}),
});

const listYapsSchema = z.object({
  query: z.string().max(200).optional(),
  category: z.string().max(80).optional(),
  mine: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const paramsSchema = z.object({
  id: z.string().min(1),
});

const slugParamsSchema = z.object({
  slug: slugSchema,
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

function canReadYap(
  yap: YapRow,
  user?: { userId: string; role: "user" | "admin" },
): boolean {
  if (user?.role === "admin" || user?.userId === yap.ownerId) {
    return true;
  }

  return yap.status === "active" && yap.visibility !== "private";
}

export async function yapsRoutes(fastify: FastifyInstance) {
  const yapDAL = new YapDAL(fastify.db);

  fastify.post("/", { preHandler: requireAuth() }, async (request, reply) => {
    const user = request.user;
    if (!user) return reply.code(401).send({ error: "Unauthorized" });

    const parsed = createYapSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Validation failed",
        details: parsed.error.issues,
      });
    }

    const body = parsed.data;
    const existing = await yapDAL.getBySlug(body.slug);
    if (existing) {
      return reply.code(409).send({
        error: "YAP slug already exists",
        slug: body.slug,
      });
    }

    const now = Date.now();
    const yap = await yapDAL.create({
      id: `yap_${now}_${crypto.randomBytes(4).toString("hex")}`,
      slug: body.slug,
      version: body.version,
      displayName: body.displayName,
      description: body.description,
      readme: body.readme ? sanitizeHtml(body.readme, sanitizeOptions) : null,
      ownerId: user.userId,
      ownerName: user.userName,
      category: body.category,
      tags: body.tags,
      visibility: body.visibility,
      status: body.status,
      assemblyConfig: body.assemblyConfig,
      createdAt: now,
      updatedAt: now,
      releasedAt: now,
    });

    reply.header("Location", `/v1/yaps/${yap.id}`);
    return reply.code(201).send(yap);
  });

  fastify.get(
    "/",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = listYapsSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: parsed.error.issues,
        });
      }

      const params = parsed.data;
      if (params.mine && !request.user) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const result = await yapDAL.search({
        query: params.query,
        category: params.category,
        ownerId: params.mine ? request.user!.userId : undefined,
        visibility: params.mine ? undefined : "public",
        status: params.mine ? undefined : "active",
        limit: params.limit,
        offset: params.offset,
      });

      return reply.send({
        yaps: result.yaps,
        total: result.total,
        limit: params.limit,
        offset: params.offset,
      });
    },
  );

  fastify.get<{ Params: { slug: string } }>(
    "/by-slug/:slug",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = slugParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: parsed.error.issues,
        });
      }

      const yap = await yapDAL.getBySlug(parsed.data.slug);
      if (!yap || !canReadYap(yap, request.user)) {
        return reply.code(404).send({ error: "YAP not found" });
      }

      return reply.send(yap);
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: optionalAuth,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const parsed = paramsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: parsed.error.issues,
        });
      }

      const yap = await yapDAL.getById(parsed.data.id);
      if (!yap || !canReadYap(yap, request.user)) {
        return reply.code(404).send({ error: "YAP not found" });
      }

      return reply.send(yap);
    },
  );
}
