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
import {
  SkillPackageDAL,
  SkillInstallationDAL,
  SkillReviewDAL,
} from "@yigyaps/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@yigyaps/db";
import { requireAuth } from "../middleware/auth-v2.js";

const reviewSchema = z.object({
  packageId: z.string().min(1),
  packageVersion: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(100).optional(),
  comment: z.string().min(10).max(1000).optional(),
});

export async function reviewsRoutes(fastify: FastifyInstance) {
  const db = fastify.db;
  const reviewDAL = new SkillReviewDAL(db);

  fastify.post("/", { preHandler: requireAuth() }, async (request, reply) => {
    const userId = request.user?.userId;
    const userName = request.user?.userName;

    if (!userId || !userName) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    // Validate request body
    const parseResult = reviewSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: "Invalid request",
        details: parseResult.error.errors,
      });
    }

    const body = parseResult.data;
    const now = Date.now();

    const db = fastify.db;
    const result = await db.transaction(
      async (tx: NodePgDatabase<typeof schema>) => {
        const pkgDalTx = new SkillPackageDAL(tx);
        const installDalTx = new SkillInstallationDAL(tx);
        const reviewDalTx = new SkillReviewDAL(tx);

        const pkg = await pkgDalTx.getById(body.packageId);
        if (!pkg) return { status: 404, error: "Package not found" };

        const hasInstalled = await installDalTx.hasInstallation(
          userId,
          body.packageId,
        );

        const id = `srev_${now}_${Math.random().toString(36).slice(2, 8)}`;
        const review = await reviewDalTx.create({
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

        const { avgRating, count } = await reviewDalTx.calculateAverageRating(
          body.packageId,
        );
        await pkgDalTx.updateRatingStats(
          body.packageId,
          avgRating,
          count,
          count,
        );

        return { status: 201, review };
      },
    );

    if (result.error) {
      return reply.code(result.status).send({ error: result.error });
    }
    return reply.code(result.status).send(result.review);
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
