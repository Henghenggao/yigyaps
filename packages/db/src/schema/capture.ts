/**
 * YigYaps Database Schema — Capture & Validation System
 *
 * Tables for the blind interviewer architecture:
 * - yy_capture_sessions: Session lifecycle (state machine)
 * - yy_skill_corpus: Per-QA encrypted entries (knowledge graph)
 * - yy_skill_tests: Validation records (expert verdicts)
 *
 * License: Apache 2.0
 */

import {
  pgTable,
  text,
  bigint,
  integer,
  index,
  customType,
} from "drizzle-orm/pg-core";

import { skillPackagesTable } from "./skill-packages.js";

// Custom type for bytea (matches security.ts pattern)
const buffer = customType<{ data: Buffer; driverData: string }>({
  dataType() {
    return "bytea";
  },
  toDriver(val: Buffer): string {
    return "\\x" + val.toString("hex");
  },
  fromDriver(value: string): Buffer {
    const v = value as unknown;
    if (Buffer.isBuffer(v)) {
      return v as Buffer;
    }
    if (value.startsWith("\\x")) {
      return Buffer.from(value.slice(2), "hex");
    }
    return Buffer.from(value, "hex");
  },
});

// ─── Capture Sessions ─────────────────────────────────────────────────────────
//
// State machine:
//   draft -> active -> paused -> active -> completed -> published
//                  \-> abandoned       \-> active (validation reveals gaps)
//

export const captureSessionsTable = pgTable(
  "yy_capture_sessions",
  {
    id: text("id").primaryKey(),
    skillPackageId: text("skill_package_id")
      .notNull()
      .references(() => skillPackagesTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    domainTemplateId: text("domain_template_id").notNull(),
    status: text("status")
      .$type<
        "draft" | "active" | "paused" | "completed" | "published" | "abandoned"
      >()
      .notNull()
      .default("draft"),
    currentRound: integer("current_round").notNull().default(0),
    /** Cached DEK (KEK-encrypted) for the session duration. Zeroed on pause/end. */
    sessionEncryptedDek: text("session_encrypted_dek"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    pausedAt: bigint("paused_at", { mode: "number" }),
    completedAt: bigint("completed_at", { mode: "number" }),
    publishedAt: bigint("published_at", { mode: "number" }),
  },
  (table) => [
    index("idx_yy_capture_sessions_user").on(table.userId),
    index("idx_yy_capture_sessions_package").on(table.skillPackageId),
    index("idx_yy_capture_sessions_status").on(table.status),
  ],
);

export type CaptureSessionRow = typeof captureSessionsTable.$inferSelect;
export type CaptureSessionInsert = typeof captureSessionsTable.$inferInsert;

// ─── Skill Corpus (QA Pairs) ─────────────────────────────────────────────────
//
// Each expert answer is individually encrypted with the skill's shared DEK.
// Tags and scenario_type are plaintext for coverage tracking.
// Knowledge graph: parent_qa_id + related_qa_ids enable lineage tracking.
//

export const skillCorpusTable = pgTable(
  "yy_skill_corpus",
  {
    id: text("id").primaryKey(),
    skillPackageId: text("skill_package_id")
      .notNull()
      .references(() => skillPackagesTable.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => captureSessionsTable.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    /** AES-256-GCM encrypted expert answer (IV + AuthTag + Ciphertext) */
    encryptedAnswer: buffer("encrypted_answer").notNull(),
    tags: text("tags").array().notNull().default([]),
    scenarioType: text("scenario_type")
      .$type<
        | "structured_interview"
        | "case_judgment"
        | "scenario_simulation"
        | "apprentice_correction"
      >()
      .notNull(),
    complexity: text("complexity")
      .$type<"L1" | "L2" | "L3">()
      .notNull()
      .default("L1"),
    source: text("source")
      .$type<
        | "structured_interview"
        | "case_judgment"
        | "scenario_simulation"
        | "apprentice_correction"
      >()
      .notNull(),
    /** Knowledge graph: parent QA that this entry was derived from */
    parentQaId: text("parent_qa_id"),
    /** Knowledge graph: related QA entries for lineage tracking */
    relatedQaIds: text("related_qa_ids").array(),
    /** Cached KEK-encrypted DEK for production invocations (set at publish time) */
    cachedEncryptedDek: text("cached_encrypted_dek"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_skill_corpus_package").on(table.skillPackageId),
    index("idx_yy_skill_corpus_session").on(table.sessionId),
    index("idx_yy_skill_corpus_tags").on(table.tags),
    index("idx_yy_skill_corpus_scenario").on(table.scenarioType),
  ],
);

export type SkillCorpusRow = typeof skillCorpusTable.$inferSelect;
export type SkillCorpusInsert = typeof skillCorpusTable.$inferInsert;

// ─── Skill Tests (Validation Records) ────────────────────────────────────────
//
// Each test record stores a variation question, the AI's answer,
// and the expert's verdict. Corrections create new corpus entries.
//

export const skillTestsTable = pgTable(
  "yy_skill_tests",
  {
    id: text("id").primaryKey(),
    skillPackageId: text("skill_package_id")
      .notNull()
      .references(() => skillPackagesTable.id, { onDelete: "cascade" }),
    sourceQaId: text("source_qa_id")
      .notNull()
      .references(() => skillCorpusTable.id),
    variationType: text("variation_type")
      .$type<
        "condition_swap" | "param_extreme" | "negation" | "scenario_merge"
      >()
      .notNull(),
    generatedQuestion: text("generated_question").notNull(),
    aiAnswer: text("ai_answer").notNull(),
    expertVerdict: text("expert_verdict")
      .$type<"pending" | "correct" | "partial" | "wrong">()
      .notNull(),
    /** Expert correction text (creates new corpus entry if non-null) */
    expertCorrection: text("expert_correction"),
    /** ID of the new corpus entry created from this correction */
    correctionQaId: text("correction_qa_id"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_yy_skill_tests_package").on(table.skillPackageId),
    index("idx_yy_skill_tests_source").on(table.sourceQaId),
    index("idx_yy_skill_tests_verdict").on(table.expertVerdict),
  ],
);

export type SkillTestRow = typeof skillTestsTable.$inferSelect;
export type SkillTestInsert = typeof skillTestsTable.$inferInsert;
