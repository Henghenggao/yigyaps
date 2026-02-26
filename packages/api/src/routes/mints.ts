/**
 * YigYaps Mint Routes — Limited Edition Economy
 *
 * POST /v1/mints              — Mint a limited edition (Rare+ requires GraduationCertificate)
 * GET  /v1/mints/my-earnings  — Creator royalty earnings summary
 *
 * For Rare+ minting: the GraduationCertificate is passed directly in the request body.
 * Yigstudio generates it via Yigstudio Lab and passes it when calling the YigYaps API.
 * YigYaps does NOT call back to Yigstudio — all data flows one-way.
 *
 * License: Apache 2.0
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SkillPackageDAL, SkillMintDAL, RoyaltyLedgerDAL } from "@yigyaps/db";
import { requireAuth } from "../middleware/auth-v2.js";

const mintSchema = z.object({
  skillPackageId: z.string().min(1),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  maxEditions: z.number().int().min(1).nullable().optional(),
  creatorRoyaltyPercent: z.number().min(0).max(100).default(70),
  /**
   * Required for Rare+ tiers. The GraduationCertificate JSON object
   * issued by Yigstudio Lab (or equivalent quality-assurance system).
   * YigYaps stores it as-is for verifiable provenance.
   */
  graduationCertificate: z.unknown().optional(),
});

export async function mintsRoutes(fastify: FastifyInstance) {
  const db = fastify.db;
  const packageDAL = new SkillPackageDAL(db);
  const mintDAL = new SkillMintDAL(db);
  const royaltyLedgerDAL = new RoyaltyLedgerDAL(db);

  fastify.post("/", { preHandler: requireAuth() }, async (request, reply) => {
    const userId = request.user?.userId;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const parsed = mintSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Validation failed",
        details: parsed.error.issues,
      });
    }
    const body = parsed.data;
    const now = Date.now();

    const pkg = await packageDAL.getById(body.skillPackageId);
    if (!pkg) return reply.code(404).send({ error: "Package not found" });
    if (pkg.author !== userId) {
      return reply
        .code(403)
        .send({ error: "Not authorized to mint this package" });
    }

    const existingMint = await mintDAL.getBySkillPackageId(body.skillPackageId);
    if (existingMint) {
      return reply
        .code(409)
        .send({ error: "Package already minted", mint: existingMint });
    }

    if (body.rarity !== "common" && !body.graduationCertificate) {
      return reply.code(422).send({
        error: "graduationCertificate is required for Rare+ minting",
        detail:
          "Obtain a GraduationCertificate from Yigstudio Lab (or equivalent) and pass it in the request body.",
      });
    }

    const maxEditions =
      body.maxEditions ??
      (() => {
        switch (body.rarity) {
          case "common":
            return null;
          case "rare":
            return 1000;
          case "epic":
            return 100;
          case "legendary":
            return 10;
        }
      })();

    const origin: "manual" | "beta-lab" =
      body.rarity !== "common" ? "beta-lab" : "manual";

    const id = `smint_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const mint = await mintDAL.create({
      id,
      skillPackageId: body.skillPackageId,
      rarity: body.rarity,
      maxEditions,
      creatorId: userId,
      creatorRoyaltyPercent: String(body.creatorRoyaltyPercent),
      graduationCertificate: body.graduationCertificate ?? null,
      origin,
      createdAt: now,
      updatedAt: now,
    });

    return reply.code(201).send(mint);
  });

  fastify.get(
    "/my-earnings",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });
      const { totalUsd, count } =
        await royaltyLedgerDAL.getTotalEarnings(userId);
      const recent = await royaltyLedgerDAL.getByCreator(userId, 20);
      return reply.send({ totalUsd, count, recent });
    },
  );
}
