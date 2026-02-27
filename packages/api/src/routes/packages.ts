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
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import * as schema from "@yigyaps/db";
import { SkillPackageDAL, SkillRuleDAL, UserDAL } from "@yigyaps/db";
import { requireAuth } from "../middleware/auth-v2.js";

// Sanitize HTML configuration - allow safe formatting tags only
const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "a",
    "img",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["class"], // for syntax highlighting
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["https", "data"], // Only HTTPS images or data URIs
  },
  // Remove all event handlers and javascript: protocol
  disallowedTagsMode: "discard",
};

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
      "personality",
      "wisdom",
      "voice",
      "likeness",
      "other",
    ])
    .default("other"),
  maturity: z
    .enum(["experimental", "beta", "stable", "deprecated"])
    .default("experimental"),
  tags: z.array(z.string().max(50)).max(10).default([]),
  minRuntimeVersion: z.string().default("0.1.0"),
  requiredTier: z.number().int().min(0).max(3).default(0),
  mcpTransport: z.enum(["stdio", "http", "sse"]).default("stdio"),
  mcpCommand: z.string().max(500).optional(),
  mcpUrl: z.string().url().optional(),
  icon: z.string().max(500).optional(),
  repositoryUrl: z.string().url().optional(),
  homepageUrl: z.string().url().optional(),
  rules: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .optional(),
});

