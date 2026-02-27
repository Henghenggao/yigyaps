/**
 * YigYaps Database Schema — Content Reports
 *
 * User-submitted reports for content moderation.
 * Admins review and resolve via /v1/admin/reports.
 *
 * License: Apache 2.0
 */

import { pgTable, text, bigint, index } from "drizzle-orm/pg-core";

export const reportsTable = pgTable(
  "yy_reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id").notNull(),
    targetType: text("target_type")
      .$type<"skill_package" | "user">()
      .notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason")
      .$type<
        | "inappropriate_content"
        | "ip_theft"
        | "malicious_rules"
        | "spam"
        | "other"
      >()
      .notNull(),
    description: text("description"),
    status: text("status")
      .$type<"pending" | "resolved" | "dismissed">()
      .notNull()
      .default("pending"),
    adminNote: text("admin_note"),
    resolvedBy: text("resolved_by"),
    resolvedAt: bigint("resolved_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_reports_status").on(table.status),
    index("idx_yy_reports_reporter").on(table.reporterId),
    index("idx_yy_reports_target").on(table.targetId),
  ],
);

export type ReportRow = typeof reportsTable.$inferSelect;
export type ReportInsert = typeof reportsTable.$inferInsert;
