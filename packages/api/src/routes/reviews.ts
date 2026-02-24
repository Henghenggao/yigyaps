/**
 * YigYaps Review Routes
 *
 * POST /v1/reviews              — Submit a review
 * GET  /v1/reviews/:packageId   — Get reviews for a package
 *
 * License: Apache 2.0
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SkillPackageDAL, SkillInstallationDAL, SkillReviewDAL } from "@yigyaps/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const reviewSchema = z.object({
  packageId: z.string().min(1),
  packageVersion: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(100).optional(),
  comment: z.string().min(10).max(1000).optional(),
});

export async function reviewsRoutes(fastify: FastifyInstance) {
  const db = fastify.db as NodePgDatabase;
  const packageDAL = new SkillPackageDAL(db);
  const installDAL = new SkillInstallationDAL(db);
  const reviewDAL = new SkillReviewDAL(db);

  fastify.post("/", async (request, reply) => {
    const userId = (request as any).userId ?? "anonymous";
    const userName = (request as any).userName ?? "Anonymous";
    const body = reviewSchema.parse(request.body);
    const now = Date.now();

    const pkg = await packageDAL.getById(body.packageId);
    if (!pkg) return reply.code(404).send({ error: "Package not found" });

    const hasInstalled = await installDAL.hasInstallation(userId, body.packageId);

    const id = `srev_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const review = await reviewDAL.create({
      id,
      packageId: body.packageId,
      packageVersion: body.packageVersion,
      userId,
      userName,
      rating: body.rating,
      title: body.title ?? null,
      comment: body.comment ?? null,
      verified: hasInstalled,
      createdAt: now,
      updatedAt: now,
    });

    const { avgRating, count } = await reviewDAL.calculateAverageRating(body.packageId);
    await packageDAL.updateRatingStats(body.packageId, avgRating, count, count);

    return reply.code(201).send(review);
  });

  fastify.get<{
    Params: { packageId: string };
    Querystring: { limit?: string; offset?: string };
  }>("/:packageId", async (request, reply) => {
    const limit = Math.min(Number(request.query.limit) || 20, 100);
    const offset = Number(request.query.offset) || 0;
    const reviews = await reviewDAL.getByPackage(
      request.params.packageId,
      limit,
      offset,
    );
    return reply.send({ reviews });
  });
}
