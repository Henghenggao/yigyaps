/**
 * YigYaps Database Schema — Stripe Connect & Subscriptions
 *
 * Sprint 7B #4: Stripe Connect integration tables.
 * Supports the marketplace split-payment model:
 *   Platform: 30%  →  YigYaps Stripe account
 *   Creator:  70%  →  Expert Stripe Connected account
 *
 * License: Apache 2.0
 */

import {
  pgTable,
  text,
  bigint,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";

import { usersTable } from "./users.js";
import { skillPackagesTable } from "./skill-packages.js";

// ─── Subscriptions ────────────────────────────────────────────────────────────

/**
 * Tracks active and past Stripe subscriptions per user.
 *
 * Tiers map to yy_users.tier:
 *   "free"      → 0 skill invocations included (pay-per-call)
 *   "pro"       → 500 invocations/month
 *   "epic"      → 2 000 invocations/month
 *   "legendary" → unlimited
 */
export const subscriptionsTable = pgTable(
  "yy_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    tier: text("tier")
      .$type<"free" | "pro" | "epic" | "legendary">()
      .notNull()
      .default("free"),
    status: text("status")
      .$type<"active" | "past_due" | "canceled" | "trialing">()
      .notNull()
      .default("active"),
    callsUsed: integer("calls_used").notNull().default(0),
    callsLimit: integer("calls_limit").notNull().default(0), // 0 = unlimited
    currentPeriodStart: bigint("current_period_start", {
      mode: "number",
    }).notNull(),
    currentPeriodEnd: bigint("current_period_end", {
      mode: "number",
    }).notNull(),
    canceledAt: bigint("canceled_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_subscriptions_user").on(table.userId),
    index("idx_yy_subscriptions_stripe_customer").on(table.stripeCustomerId),
    index("idx_yy_subscriptions_status").on(table.status),
  ],
);

export type SubscriptionRow = typeof subscriptionsTable.$inferSelect;
export type SubscriptionInsert = typeof subscriptionsTable.$inferInsert;

// ─── Usage Ledger ─────────────────────────────────────────────────────────────

/**
 * Immutable per-invocation cost record.
 * Written after every successful skill invoke that incurs a charge.
 * Used to: calculate royalties, drive Stripe metered billing, produce
 * creator payout reports.
 */
export const usageLedgerTable = pgTable(
  "yy_usage_ledger",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    skillPackageId: text("skill_package_id")
      .notNull()
      .references(() => skillPackagesTable.id, { onDelete: "cascade" }),
    /** Stripe subscription ID, if the call was covered by a subscription */
    stripeSubscriptionId: text("stripe_subscription_id"),
    /** USD cost billed to the user for this invocation */
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull(),
    /** Creator royalty (70% of costUsd by default) */
    creatorRoyaltyUsd: numeric("creator_royalty_usd", {
      precision: 10,
      scale: 4,
    }).notNull(),
    /** Stripe usage record ID for metered billing (if applicable) */
    stripeUsageRecordId: text("stripe_usage_record_id"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_usage_ledger_user").on(table.userId),
    index("idx_yy_usage_ledger_skill").on(table.skillPackageId),
    index("idx_yy_usage_ledger_created").on(table.createdAt),
  ],
);

export type UsageLedgerRow = typeof usageLedgerTable.$inferSelect;
export type UsageLedgerInsert = typeof usageLedgerTable.$inferInsert;
