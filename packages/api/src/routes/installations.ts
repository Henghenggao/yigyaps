/**
 * YigYaps Installation Routes
 *
 * POST   /v1/installations          — Install a package to an agent
 * DELETE /v1/installations/:id      — Uninstall
 * GET    /v1/installations/agent/:agentId — List active installs for an agent
 *
 * Note: Tier checking is handled via JWT claims (userTier field).
 * YigYaps does not call platform APIs for tier validation.
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
import * as schema from "@yigyaps/db";
import { requireAuth } from "../middleware/auth-v2.js";

const TIER_RANK: Record<string, number> = {
  free: 0,
  pro: 1,
  epic: 2,
  legendary: 3,
};

const installSchema = z.object({
  packageId: z.string().min(1),
  agentId: z.string().min(1),
  configuration: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().default(true),
  /** User's subscription tier (from JWT or passed by the platform) */
  userTier: z.string().default("free"),
});

export async function installationsRoutes(fastify: FastifyInstance) {
  const db = fastify.db;
  const installDAL = new SkillInstallationDAL(db);

  fastify.post("/", { preHandler: requireAuth() }, async (request, reply) => {
    const userId = request.user?.userId;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const parsed = installSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Validation failed",
        details: parsed.error.issues,
      });
    }
    const body = parsed.data;
    const now = Date.now();

    const db = fastify.db;
    const result = await db.transaction(async (tx: NodePgDatabase<typeof schema>) => {
      const pkgDalTx = new SkillPackageDAL(tx);
      const installDalTx = new SkillInstallationDAL(tx);
      const mintDalTx = new SkillMintDAL(tx);
      const rlDALTx = new RoyaltyLedgerDAL(tx);

      const pkg = await pkgDalTx.getById(body.packageId);
      if (!pkg) return { status: 404, payload: { error: "Package not found" } };

      if (pkg.requiredTier > 0) {
        const userTierRank = TIER_RANK[body.userTier] ?? 0;
        if (userTierRank < pkg.requiredTier) {
          const requiredTierName =
            Object.entries(TIER_RANK).find(([, v]) => v === pkg.requiredTier)?.[0] ??
            "pro";
          return {
            status: 403, payload: {
              error: "Subscription tier required",
              requiredTier: pkg.requiredTier,
              requiredTierName,
              currentTier: body.userTier,
            }
          };
        }
      }

      const mint = await mintDalTx.getBySkillPackageId(body.packageId);

      const hasExisting = await installDalTx.hasInstallation(userId, body.packageId);
      if (hasExisting) {
        return { status: 409, payload: { error: "Package already installed" } };
      }

      const id = `sinst_${now}_${Math.random().toString(36).slice(2, 8)}`;
      const installation = await installDalTx.install({
        id,
        packageId: body.packageId,
        packageVersion: pkg.version,
        agentId: body.agentId,
        userId,
        status: "active",
        enabled: body.enabled,
        configuration: body.configuration ?? null,
        installedAt: now,
      });

      await pkgDalTx.incrementInstallCount(body.packageId);

      if (mint) {
        const incrementSucceeded = await mintDalTx.tryIncrementMintedCount(
          body.packageId,
        );
        if (!incrementSucceeded) {
          await installDalTx.updateStatus(installation.id, "failed");
          return {
            status: 409, payload: {
              error: "Edition limit reached",
              rarity: mint.rarity,
              maxEditions: mint.maxEditions,
              message:
                "Installation was attempted but edition limit was reached. Please try again.",
            }
          };
        }
      }

      if (mint && Number(pkg.priceUsd) > 0) {
        const royaltyPct = Number(mint.creatorRoyaltyPercent) || 70;
        const gross = Number(pkg.priceUsd);
        const royalty = +((gross * royaltyPct) / 100).toFixed(4);
        await rlDALTx.create({
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

      return { status: 201, payload: installation };
    });

    return reply.code(result.status).send(result.payload);
  });

  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const installation = await installDAL.getById(request.params.id);
      if (!installation) {
        return reply.code(404).send({ error: "Installation not found" });
      }
      await installDAL.updateStatus(request.params.id, "uninstalled");
      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: { agentId: string } }>(
    "/agent/:agentId",
    async (request, reply) => {
      const installations = await installDAL.getByAgent(
        request.params.agentId,
      );
      return reply.send({ installations });
    },
  );
}
