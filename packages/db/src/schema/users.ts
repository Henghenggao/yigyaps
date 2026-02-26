/**
 * YigYaps Database Schema — Users & Authentication
 *
 * User accounts, API keys, and session management for GitHub OAuth authentication.
 * Part of Phase 2 authentication system.
 *
 * License: Apache 2.0
 */

import {
  pgTable,
  text,
  bigint,
  integer,
  boolean,
  numeric,
  index,
} from "drizzle-orm/pg-core";

// ─── Users Table ──────────────────────────────────────────────────────────────

export const usersTable = pgTable(
  "yy_users",
  {
    id: text("id").primaryKey(),
    githubId: text("github_id").notNull().unique(),
    githubUsername: text("github_username").notNull(),
    email: text("email"),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    tier: text("tier")
      .$type<"free" | "pro" | "epic" | "legendary">()
      .notNull()
      .default("free"),
    role: text("role").$type<"user" | "admin">().notNull().default("user"),
    bio: text("bio"),
    websiteUrl: text("website_url"),
    isVerifiedCreator: boolean("is_verified_creator").notNull().default(false),
    totalPackages: integer("total_packages").notNull().default(0),
    totalEarningsUsd: numeric("total_earnings_usd", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    lastLoginAt: bigint("last_login_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_users_github_id").on(table.githubId),
    index("idx_yy_users_github_username").on(table.githubUsername),
    index("idx_yy_users_email").on(table.email),
  ],
);

export type UserRow = typeof usersTable.$inferSelect;
export type UserInsert = typeof usersTable.$inferInsert;

// ─── API Keys Table ───────────────────────────────────────────────────────────

export const apiKeysTable = pgTable(
  "yy_api_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: text("key_prefix").notNull(),
    scopes: text("scopes").array().notNull(),
    lastUsedAt: bigint("last_used_at", { mode: "number" }),
    expiresAt: bigint("expires_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    revokedAt: bigint("revoked_at", { mode: "number" }),
  },
  (table) => [
    index("idx_yy_api_keys_user").on(table.userId),
    index("idx_yy_api_keys_hash").on(table.keyHash),
    index("idx_yy_api_keys_prefix").on(table.keyPrefix),
  ],
);

export type ApiKeyRow = typeof apiKeysTable.$inferSelect;
export type ApiKeyInsert = typeof apiKeysTable.$inferInsert;

// ─── Sessions Table ───────────────────────────────────────────────────────────

export const sessionsTable = pgTable(
  "yy_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    sessionToken: text("session_token").notNull().unique(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    lastActiveAt: bigint("last_active_at", { mode: "number" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("idx_yy_sessions_user").on(table.userId),
    index("idx_yy_sessions_token").on(table.sessionToken),
    index("idx_yy_sessions_expires").on(table.expiresAt),
  ],
);

export type SessionRow = typeof sessionsTable.$inferSelect;
export type SessionInsert = typeof sessionsTable.$inferInsert;
