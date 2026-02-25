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
    index,
    uuid,
    customType,
} from "drizzle-orm/pg-core";

import { skillPackagesTable } from "./skill-packages.js";

// Custom type for bytea
const buffer = customType<{ data: Buffer; driverData: string }>({
    dataType() {
        return 'bytea';
    },
    toDriver(val: Buffer): string {
        return '\\x' + val.toString('hex');
    },
    fromDriver(value: string): Buffer {
        if (value.startsWith('\\x')) {
            return Buffer.from(value.slice(2), 'hex');
        }
        return Buffer.from(value, 'hex');
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
        createdAt: bigint("created_at", { mode: "number" }).notNull(),
    },
    (table) => [
        index("idx_yy_encrypted_knowledge_package").on(table.skillPackageId),
    ],
);

export type EncryptedKnowledgeRow = typeof encryptedKnowledgeTable.$inferSelect;
export type EncryptedKnowledgeInsert = typeof encryptedKnowledgeTable.$inferInsert;

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
