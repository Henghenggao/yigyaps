/**
 * YigYaps Database Schema - YAPs
 *
 * A YAP is a publishable, installable, and runnable skills-pack plugin
 * container. It is distinct from the legacy single skill package model.
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
} from "drizzle-orm/pg-core";

export const yapsTable = pgTable(
  "yy_yaps",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    version: text("version").notNull().default("0.1.0"),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    readme: text("readme"),
    ownerId: text("owner_id").notNull(),
    ownerName: text("owner_name").notNull(),
    category: text("category").notNull().default("other"),
    tags: text("tags").array().notNull().default([]),
    visibility: text("visibility")
      .$type<"public" | "private" | "unlisted">()
      .notNull()
      .default("public"),
    status: text("status")
      .$type<"draft" | "active" | "archived">()
      .notNull()
      .default("active"),
    assemblyConfig: jsonb("assembly_config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    releasedAt: bigint("released_at", { mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_unique_yap_slug").on(table.slug),
    index("idx_yy_yaps_owner").on(table.ownerId),
    index("idx_yy_yaps_status").on(table.status),
    index("idx_yy_yaps_visibility").on(table.visibility),
  ],
);

export type YapRow = typeof yapsTable.$inferSelect;
export type YapInsert = typeof yapsTable.$inferInsert;
