/**
 * YigYaps Installation Routes
 *
 * POST   /v1/installations          — Install a package to a Yigbot
 * DELETE /v1/installations/:id      — Uninstall
 * GET    /v1/installations/yigbot/:yigbotId — List active installs for Yigbot
 *
 * Note: Tier checking is handled via JWT claims (userTier field).
 * YigYaps does not call Yigcore APIs for tier validation.
 *
 * License: Apache 2.0
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  SkillPackageDAL,
  SkillInstallationDAL,
  SkillMintDAL,
  RoyaltyLedgerDAL,
} from "@yigyaps/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const TIER_RANK: Record<string, number> = {
  free: 0,
  pro: 1,
  epic: 2,
  legendary: 3,
};

const installSchema = z.object({
  packageId: z.string().min(1),
  yigbotId: z.string().min(1),
  configuration: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().default(true),
  /** User's subscription tier (from JWT or passed by Yigcore) */
  userTier: z.string().default("free"),
});

export async function installationsRoutes(fastify: FastifyInstance) {
  const db = fastify.db as NodePgDatabase;
  const packageDAL = new SkillPackageDAL(db);
  const installDAL = new SkillInstallationDAL(db);
  const mintDAL = new SkillMintDAL(db);
  const royaltyLedgerDAL = new RoyaltyLedgerDAL(db);

  fastify.post("/", async (request, reply) => {
    const userId = (request as any).userId ?? "anonymous";
    const body = installSchema.parse(request.body);
    const now = Date.now();

    const pkg = await packageDAL.getById(body.packageId);
    if (!pkg) return reply.code(404).send({ error: "Package not found" });

    if (pkg.requiredTier > 0) {
      const userTierRank = TIER_RANK[body.userTier] ?? 0;
      if (userTierRank < pkg.requiredTier) {
        const requiredTierName =
          Object.entries(TIER_RANK).find(([, v]) => v === pkg.requiredTier)?.[0] ??
          "pro";
        return reply.code(403).send({
          error: "Subscription tier required",
          requiredTier: pkg.requiredTier,
          requiredTierName,
          currentTier: body.userTier,
        });
      }
    }

    const mint = await mintDAL.getBySkillPackageId(body.packageId);
    if (mint?.maxEditions !== null && mint !== null) {
      const allowed = await mintDAL.checkEditionLimit(body.packageId);
      if (!allowed) {
        return reply.code(409).send({
          error: "Edition limit reached",
          rarity: mint.rarity,
          maxEditions: mint.maxEditions,
          mintedCount: mint.mintedCount,
        });
      }
    }

    const hasExisting = await installDAL.hasInstallation(userId, body.packageId);
    if (hasExisting) {
      return reply.code(409).send({ error: "Package already installed" });
    }

    const id = `sinst_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const installation = await installDAL.install({
      id,
      packageId: body.packageId,
      packageVersion: pkg.version,
      yigbotId: body.yigbotId,
      userId,
      status: "active",
      enabled: body.enabled,
      configuration: body.configuration ?? null,
      installedAt: now,
    });

    await packageDAL.incrementInstallCount(body.packageId);
    if (mint) await mintDAL.incrementMintedCount(body.packageId);

    if (mint && Number(pkg.priceUsd) > 0) {
      const royaltyPct = Number(mint.creatorRoyaltyPercent) || 70;
      const gross = Number(pkg.priceUsd);
      const royalty = +((gross * royaltyPct) / 100).toFixed(4);
      await royaltyLedgerDAL.create({
        id: `rlgr_${now}_${Math.random().toString(36).slice(2, 8)}`,
        skillPackageId: pkg.id,
        creatorId: mint.creatorId,
        buyerId: userId,
        installationId: installation.id,
        grossAmountUsd: String(gross),
        royaltyAmountUsd: String(royalty),
        royaltyPercent: String(royaltyPct),
        createdAt: now,
      });
    }

    return reply.code(201).send(installation);
  });

  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    async (request, reply) => {
      const installation = await installDAL.getById(request.params.id);
      if (!installation) {
        return reply.code(404).send({ error: "Installation not found" });
      }
      await installDAL.updateStatus(request.params.id, "uninstalled");
      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: { yigbotId: string } }>(
    "/yigbot/:yigbotId",
    async (request, reply) => {
      const installations = await installDAL.getByYigbot(
        request.params.yigbotId,
      );
      return reply.send({ installations });
    },
  );
}
