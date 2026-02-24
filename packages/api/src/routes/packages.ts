/**
 * YigYaps Package Routes
 *
 * POST   /v1/packages         — Publish a YAP package
 * GET    /v1/packages         — Search/list packages
 * GET    /v1/packages/:id     — Get package details
 * PATCH  /v1/packages/:id     — Update package
 * GET    /v1/packages/by-pkg/:packageId — Get by packageId
 *
 * License: Apache 2.0
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  SkillPackageDAL,
  SkillInstallationDAL,
} from "@yigyaps/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const createPackageSchema = z.object({
  packageId: z.string().min(1).max(100),
  version: z.string().min(1).max(20),
  displayName: z.string().min(1).max(200),
  description: z.string().min(10).max(500),
  readme: z.string().max(5000).optional(),
  authorName: z.string().min(1).max(100),
  authorUrl: z.string().url().optional(),
  license: z
    .enum(["open-source", "free", "premium", "enterprise"])
    .default("open-source"),
  priceUsd: z.number().min(0).max(9999).default(0),
  requiresApiKey: z.boolean().default(false),
  apiKeyInstructions: z.string().max(1000).optional(),
  category: z
    .enum([
      "development",
      "communication",
      "productivity",
      "research",
      "integration",
      "data",
      "automation",
      "security",
      "ai-ml",
      "other",
    ])
    .default("other"),
  maturity: z
    .enum(["experimental", "beta", "stable", "deprecated"])
    .default("experimental"),
  tags: z.array(z.string().max(50)).max(10).default([]),
  minYigcoreVersion: z.string().default("0.1.0"),
  requiredTier: z.number().int().min(0).max(3).default(0),
  mcpTransport: z.enum(["stdio", "http", "sse"]).default("stdio"),
  mcpCommand: z.string().max(500).optional(),
  mcpUrl: z.string().url().optional(),
  icon: z.string().max(500).optional(),
  repositoryUrl: z.string().url().optional(),
  homepageUrl: z.string().url().optional(),
});

const searchSchema = z.object({
  query: z.string().max(200).optional(),
  category: z
    .enum([
      "development",
      "communication",
      "productivity",
      "research",
      "integration",
      "data",
      "automation",
      "security",
      "ai-ml",
      "other",
    ])
    .optional(),
  license: z
    .enum(["open-source", "free", "premium", "enterprise"])
    .optional(),
  maturity: z
    .enum(["experimental", "beta", "stable", "deprecated"])
    .optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPriceUsd: z.coerce.number().min(0).optional(),
  sortBy: z
    .enum(["relevance", "popularity", "rating", "recent", "name"])
    .default("relevance"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function packagesRoutes(fastify: FastifyInstance) {
  const db = fastify.db as NodePgDatabase;
  const packageDAL = new SkillPackageDAL(db);
  const installDAL = new SkillInstallationDAL(db);

  fastify.post("/", async (request, reply) => {
    const userId = (request as any).userId ?? "anonymous";
    const body = createPackageSchema.parse(request.body);
    const now = Date.now();

    const existing = await packageDAL.getByPackageId(body.packageId);
    if (existing) {
      return reply
        .code(409)
        .send({ error: "Package ID already exists", packageId: body.packageId });
    }

    const id = `spkg_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const pkg = await packageDAL.create({
      id,
      packageId: body.packageId,
      version: body.version,
      displayName: body.displayName,
      description: body.description,
      readme: body.readme ?? null,
      author: userId,
      authorName: body.authorName,
      authorUrl: body.authorUrl ?? null,
      license: body.license,
      priceUsd: String(body.priceUsd),
      requiresApiKey: body.requiresApiKey,
      apiKeyInstructions: body.apiKeyInstructions ?? null,
      category: body.category,
      maturity: body.maturity,
      tags: body.tags,
      minYigcoreVersion: body.minYigcoreVersion,
      requiredTier: body.requiredTier,
      mcpTransport: body.mcpTransport,
      mcpCommand: body.mcpCommand ?? null,
      mcpUrl: body.mcpUrl ?? null,
      icon: body.icon ?? null,
      repositoryUrl: body.repositoryUrl ?? null,
      homepageUrl: body.homepageUrl ?? null,
      origin: "manual",
      createdAt: now,
      updatedAt: now,
      releasedAt: now,
    });

    return reply.code(201).send(pkg);
  });

  fastify.get("/", async (request, reply) => {
    const params = searchSchema.parse(request.query);
    const result = await packageDAL.search(params);
    return reply.send(result);
  });

  fastify.get<{ Params: { id: string } }>(
    "/:id",
    async (request, reply) => {
      const pkg = await packageDAL.getById(request.params.id);
      if (!pkg) return reply.code(404).send({ error: "Package not found" });
      return reply.send(pkg);
    },
  );

  fastify.get<{ Params: { packageId: string } }>(
    "/by-pkg/:packageId",
    async (request, reply) => {
      const pkg = await packageDAL.getByPackageId(request.params.packageId);
      if (!pkg) return reply.code(404).send({ error: "Package not found" });
      return reply.send(pkg);
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    "/:id",
    async (request, reply) => {
      const userId = (request as any).userId ?? "anonymous";
      const pkg = await packageDAL.getById(request.params.id);
      if (!pkg) return reply.code(404).send({ error: "Package not found" });
      if (pkg.author !== userId) {
        return reply
          .code(403)
          .send({ error: "Not authorized to update this package" });
      }
      const updated = await packageDAL.update(
        request.params.id,
        request.body as Record<string, unknown>,
      );
      return reply.send(updated);
    },
  );

  fastify.get("/my-packages", async (request, reply) => {
    const userId = (request as any).userId ?? "anonymous";
    const packages = await packageDAL.getByAuthor(userId);
    return reply.send({ packages });
  });
}
