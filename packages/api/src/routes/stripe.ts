/**
 * YigYaps Stripe Routes — Connect + Checkout + Webhooks
 *
 * Endpoints:
 *   GET  /v1/stripe/connect/onboard       — Start expert Stripe Connect OAuth
 *   GET  /v1/stripe/connect/callback      — Stripe OAuth callback (stores account ID)
 *   GET  /v1/stripe/connect/status        — Expert payout account status
 *   POST /v1/stripe/checkout/:packageId   — Create Stripe Checkout session for subscription
 *   POST /v1/webhooks/stripe              — Stripe webhook receiver (raw body)
 *   GET  /v1/stripe/earnings              — Creator earnings summary
 *
 * Split model: Platform 30% / Creator 70% via Stripe Connect Standard.
 *
 * IMPORTANT: STRIPE_SECRET_KEY must be set for payment endpoints to function.
 * When omitted all endpoints return 503 "Stripe not configured".
 *
 * License: Apache 2.0
 */

import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { eq, and, sum, sql } from "drizzle-orm";
import { usersTable, subscriptionsTable, usageLedgerTable } from "@yigyaps/db";
import { SkillPackageDAL, UserDAL } from "@yigyaps/db";
import { requireAuth } from "../middleware/auth-v2.js";
import { env } from "../lib/env.js";

// ── Pricing constants ─────────────────────────────────────────────────────────

const PLATFORM_SHARE = 0.3;
const CREATOR_SHARE = 0.7;

/** Cents per invocation for pay-per-call (free tier overage) */
const OVERAGE_PRICE_CENTS = 5; // $0.05

/** Tier call limits per billing period */
const TIER_CALL_LIMITS: Record<string, number> = {
  free: 0,
  pro: 500,
  epic: 2_000,
  legendary: 0, // unlimited — limit 0 treated as ∞
};

// ── Stripe client factory ─────────────────────────────────────────────────────

function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
}

function stripeRequired(reply: { code: (n: number) => { send: (b: unknown) => unknown } }) {
  return reply.code(503).send({
    error: "Service Unavailable",
    message:
      "Stripe is not configured on this instance. Set STRIPE_SECRET_KEY to enable payments.",
  });
}

// ── Route plugin ─────────────────────────────────────────────────────────────

