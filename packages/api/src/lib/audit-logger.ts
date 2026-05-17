/**
 * YigYaps AuditLogger - hash-chain audit logging.
 *
 * Uses a SERIALIZABLE transaction so concurrent requests cannot read the same
 * previous hash and silently fork the audit chain.
 *
 * License: Apache 2.0
 */

import { desc, eq } from "drizzle-orm";
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

export interface AuditLogOptions {
  /**
   * When true, throw after retries instead of only warning. Use for routes
   * where an invocation must not be returned unless the audit ledger is durable.
   */
  failClosed?: boolean;
  maxRetries?: number;
}

export class AuditLogger {
  /**
   * Record a skill invocation in the tamper-evident hash-chain audit log.
   *
   * By default this preserves the old best-effort behavior and logs failures.
   * Pass failClosed=true for secure paths that must not return an invocation
   * result unless the audit row has been durably appended.
   */
  static async logEvent(
    db: NodePgDatabase<typeof schema>,
    params: AuditLogParams,
    options: AuditLogOptions = {},
  ): Promise<void> {
    const maxRetries = options.maxRetries ?? 2;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const conclusionHash = crypto
          .createHash("sha256")
          .update(params.conclusionText)
          .digest("hex");

        await db.transaction(
          async (tx) => {
            const lastLog = await tx
              .select({ eventHash: invocationLogsTable.eventHash })
              .from(invocationLogsTable)
              .where(
                eq(invocationLogsTable.skillPackageId, params.skillPackageId),
              )
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
        return;
      } catch (err) {
        if (isSerializationFailure(err) && attempt < maxRetries) {
          continue;
        }

        if (options.failClosed) {
          throw err;
        }

        console.warn("[AuditLogger] Failed to record audit log entry:", err);
        return;
      }
    }
  }
}

function isSerializationFailure(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "40001"
  );
}
