/**
 * YigYaps AuditLogger — Hash-Chain Audit Logging
 *
 * Extracts the tamper-evident hash-chain audit logging pattern from
 * security.ts into a reusable helper. Uses a SERIALIZABLE transaction
 * to prevent the concurrency bug where two concurrent requests could
 * read the same prevHash and fork the chain.
 *
 * License: Apache 2.0
 */

import { eq, desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@yigyaps/db";
import { invocationLogsTable } from "@yigyaps/db";
import crypto from "crypto";
import { randomUUID } from "crypto";

export interface AuditLogParams {
  skillPackageId: string;
  apiClientId: string;
  conclusionText: string;
  costUsd?: string;
  expertSplit?: string;
  inferenceMs?: number;
}

export class AuditLogger {
  /**
   * Record a skill invocation in the tamper-evident hash-chain audit log.
   *
   * Uses a SERIALIZABLE transaction to prevent concurrent requests from
   * reading the same prevHash and forking the chain. Each entry's eventHash
   * incorporates the previous entry's hash, forming an append-only ledger.
   *
   * This method never throws — audit logging must not break the main request.
   * Errors are logged with console.warn.
   */
  static async logEvent(
    db: NodePgDatabase<typeof schema>,
    params: AuditLogParams,
  ): Promise<void> {
    try {
      const conclusionHash = crypto
        .createHash("sha256")
        .update(params.conclusionText)
        .digest("hex");

      await db.transaction(
        async (tx) => {
          // Read previous event hash within the serializable transaction.
          // SERIALIZABLE isolation prevents phantom reads: if two concurrent
          // transactions both SELECT the last row, PostgreSQL will detect the
          // serialization conflict and abort one of them (which we catch below).
          const lastLog = await tx
            .select({ eventHash: invocationLogsTable.eventHash })
            .from(invocationLogsTable)
            .where(eq(invocationLogsTable.skillPackageId, params.skillPackageId))
            .orderBy(desc(invocationLogsTable.createdAt))
            .limit(1);

          const prevHash = lastLog[0]?.eventHash ?? "GENESIS";

          const eventHash = crypto
            .createHash("sha256")
            .update(
              `${params.skillPackageId}${params.apiClientId}${conclusionHash}${prevHash}`,
            )
            .digest("hex");

          await tx.insert(invocationLogsTable).values({
            id: randomUUID(),
            skillPackageId: params.skillPackageId,
            apiClientId: params.apiClientId,
            costUsd: params.costUsd ?? null,
            expertSplit: params.expertSplit ?? null,
            inferenceMs: params.inferenceMs ?? null,
            conclusionHash,
            prevHash,
            eventHash,
            createdAt: Date.now(),
          });
        },
        { isolationLevel: "serializable" },
      );
    } catch (err) {
      // Audit logging must never break the main request flow.
      // Serialization failures (40001) are expected under high concurrency
      // and are acceptable — the invocation still succeeds, only the audit
      // entry is lost for that single request.
      console.warn("[AuditLogger] Failed to record audit log entry:", err);
    }
  }
}