const updatePackageSchema = createPackageSchema.partial().extend({
  status: z.enum(["active","archived","banned"]).optional(),
  priceUsd: z
    .number()
    .min(0)
    .max(9999)
    .transform((val) => String(val))
    .optional(),
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
      "personality",
      "wisdom",
      "voice",
      "likeness",
      "other",
    ])
    .optional(),
  license: z.enum(["open-source", "free", "premium", "enterprise"]).optional(),
  maturity: z.enum(["experimental", "beta", "stable", "deprecated"]).optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) =>
      v === undefined ? undefined : Array.isArray(v) ? v : [v],
    ),
  author: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPriceUsd: z.coerce.number().min(0).optional(),
  sortBy: z
    .enum(["relevance", "popularity", "rating", "recent", "name"])
    .default("relevance"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Attach creator info (username + avatar) to a package response */
async function withCreatorInfo(
  pkg: Awaited<ReturnType<SkillPackageDAL["getById"]>>,
  userDAL: UserDAL,
) {
  if (!pkg) return pkg;
  const creator = await userDAL.getById(pkg.author);
  return {
    ...pkg,
    authorUsername: creator?.githubUsername ?? null,
    authorAvatar: creator?.avatarUrl ?? null,
    authorDisplayName: creator?.displayName ?? null,
  };
}

export async function packagesRoutes(fastify: FastifyInstance) {
  const db = fastify.db;
  const packageDAL = new SkillPackageDAL(db);
  const userDAL = new UserDAL(db);

  fastify.post("/", { preHandler: requireAuth() }, async (request, reply) => {
    // Author is automatically set from authenticated user
    const userId = request.user?.userId;
    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    const parsed = createPackageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Validation failed",
        details: parsed.error.issues,
      });
    }
    const body = parsed.data;
    const now = Date.now();

    const existing = await packageDAL.getByPackageId(body.packageId);
    if (existing) {
      return reply
        .code(409)
        .send({
          error: "Package ID already exists",
          packageId: body.packageId,
        });
    }

    // Sanitize README to prevent XSS
    const sanitizedReadme = body.readme
      ? sanitizeHtml(body.readme, sanitizeOptions)
      : null;

    const id = `spkg_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const pkg = await db.transaction(
      async (tx: NodePgDatabase<typeof schema>) => {
        const pkgDalTx = new SkillPackageDAL(tx);
        const ruleDalTx = new SkillRuleDAL(tx);

        const createdPkg = await pkgDalTx.create({
          id,
          packageId: body.packageId,
          version: body.version,
          displayName: body.displayName,
          description: body.description,
          readme: sanitizedReadme,
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
          minRuntimeVersion: body.minRuntimeVersion,
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

        if (body.rules && body.rules.length > 0) {
          for (const rule of body.rules) {
            await ruleDalTx.create({
              id: `rule_${now}_${Math.random().toString(36).slice(2, 8)}`,
              packageId: createdPkg.id,
              path: rule.path,
              content: rule.content,
              createdAt: now,
            });
          }
        }

        return createdPkg;
      },
    );

    return reply.code(201).send(pkg);
  });

  // Public search endpoint gets a higher rate limit (browsing use case)
  fastify.get(
    "/",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
    const params = searchSchema.parse(request.query);

    // If author filter is provided, fetch by author first then apply other filters
    if (params.author) {
      const authorPackages = await packageDAL.getByAuthor(params.author);
      return reply.send({ packages: authorPackages, total: authorPackages.length });
    }

    const result = await packageDAL.search(params);
    return reply.send(result);
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/:id",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
    const pkg = await packageDAL.getById(request.params.id);
    if (!pkg) return reply.code(404).send({ error: "Package not found" });
    return reply.send(await withCreatorInfo(pkg, userDAL));
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/:id/rules",
    async (request, reply) => {
      const ruleDAL = new SkillRuleDAL(fastify.db);
      const rules = await ruleDAL.getByPackage(request.params.id);
      return reply.send({ rules });
    },
  );

  fastify.get<{ Params: { packageId: string } }>(
    "/by-pkg/:packageId",
    async (request, reply) => {
      const pkg = await packageDAL.getByPackageId(request.params.packageId);
      if (!pkg) return reply.code(404).send({ error: "Package not found" });
      return reply.send(await withCreatorInfo(pkg, userDAL));
    },
  );

  fastify.get<{ Params: { packageId: string } }>(
    "/by-pkg/:packageId/rules",
    async (request, reply) => {
      const pkg = await packageDAL.getByPackageId(request.params.packageId);
      if (!pkg) return reply.code(404).send({ error: "Package not found" });

      const ruleDAL = new SkillRuleDAL(fastify.db);
      const rules = await ruleDAL.getByPackage(pkg.id);
      return reply.send({ rules });
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    "/:id",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const pkg = await packageDAL.getById(request.params.id);
      if (!pkg) return reply.code(404).send({ error: "Package not found" });

      // Only package owner can update their package
      if (pkg.author !== userId) {
        return reply
          .code(403)
          .send({ error: "Not authorized to update this package" });
      }
      const parsed = updatePackageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: parsed.error.issues,
        });
      }

      // Enforce status change permissions: non-admin users can only archive, not ban
      const updateData = { ...parsed.data };
      if (updateData.status && updateData.status !== "active") {
        if (updateData.status === "banned" && request.user?.role !== "admin") {
          return reply.code(403).send({ error: "Forbidden", message: "Only admins can ban packages" });
        }
      }
      // Sanitize README if present in update
      if (updateData.readme !== undefined && updateData.readme !== null) {
        updateData.readme = sanitizeHtml(updateData.readme, sanitizeOptions);
      }

      const updated = await packageDAL.update(request.params.id, updateData);
      return reply.send(updated);
    },
  );

  fastify.delete(
    "/:id",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });
      const pkg = await packageDAL.getById((request.params as {id:string}).id);
      if (!pkg) return reply.code(404).send({ error: "Package not found" });
      if (pkg.author !== userId) return reply.code(403).send({ error: "Not authorized to archive this package" });
      const updated = await packageDAL.update((request.params as {id:string}).id, { status: "archived" });
      return reply.send({ ...updated, message: "Package archived successfully" });
    },
  );

  fastify.get(
    "/my-packages",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      const packages = await packageDAL.getByAuthor(userId);
      return reply.send({ packages });
    },
  );
}
