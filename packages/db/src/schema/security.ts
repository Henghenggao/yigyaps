/**
 * YigYaps Database Schema — Security and Telemetry
 *
 * Drizzle ORM table definitions for the YigYaps MVP Security Strategy.
 * Tables use the `yy_` prefix.
 *
 * License: Apache 2.0
 */

import {
  pgTable,
  text,
  bigint,
  integer,
  numeric,
  boolean,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";

import { skillPackagesTable } from "./skill-packages.js";

// Custom type for bytea
const buffer = customType<{ data: Buffer; driverData: string }>({
  dataType() {
    return "bytea";
  },
  toDriver(val: Buffer): string {
    return "\\x" + val.toString("hex");
  },
  fromDriver(value: string): Buffer {
    if (value.startsWith("\\x")) {
      return Buffer.from(value.slice(2), "hex");
    }
    return Buffer.from(value, "hex");
  },
});

export const encryptedKnowledgeTable = pgTable(
  "yy_encrypted_knowledge",
  {
    id: text("id").primaryKey(), // using text to match skill-packages style
    skillPackageId: text("skill_package_id")
      .notNull()
      .references(() => skillPackagesTable.id, { onDelete: "cascade" }),
    encryptedDek: text("encrypted_dek").notNull(),
    contentCiphertext: buffer("content_ciphertext").notNull(),
    contentHash: text("content_hash").notNull(),
    version: integer("version").notNull().default(1),
    /**
     * Soft-archive flag for knowledge versioning (migration 0008).
     * true  = current active version used for invoke/decrypt
     * false = archived version preserved for legal evidence / version history
     */
    isActive: boolean("is_active").notNull().default(true),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_encrypted_knowledge_package").on(table.skillPackageId),
    index("idx_yy_encrypted_knowledge_active").on(
      table.skillPackageId,
      table.isActive,
    ),
  ],
);

export type EncryptedKnowledgeRow = typeof encryptedKnowledgeTable.$inferSelect;
export type EncryptedKnowledgeInsert =
  typeof encryptedKnowledgeTable.$inferInsert;

export const invocationLogsTable = pgTable(
  "yy_invocation_logs",
  {
    id: text("id").primaryKey(),
    skillPackageId: text("skill_package_id").notNull(),
    apiClientId: text("api_client_id").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
    expertSplit: numeric("expert_split", { precision: 10, scale: 4 }),
    inferenceMs: integer("inference_ms"),
    conclusionHash: text("conclusion_hash").notNull(),
    /**
     * Hash-chain fields for tamper-evident audit log.
     * prevHash = eventHash of the previous log entry for this skill (or "GENESIS" for first).
     * eventHash = SHA-256(skillPackageId + apiClientId + conclusionHash + prevHash)
     * Verifiable via GET /v1/admin/audit-verify/:skillId
     */
    prevHash: text("prev_hash"),
    eventHash: text("event_hash"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_invocation_logs_package").on(table.skillPackageId),
    index("idx_yy_invocation_logs_client").on(table.apiClientId),
  ],
);

export type InvocationLogRow = typeof invocationLogsTable.$inferSelect;
export type InvocationLogInsert = typeof invocationLogsTable.$inferInsert;

export const ipRegistrationsTable = pgTable(
  "yy_ip_registrations",
  {
    id: text("id").primaryKey(),
    skillPackageId: text("skill_package_id")
      .notNull()
      .references(() => skillPackagesTable.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    blockchainTx: text("blockchain_tx").notNull(),
    registeredAt: bigint("registered_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_ip_registrations_package").on(table.skillPackageId),
  ],
);

export type IpRegistrationRow = typeof ipRegistrationsTable.$inferSelect;
export type IpRegistrationInsert = typeof ipRegistrationsTable.$inferInsert;

/**
 * Shamir Secret Sharing — (2,3) threshold shares for DEK protection.
 *
 * Each encrypted knowledge entry can optionally have its DEK split into 3 shares:
 *   share_index 1 → platform DB     (custodian: "platform")
 *   share_index 2 → expert local    (custodian: "expert", returned to client)
 *   share_index 3 → platform backup (custodian: "backup")
 *
 * Reconstructing DEK requires any 2 of 3 shares.
 * Expert revocation = delete all shares → crypto-shredding.
 */
export const shamirSharesTable = pgTable(
  "yy_shamir_shares",
  {
    id: text("id").primaryKey(),
    skillPackageId: text("skill_package_id")
      .notNull()
      .references(() => skillPackagesTable.id, { onDelete: "cascade" }),
    shareIndex: integer("share_index").notNull(),
    shareData: text("share_data").notNull(),
    custodian: text("custodian").notNull(), // "platform" | "expert" | "backup"
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_shamir_shares_package").on(table.skillPackageId),
    uniqueIndex("uq_yy_shamir_shares_pkg_idx").on(
      table.skillPackageId,
      table.shareIndex,
    ),
  ],
);

export type ShamirShareRow = typeof shamirSharesTable.$inferSelect;
export type ShamirShareInsert = typeof shamirSharesTable.$inferInsert;
