/**
 * YigYaps Metering Middleware — Sprint 7C #6
 *
 * Quota check + usage recording for skill invocations.
 *
 * Flow:
 *   1. checkQuota(db, userId, tier) → QuotaResult
 *      - free tier:   always allowed (pay-per-call at OVERAGE_PRICE_CENTS)
 *      - pro / epic:  allowed; included calls are $0, overage is pay-per-call
 *      - legendary:   always allowed, $0 per call
 *
 *   2. recordInvocation(db, userId, skillPackageId, quota) → void
 *      - Writes an immutable row to yy_usage_ledger
 *      - Atomically increments callsUsed on the subscription for included calls
 *
 * Called from the invoke route in security.ts:
 *   checkQuota() BEFORE decrypting; recordInvocation() AFTER conclusion.
 *
 * License: Apache 2.0
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@yigyaps/db";
import { subscriptionsTable, usageLedgerTable } from "@yigyaps/db";
import { OVERAGE_PRICE_CENTS, CREATOR_SHARE } from "../routes/stripe.js";

type DB = NodePgDatabase<typeof schema>;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuotaResult {
  /** Whether the call may proceed */
  allowed: boolean;
  /** Human-readable denial reason (only set when allowed = false) */
  reason?: string;
  /** Active subscription ID — used to increment callsUsed after success */
  subscriptionId?: string;
  /** Cost billed to the user for this invocation in USD */
  costUsd: number;
  /** Creator royalty (70 % of costUsd) in USD */
  creatorRoyaltyUsd: number;
  /** Whether this call was an overage (beyond subscription quota) */
  isOverage: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OVERAGE_USD = OVERAGE_PRICE_CENTS / 100; // $0.05

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getActiveSub(db: DB, userId: string) {
  const rows = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.userId, userId),
        eq(subscriptionsTable.status, "active"),
      ),
    )
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Determine whether the user can make one more invocation and
 * what it will cost them.
 */
export async function checkQuota(
  db: DB,
  userId: string,
  tier: string,
): Promise<QuotaResult> {
  const royalty = (usd: number) =>
    parseFloat((usd * CREATOR_SHARE).toFixed(4));

  // Free tier — pay-per-call, no quota to exhaust
  if (tier === "free") {
    return {
      allowed: true,
      costUsd: OVERAGE_USD,
      creatorRoyaltyUsd: royalty(OVERAGE_USD),
      isOverage: true,
    };
  }

  const sub = await getActiveSub(db, userId);

  // JWT says paid but no active sub row → fall back to pay-per-call
  if (!sub) {
    return {
      allowed: true,
      costUsd: OVERAGE_USD,
      creatorRoyaltyUsd: royalty(OVERAGE_USD),
      isOverage: true,
    };
  }

  // legendary: callsLimit = 0 → unlimited, no charge
  if (sub.callsLimit === 0) {
    return {
      allowed: true,
      subscriptionId: sub.id,
      costUsd: 0,
      creatorRoyaltyUsd: 0,
      isOverage: false,
    };
  }

  // pro / epic: within quota → included call ($0)
  if (sub.callsUsed < sub.callsLimit) {
    return {
      allowed: true,
      subscriptionId: sub.id,
      costUsd: 0,
      creatorRoyaltyUsd: 0,
      isOverage: false,
    };
  }

  // Over quota → pay-per-call overage
  return {
    allowed: true,
    subscriptionId: sub.id,
    costUsd: OVERAGE_USD,
    creatorRoyaltyUsd: royalty(OVERAGE_USD),
    isOverage: true,
  };
}

/**
 * Record a completed invocation:
 *   1. Append an immutable row to yy_usage_ledger
 *   2. Atomically increment callsUsed for included (non-overage) calls
 *
 * Must be called only after a successful conclusion has been produced.
 */
export async function recordInvocation(
  db: DB,
  userId: string,
  skillPackageId: string,
  quota: QuotaResult,
): Promise<void> {
  const now = Date.now();

  // Always write ledger entry (even $0 — needed for royalty reporting)
  await db.insert(usageLedgerTable).values({
    id: randomUUID(),
    userId,
    skillPackageId,
    stripeSubscriptionId: quota.subscriptionId ?? null,
    costUsd: quota.costUsd.toFixed(4),
    creatorRoyaltyUsd: quota.creatorRoyaltyUsd.toFixed(4),
    stripeUsageRecordId: null,
    createdAt: now,
  });

  // Increment quota counter for included (non-overage) subscription calls
  if (quota.subscriptionId && !quota.isOverage) {
    await db
      .update(subscriptionsTable)
      .set({
        callsUsed: sql`${subscriptionsTable.callsUsed} + 1`,
        updatedAt: now,
      })
      .where(eq(subscriptionsTable.id, quota.subscriptionId));
  }
}