export const stripeRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /v1/stripe/connect/onboard ─────────────────────────────────────────
  // Generates a Stripe Connect OAuth URL and redirects the authenticated expert.
  fastify.get(
    "/stripe/connect/onboard",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const stripe = getStripe();
      if (!stripe || !env.STRIPE_CONNECT_CLIENT_ID) {
        return stripeRequired(reply);
      }

      const userId = request.user!.userId;
      const state = `${userId}.${randomUUID()}`; // CSRF token embedded in state

      const params = new URLSearchParams({
        response_type: "code",
        client_id: env.STRIPE_CONNECT_CLIENT_ID,
        scope: "read_write",
        redirect_uri:
          `${env.YIGYAPS_API_URL ?? "http://localhost:3100"}/v1/stripe/connect/callback`,
        state,
      });

      return reply.redirect(
        `https://connect.stripe.com/oauth/authorize?${params.toString()}`,
      );
    },
  );

  // ── GET /v1/stripe/connect/callback ────────────────────────────────────────
  // Stripe redirects here after the expert completes Connect OAuth.
  // Stores the connected account ID on the user record.
  fastify.get(
    "/stripe/connect/callback",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const stripe = getStripe();
      if (!stripe) return stripeRequired(reply);

      const { code, state, error } = request.query as Record<string, string>;

      if (error) {
        const frontendUrl = env.FRONTEND_URL;
        return reply.redirect(
          `${frontendUrl}/settings?stripe_error=${encodeURIComponent(error)}`,
        );
      }

      if (!code || !state) {
        return reply.code(400).send({ error: "Missing code or state" });
      }

      // Extract userId from state (format: "<userId>.<uuid>")
      const userId = state.split(".")[0];
      if (userId !== request.user!.userId) {
        return reply.code(403).send({ error: "State mismatch" });
      }

      // Exchange code for connected account ID
      const tokenResponse = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      });

      const stripeAccountId = tokenResponse.stripe_user_id;
      if (!stripeAccountId) {
        return reply.code(500).send({ error: "No Stripe account ID returned" });
      }

      // Persist on user record
      await fastify.db
        .update(usersTable)
        .set({ stripeAccountId, updatedAt: Date.now() })
        .where(eq(usersTable.id, userId));

      const frontendUrl = env.FRONTEND_URL;
      return reply.redirect(`${frontendUrl}/settings?stripe_connected=1`);
    },
  );

  // ── GET /v1/stripe/connect/status ──────────────────────────────────────────
  fastify.get(
    "/stripe/connect/status",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const stripe = getStripe();
      const userId = request.user!.userId;

      const userDAL = new UserDAL(fastify.db);
      const user = await userDAL.getById(userId);
      if (!user) return reply.code(404).send({ error: "User not found" });

      if (!user.stripeAccountId) {
        return reply.send({ connected: false, stripeAccountId: null });
      }

      if (!stripe) {
        // Stripe not configured but account ID is stored — just return stored state
        return reply.send({
          connected: true,
          stripeAccountId: user.stripeAccountId,
          details_submitted: null,
          payouts_enabled: null,
        });
      }

      const account = await stripe.accounts.retrieve(user.stripeAccountId);
      return reply.send({
        connected: true,
        stripeAccountId: user.stripeAccountId,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
      });
    },
  );

  // ── POST /v1/stripe/checkout/:packageId ────────────────────────────────────
  // Creates a Stripe Checkout session for the caller to subscribe to a skill.
  fastify.post(
    "/stripe/checkout/:packageId",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const stripe = getStripe();
      if (!stripe) return stripeRequired(reply);

      const { packageId } = request.params as { packageId: string };
      const { tier = "pro" } = (request.body ?? {}) as { tier?: string };

      if (!["pro", "epic", "legendary"].includes(tier)) {
        return reply.code(400).send({ error: "Invalid tier" });
      }

      const pkgDAL = new SkillPackageDAL(fastify.db);
      const pkg = await pkgDAL.getByPackageId(packageId);
      if (!pkg || pkg.status !== "active") {
        return reply.code(404).send({ error: "Package not found" });
      }

      const userId = request.user!.userId;
      const frontendUrl = env.FRONTEND_URL;

      // Price IDs would normally come from env/config; using lookup keys here
      // so the same code works across Stripe test/prod environments.
      const priceKey = `yigyaps_${tier}_monthly`;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `YigYaps ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
                description: `${TIER_CALL_LIMITS[tier] || "Unlimited"} skill invocations/month`,
              },
              unit_amount:
                tier === "pro"
                  ? 2900
                  : tier === "epic"
                    ? 9900
                    : 29900, // cents
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          packageId,
          tier,
          price_key: priceKey,
        },
        success_url: `${frontendUrl}/skills/${packageId}?subscribed=1`,
        cancel_url: `${frontendUrl}/skills/${packageId}`,
      });

      return reply.send({ checkoutUrl: session.url, sessionId: session.id });
    },
  );

  // ── GET /v1/stripe/earnings ────────────────────────────────────────────────
  // Returns the authenticated creator's earnings summary.
  fastify.get(
    "/stripe/earnings",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const userId = request.user!.userId;

      // Aggregate royalties from usage ledger
      const [allTime] = await fastify.db
        .select({ total: sum(usageLedgerTable.creatorRoyaltyUsd) })
        .from(usageLedgerTable)
        .where(
          and(
            sql`EXISTS (
              SELECT 1 FROM yy_skill_packages sp
              WHERE sp.id = ${usageLedgerTable.skillPackageId}
                AND sp.author = ${userId}
            )`,
          ),
        );

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const [last30d] = await fastify.db
        .select({ total: sum(usageLedgerTable.creatorRoyaltyUsd) })
        .from(usageLedgerTable)
        .where(
          and(
            sql`EXISTS (
              SELECT 1 FROM yy_skill_packages sp
              WHERE sp.id = ${usageLedgerTable.skillPackageId}
                AND sp.author = ${userId}
            )`,
            sql`${usageLedgerTable.createdAt} > ${thirtyDaysAgo}`,
          ),
        );

      return reply.send({
        allTimeUsd: parseFloat(allTime?.total ?? "0"),
        last30dUsd: parseFloat(last30d?.total ?? "0"),
        creatorSharePercent: CREATOR_SHARE * 100,
      });
    },
  );

  // ── POST /v1/webhooks/stripe ───────────────────────────────────────────────
  // Stripe sends events here. Registered at prefix "/v1" so full path is correct.
  // IMPORTANT: raw body required for signature verification — do not parse JSON.
  fastify.post(
    "/webhooks/stripe",
    {
      config: {
        // Disable Fastify's body parser so we receive raw Buffer
        rawBody: true,
      },
    },
    async (request, reply) => {
      const stripe = getStripe();
      if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
        return reply.code(200).send({ received: true }); // Acknowledge silently
      }

      const sig = request.headers["stripe-signature"] as string;
      const rawBody = (request as unknown as { rawBody?: Buffer }).rawBody;

      if (!sig || !rawBody) {
        return reply.code(400).send({ error: "Missing signature or body" });
      }

      let event: ReturnType<typeof stripe.webhooks.constructEvent>;
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Signature mismatch";
        request.log.warn({ err }, `Stripe webhook signature failed: ${msg}`);
        return reply.code(400).send({ error: `Webhook error: ${msg}` });
      }

      request.log.info({ eventType: event.type }, "Stripe webhook received");

      // ── Event handlers ─────────────────────────────────────────────────────
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as {
            metadata?: Record<string, string>;
            customer?: string;
            subscription?: string;
          };
          const { userId, tier } = session.metadata ?? {};
          const stripeCustomerId =
            typeof session.customer === "string" ? session.customer : null;
          const stripeSubscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : null;

          if (userId && tier && stripeCustomerId && stripeSubscriptionId) {
            const now = Date.now();
            const periodEnd = now + 30 * 24 * 60 * 60 * 1000; // ~30 days

            await fastify.db.insert(subscriptionsTable).values({
              id: randomUUID(),
              userId,
              stripeCustomerId,
              stripeSubscriptionId,
              tier: tier as "pro" | "epic" | "legendary",
              status: "active",
              callsUsed: 0,
              callsLimit: TIER_CALL_LIMITS[tier] ?? 500,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              createdAt: now,
              updatedAt: now,
            });

            // Upgrade user tier
            await fastify.db
              .update(usersTable)
              .set({
                tier: tier as "pro" | "epic" | "legendary",
                updatedAt: now,
              })
              .where(eq(usersTable.id, userId));
          }
          break;
        }

        case "invoice.paid": {
          // Renew subscription period
          const invoice = event.data.object as {
            subscription?: string;
            period_start?: number;
            period_end?: number;
          };
          const subId = invoice.subscription;
          if (subId && typeof subId === "string") {
            const now = Date.now();
            await fastify.db
              .update(subscriptionsTable)
              .set({
                status: "active",
                callsUsed: 0, // Reset usage each billing period
                currentPeriodStart: (invoice.period_start ?? 0) * 1000,
                currentPeriodEnd: (invoice.period_end ?? 0) * 1000,
                updatedAt: now,
              })
              .where(
                eq(subscriptionsTable.stripeSubscriptionId, subId),
              );
          }
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as { id: string; metadata?: Record<string, string> };
          const now = Date.now();
          await fastify.db
            .update(subscriptionsTable)
            .set({ status: "canceled", canceledAt: now, updatedAt: now })
            .where(eq(subscriptionsTable.stripeSubscriptionId, sub.id));

          // Downgrade user tier to free
          const activeSub = await fastify.db
            .select({ userId: subscriptionsTable.userId })
            .from(subscriptionsTable)
            .where(eq(subscriptionsTable.stripeSubscriptionId, sub.id))
            .limit(1);

          if (activeSub[0]) {
            await fastify.db
              .update(usersTable)
              .set({ tier: "free", updatedAt: now })
              .where(eq(usersTable.id, activeSub[0].userId));
          }
          break;
        }

        default:
          // Unhandled event — acknowledge and move on
          break;
      }

      return reply.send({ received: true });
    },
  );
};

// Re-export pricing helpers for use in metering middleware
export { PLATFORM_SHARE, CREATOR_SHARE, OVERAGE_PRICE_CENTS, TIER_CALL_LIMITS };
