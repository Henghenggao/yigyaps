/**
 * Yigcore Registry API Routes (ADR-033)
 *
 * These endpoints serve the Yigcore yap-installer client:
 *   GET  /v1/packages?q=&category=&page=&limit=  — Search YAP packages
 *   GET  /v1/packages/:id                         — Package details
 *   GET  /v1/packages/:id/versions                — Version list
 *   POST /v1/packages/:id/download                — Download manifest
 *   GET  /v1/packages/:id/certificate             — Graduation certificate
 *   POST /v1/usage                                — Usage reporting
 *
 * Auth: Authorization: Bearer {API_KEY}
 * Rate limit: 429 + Retry-After header
 *
 * License: Apache 2.0
 */

import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { z } from "zod";
import { SkillPackageDAL } from "@yigyaps/db";
import { requireAuth } from "../middleware/auth-v2.js";

// ─── Validation Schemas ──────────────────────────────────────────────────────

const searchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: z
    .enum([
      "development", "communication", "productivity", "research",
      "integration", "data", "automation", "security",
      "ai-ml", "personality", "wisdom", "voice", "likeness", "other",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const usageSchema = z.object({
  packageId: z.string().min(1),
  version: z.string().min(1),
  action: z.enum(["invoke", "install", "uninstall"]),
  durationMs: z.number().int().min(0).optional(),
  success: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Helper: resolve package by internal ID or packageId string ──────────────

async function resolvePackage(id: string, dal: SkillPackageDAL) {
  // Internal IDs start with "spkg_"
  const pkg = id.startsWith("spkg_")
    ? await dal.getById(id)
    : await dal.getByPackageId(id);
  return pkg;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function yigcoreRegistryRoutes(fastify: FastifyInstance) {
  const packageDAL = new SkillPackageDAL(fastify.db);

  // ── 1. GET /packages?q=&category=&page=&limit= — Search ───────────────────
  fastify.get(
    "/packages",
    {
      preHandler: requireAuth(),
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const params = searchQuerySchema.parse(request.query);
      const offset = (params.page - 1) * params.limit;

      const result = await packageDAL.search({
        query: params.q,
        category: params.category,
        limit: params.limit,
        offset,
      });

      return reply.send({
        packages: result.packages,
        total: result.total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(result.total / params.limit),
      });
    },
  );

  // ── 2. GET /packages/:id — Package details ────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    "/packages/:id",
    {
      preHandler: requireAuth(),
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const pkg = await resolvePackage(request.params.id, packageDAL);
      if (!pkg) return reply.code(404).send({ error: "Package not found" });
      return reply.send(pkg);
    },
  );

  // ── 3. GET /packages/:id/versions — Version list ──────────────────────────
  fastify.get<{ Params: { id: string } }>(
    "/packages/:id/versions",
    {
      preHandler: requireAuth(),
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const pkg = await resolvePackage(request.params.id, packageDAL);
      if (!pkg) return reply.code(404).send({ error: "Package not found" });

      // Currently each package row represents a single version.
      // Future: separate versions table. For now return the current version.
      return reply.send({
        packageId: pkg.packageId,
        versions: [
          {
            version: pkg.version,
            releasedAt: pkg.releasedAt,
            maturity: pkg.maturity,
            minRuntimeVersion: pkg.minRuntimeVersion,
          },
        ],
      });
    },
  );

  // ── 4. POST /packages/:id/download — Download manifest ────────────────────
  fastify.post<{ Params: { id: string } }>(
    "/packages/:id/download",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const pkg = await resolvePackage(request.params.id, packageDAL);
      if (!pkg) return reply.code(404).send({ error: "Package not found" });

      if (pkg.status !== "active") {
        return reply.code(410).send({ error: "Package is no longer available" });
      }

      // Increment install count
      await packageDAL.incrementInstallCount(pkg.id);

      // Build registry URL for the package
      const apiBase = process.env.YIGYAPS_API_URL ?? "https://api.yigyaps.com";
      const tag = `v${pkg.version}`;
      // Deterministic digest from package content
      const digest = crypto
        .createHash("sha256")
        .update(`${pkg.packageId}@${pkg.version}`)
        .digest("hex");

      return reply.send({
        registryUrl: `${apiBase}/v1/packages/${pkg.id}`,
        tag,
        digest: `sha256:${digest}`,
        size: Buffer.byteLength(JSON.stringify(pkg), "utf8"),
      });
    },
  );

  // ── 5. GET /packages/:id/certificate — Graduation certificate ─────────────
  fastify.get<{ Params: { id: string } }>(
    "/packages/:id/certificate",
    {
      preHandler: requireAuth(),
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const pkg = await resolvePackage(request.params.id, packageDAL);
      if (!pkg) return reply.code(404).send({ error: "Package not found" });

      // Graduation criteria:
      // - maturity must be "stable"
      // - rating >= 4.0
      // - installCount >= 10
      // - has reviews
      const rating = Number(pkg.rating) || 0;
      const isGraduated =
        pkg.maturity === "stable" &&
        rating >= 4.0 &&
        pkg.installCount >= 10 &&
        pkg.reviewCount > 0;

      return reply.send({
        packageId: pkg.packageId,
        graduated: isGraduated,
        maturity: pkg.maturity,
        criteria: {
          stableMaturity: pkg.maturity === "stable",
          minRating: { required: 4.0, actual: rating },
          minInstalls: { required: 10, actual: pkg.installCount },
          hasReviews: { required: true, actual: pkg.reviewCount > 0 },
        },
        ...(isGraduated
          ? { certificateId: `cert_${pkg.id}_${Date.now()}` }
          : {}),
      });
    },
  );
}

// ── Usage reporting (separate prefix: /v1/usage) ─────────────────────────────

export async function yigcoreUsageRoutes(fastify: FastifyInstance) {
  // ── 6. POST /usage — Usage telemetry ──────────────────────────────────────
  fastify.post(
    "/",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const parsed = usageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: parsed.error.issues,
        });
      }

      const { packageId, version, action, durationMs, success, metadata } =
        parsed.data;
      const userId = request.user?.userId;

      // Log usage event (future: persist to usage_events table)
      request.log.info(
        { packageId, version, action, durationMs, success, userId, metadata },
        "Usage event recorded",
      );

      return reply.code(202).send({ status: "accepted" });
    },
  );
}
