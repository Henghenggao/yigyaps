/**
 * YigYaps Database Schema - Skill Packs
 *
 * Skill Packs are mountable modules inside a YAP. They preserve SkillPack
 * Bridge artifacts such as skillpack.json, routes.json, tool-map.json, and
 * schemas without flattening them into legacy rule packages.
 *
 * License: Apache 2.0
 */

import {
  pgTable,
  text,
  bigint,
  jsonb,
  index,
  uniqueIndex,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { yapsTable } from "./yaps.js";

export const skillPacksTable = pgTable(
  "yy_skill_packs",
  {
    id: text("id").primaryKey(),
    yapId: text("yap_id")
      .notNull()
      .references(() => yapsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    version: text("version").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    packType: text("pack_type")
      .$type<"core" | "extension">()
      .notNull()
      .default("extension"),
    contractVersion: text("contract_version").notNull().default("1.0"),
    compatibility: jsonb("compatibility")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    manifest: jsonb("manifest")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    source: text("source")
      .$type<"manual" | "imported" | "generated">()
      .notNull()
      .default("manual"),
    status: text("status")
      .$type<"draft" | "active" | "archived">()
      .notNull()
      .default("active"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    releasedAt: bigint("released_at", { mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_unique_skill_pack_version").on(
      table.yapId,
      table.name,
      table.version,
    ),
    index("idx_yy_skill_packs_yap").on(table.yapId),
    index("idx_yy_skill_packs_name").on(table.name),
    index("idx_yy_skill_packs_status").on(table.status),
  ],
);

export const skillPackArtifactsTable = pgTable(
  "yy_skill_pack_artifacts",
  {
    id: text("id").primaryKey(),
    skillPackId: text("skill_pack_id")
      .notNull()
      .references(() => skillPacksTable.id, { onDelete: "cascade" }),
    artifactType: text("artifact_type")
      .$type<
        | "skillpack"
        | "tool-map"
        | "routes"
        | "feedback"
        | "update"
        | "schema"
        | "command"
        | "eval"
        | "fixture"
        | "quality-report"
        | "skill-md"
        | "other"
      >()
      .notNull(),
    artifactPath: text("artifact_path").notNull(),
    mediaType: text("media_type").notNull().default("application/json"),
    content: jsonb("content").$type<unknown>().notNull(),
    contentSha256: text("content_sha256").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_unique_skill_pack_artifact").on(
      table.skillPackId,
      table.artifactType,
      table.artifactPath,
    ),
    index("idx_yy_skill_pack_artifacts_pack").on(table.skillPackId),
    index("idx_yy_skill_pack_artifacts_type").on(table.artifactType),
  ],
);

export const yapPackMountsTable = pgTable(
  "yy_yap_pack_mounts",
  {
    id: text("id").primaryKey(),
    yapId: text("yap_id")
      .notNull()
      .references(() => yapsTable.id, { onDelete: "cascade" }),
    skillPackId: text("skill_pack_id")
      .notNull()
      .references(() => skillPacksTable.id, { onDelete: "cascade" }),
    mountKey: text("mount_key").notNull(),
    mountPoint: text("mount_point").notNull().default("extensions"),
    displayName: text("display_name").notNull(),
    priority: integer("priority").notNull().default(100),
    enabled: boolean("enabled").notNull().default(true),
    required: boolean("required").notNull().default(false),
    config: jsonb("config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    constraints: jsonb("constraints")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_unique_yap_mount_key").on(table.yapId, table.mountKey),
    index("idx_yy_yap_pack_mounts_yap").on(table.yapId),
    index("idx_yy_yap_pack_mounts_pack").on(table.skillPackId),
    index("idx_yy_yap_pack_mounts_enabled").on(table.enabled),
  ],
);

export type SkillPackRow = typeof skillPacksTable.$inferSelect;
export type SkillPackInsert = typeof skillPacksTable.$inferInsert;
export type SkillPackArtifactRow =
  typeof skillPackArtifactsTable.$inferSelect;
export type SkillPackArtifactInsert =
  typeof skillPackArtifactsTable.$inferInsert;
export type YapPackMountRow = typeof yapPackMountsTable.$inferSelect;
export type YapPackMountInsert = typeof yapPackMountsTable.$inferInsert;
