/**
 * YigYaps Security Routes MVP
 *
 * Implements endpoints to test the Encryption Pipeline (Phase 1)
 * and Software Enclave Isolation (Phase 2).
 *
 * License: Apache 2.0
 */

import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import { KMS } from "../lib/kms.js";
import { RuleEngine, type RuleEvaluation } from "../lib/rule-engine.js";
import { CKKSPoC } from "../lib/ckks.js";
import { registerIpTimestamp } from "../lib/ip-timestamp.js";
import { SecureBuffer } from "../middleware/memory-zeroizer.js";
import { checkQuota, recordInvocation } from "../middleware/metering.js";
import {
  encryptedKnowledgeTable,
  invocationLogsTable,
  ipRegistrationsTable,
  shamirSharesTable,
  skillCorpusTable,
} from "@yigyaps/db";
import { SkillPackageDAL, SkillRuleDAL, SkillCorpusDAL } from "@yigyaps/db";
import { ShamirManager } from "../lib/shamir.js";
import { InferenceEngine } from "../lib/inference-engine.js";
import { AnthropicProvider } from "../lib/llm-provider.js";
import { AuditLogger } from "../lib/audit-logger.js";
import {
  DekRecoveryError,
  SHAMIR_ONLY_ENCRYPTED_DEK,
  recoverDek,
  readExpertShareHeader,
} from "../lib/dek-policy.js";
import { eq, desc, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireAuth } from "../middleware/auth-v2.js";
import { env } from "../lib/env.js";

const encryptBodySchema = z.object({
  plaintextRules: z.string().max(100_000),
});

const invokeBodySchema = z.object({
  user_query: z.string().min(1).max(10_000).optional(),
  /**
   * Expert's own Anthropic API key for Lab Preview mode (Mode C).
   * ONLY valid when the caller is the package author.
   * When provided, inference uses this key directly — the YigYaps platform key
   * is NOT used. The data agreement is then between the expert and Anthropic.
   * This key is never stored; it is used only for this single request.
   * Non-authors supplying this field receive a 403.
   */
  lab_api_key: z.string().optional(),
  /**
   * Expert's Shamir share (share_index 2) for DEK reconstruction.
   * Required when the skill uses Shamir key splitting.
   * Combined with the platform's share (index 1) to reconstruct the DEK.
   */
  expert_share: z.string().optional(),
});

const paramsSchema = z.object({
  packageId: z.string().min(1),
});

type DekRecoverySurface = "rules" | "corpus";

export const securityRoutes: FastifyPluginAsync = async (fastify) => {
  const auditDekRecoveryFailure = async (
    request: FastifyRequest,
    skillPackageId: string,
    callerId: string,
    surface: DekRecoverySurface,
    code: string,
  ) => {
    await AuditLogger.logEvent(fastify.db, {
      skillPackageId,
      apiClientId: callerId,
      conclusionText: `blocked:dek-recovery:${surface}:${code}`,
    });
    request.log.warn(
      { skillPackageId, callerId, surface, code },
      "Blocked DEK recovery attempt",
    );
  };

  /**
   * Encrypt and store knowledge on the edge/client simulator
   * This represents the end of the "Extraction Pipeline" where data goes to the Vault.
   * Uses UPSERT semantics: any existing knowledge for this package is replaced.
   */
  fastify.post(
    "/knowledge/:packageId",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = paramsSchema.safeParse(request.params);
      const bodyParsed = encryptBodySchema.safeParse(request.body);

      if (!paramsParsed.success || !bodyParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: paramsParsed.error?.issues || bodyParsed.error?.issues,
        });
      }

      const { packageId } = paramsParsed.data;
      const { plaintextRules } = bodyParsed.data;

      // Resolve slug to internal package ID to satisfy FK constraint
      const pkgDAL = new SkillPackageDAL(fastify.db);
      const pkg = await pkgDAL.getByPackageId(packageId);
      if (!pkg) {
        return reply.code(404).send({ error: "Package not found" });
      }
      const internalId = pkg.id;

      // Only the package author can upload knowledge for their skill
      const userId = request.user?.userId;
      if (pkg.author !== userId) {
        return reply
          .code(403)
          .send({ error: "Only the package author can upload knowledge" });
      }

      // 1. Generate DEK
      const dek = KMS.generateDek();

      // 2. Encrypt Knowledge using DEK
      const contentCiphertext = KMS.encryptKnowledge(plaintextRules, dek);

      // 3. Hash the original plaintext for IP Registration verification
      const contentHash = crypto
        .createHash("sha256")
        .update(plaintextRules)
        .digest("hex");

      // 4. IP Timestamp Proof (Sprint 7B #11)
      //    Primary: GitHub evidence commit -> "github:<sha>" (publicly verifiable)
      //    Fallback: HMAC-SHA256 -> "sha256:<hex>" (platform-verifiable)
      const blockchainTx = await registerIpTimestamp(
        packageId,
        contentHash,
        userId ?? "unknown",
      );
      await fastify.db.insert(ipRegistrationsTable).values({
        id: randomUUID(),
        skillPackageId: internalId,
        contentHash,
        blockchainTx,
        registeredAt: Date.now(),
      });

      // 5. Soft-archive the current active version, then insert the new one.
      //    Old versions are preserved (isActive=false) for legal evidence and version history.
      //    This replaces the previous DELETE+INSERT pattern.
      await fastify.db
        .update(encryptedKnowledgeTable)
        .set({ isActive: false })
        .where(
          and(
            eq(encryptedKnowledgeTable.skillPackageId, internalId),
            eq(encryptedKnowledgeTable.isActive, true),
          ),
        );

      await fastify.db.insert(encryptedKnowledgeTable).values({
        id: randomUUID(),
        skillPackageId: internalId,
        // Schema-compatible marker: new uploads do not store a KEK-decryptable DEK.
        encryptedDek: SHAMIR_ONLY_ENCRYPTED_DEK,
        contentCiphertext,
        contentHash,
        isActive: true,
        createdAt: Date.now(),
      });

      // 6. Shamir (2,3) secret sharing - split the plaintext DEK into 3 shares.
      //    Share 1 (platform) is stored in DB.
      //    Share 2 (expert) is returned to the caller and NEVER stored.
      //    Share 3 is not stored by the platform in the default security model.
      //    Invocation requires platform share + expert share.
      // Default persisted state stores only the platform share. The expert
      // receives share 2; share 3 is reserved for external recovery.
      const dekHex = dek.toString("hex");
      const { shares } = ShamirManager.split(dekHex);
      const now = Date.now();

      // Delete old shares for this package before inserting new ones
      await fastify.db
        .delete(shamirSharesTable)
        .where(eq(shamirSharesTable.skillPackageId, internalId));

      await fastify.db.insert(shamirSharesTable).values({
        id: randomUUID(),
        skillPackageId: internalId,
        shareIndex: 1,
        shareData: shares[0],
        custodian: "platform",
        createdAt: now,
      });

      return reply.send({
        success: true,
        message: "Knowledge encrypted and saved with Shamir key splitting.",
        expert_share: shares[1],
        shamir_notice:
          "IMPORTANT: Save your expert share securely. It is required to invoke this skill and is NOT stored on the platform. Losing it means the Shamir invocation path cannot reconstruct the key.",
      });
    },
  );

  /**
   * Retrieve and decrypt knowledge for the package author only.
   * This endpoint exists to support the Evolution Lab — authors can load
   * their current rules into the editor to refine and re-upload them.
   * Security model: rules are only visible to the author who created them.
   */
  fastify.get(
    "/knowledge/:packageId",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = paramsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({ error: "Bad Request" });
      }
      const { packageId } = paramsParsed.data;

      const pkgDAL = new SkillPackageDAL(fastify.db);
      const pkg = await pkgDAL.getByPackageId(packageId);
      if (!pkg) {
        return reply.code(404).send({ error: "Package not found" });
      }

      const userId = request.user?.userId;
      if (pkg.author !== userId) {
        return reply
          .code(403)
          .send({ error: "Only the package author can access their knowledge" });
      }

      const knowledgeRecords = await fastify.db
        .select()
        .from(encryptedKnowledgeTable)
        .where(
          and(
            eq(encryptedKnowledgeTable.skillPackageId, pkg.id),
            eq(encryptedKnowledgeTable.isActive, true),
          ),
        )
        .limit(1);

      if (!knowledgeRecords.length) {
        return reply
          .code(404)
          .send({ error: "No knowledge uploaded for this skill yet." });
      }

      const record = knowledgeRecords[0];
      const expertShare = readExpertShareHeader(request.headers);

      const shamirShares = await fastify.db
        .select()
        .from(shamirSharesTable)
        .where(eq(shamirSharesTable.skillPackageId, pkg.id));

      let recovery: { dek: Buffer; keyMode: "shamir" | "legacy-kms" };
      try {
        recovery = await recoverDek({
          shares: shamirShares,
          expertShare,
          legacyEncryptedDek: record.encryptedDek,
          decryptLegacyDek: (encryptedDek) => KMS.decryptDek(encryptedDek),
        });
      } catch (error) {
        if (error instanceof DekRecoveryError) {
          if (error.code === "SHAMIR_SHARE_REQUIRED") {
            return reply.code(400).send({
              error: "Shamir Share Required",
              message:
                "This skill uses Shamir key splitting. Provide x-yigyaps-expert-share to retrieve plaintext rules.",
            });
          }
          if (error.code === "INVALID_EXPERT_SHARE") {
            return reply.code(400).send({
              error: "Bad Request",
              message: "Invalid expert share.",
            });
          }
          if (error.code === "DEK_RECOVERY_UNAVAILABLE") {
            return reply.code(409).send({
              error: "DEK Recovery Unavailable",
              message:
                "This knowledge was uploaded in Shamir-only mode, but no platform share is available.",
            });
          }
        }
        throw error;
      }

      const plaintextRules = KMS.decryptKnowledge(
        record.contentCiphertext as Buffer,
        recovery.dek,
      );

      return reply.send({ plaintextRules, key_mode: recovery.keyMode });
    },
  );

  /**
   * Invoke the skill using a three-mode security model:
   *
   *   Mode A (local):     Default for all callers. Rules are evaluated entirely
   *                       in-process by RuleEngine. No plaintext ever leaves the server.
   *
   *   Mode B (hybrid):    Local RuleEngine produces a structured skeleton; an external
   *                       LLM is asked only to polish the natural language.
   *                       Only the skeleton (scores + conclusion tokens) is transmitted.
   *
   *   Mode C (lab-preview): Author-only testing mode. Sends plaintext rules to an
   *                         external LLM. Requires lab_api_key and author identity.
   *                         Shown with explicit data-exposure warning in the UI.
   *
   * Anti-scraping: 20 calls / 10 min per (user × skill) enforced before decryption.
   */
  fastify.post(
    "/invoke/:packageId",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = paramsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: paramsParsed.error.issues,
        });
      }
      const { packageId } = paramsParsed.data;

      const bodyParsed = invokeBodySchema.safeParse(request.body ?? {});
      if (!bodyParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: bodyParsed.error.issues,
        });
      }

      const userQuery =
        bodyParsed.data?.user_query ??
        "Evaluate this skill and describe what it does.";
      const labApiKey = bodyParsed.data?.lab_api_key;

      // Resolve slug to internal ID
      const pkgDAL = new SkillPackageDAL(fastify.db);
      const pkg = await pkgDAL.getByPackageId(packageId);
      if (!pkg) {
        return reply.code(404).send({ error: "Package not found" });
      }

      const callerId = request.user?.userId ?? "anonymous";

      // ── Anti-Scraping Guard ───────────────────────────────────────────────
      // Limit: 20 invocations per 10 minutes per (user × skill).
      // Uses sql`` template for bigint timestamp comparison (same pattern as admin stats).
      const windowStart = Date.now() - 10 * 60 * 1000;
      const recentCallsResult = await fastify.db
        .select({ id: invocationLogsTable.id })
        .from(invocationLogsTable)
        .where(
          sql`${invocationLogsTable.skillPackageId} = ${pkg.id}
              AND ${invocationLogsTable.apiClientId} = ${callerId}
              AND ${invocationLogsTable.createdAt} > ${windowStart}`,
        )
        .limit(21);

      if (recentCallsResult.length > 20) {
        return reply.code(429).send({
          error: "Too Many Requests",
          message: "Unusual access pattern detected. Please try again later.",
          retry_after: 600,
        });
      }

      // ── Quota check (metering) ────────────────────────────────────────────
      const callerTier = request.user?.tier ?? "free";
      const quota = await checkQuota(fastify.db, callerId, callerTier);
      if (!quota.allowed) {
        return reply.code(402).send({
          error: "Payment Required",
          message: quota.reason ?? "Subscription quota exhausted.",
        });
      }

      // ── Corpus path: knowledge_type routing ────────────────────────────
      if (pkg.knowledgeType === "corpus") {
        const expertShare = bodyParsed.data?.expert_share;

        const shamirShares = await fastify.db
          .select()
          .from(shamirSharesTable)
          .where(eq(shamirSharesTable.skillPackageId, pkg.id));

        const cachedEntries = await fastify.db
          .select({ cachedEncryptedDek: skillCorpusTable.cachedEncryptedDek })
          .from(skillCorpusTable)
          .where(eq(skillCorpusTable.skillPackageId, pkg.id))
          .limit(1);

        let dek: Buffer;
        try {
          const recovery = await recoverDek({
            shares: shamirShares,
            expertShare,
            legacyEncryptedDek: cachedEntries[0]?.cachedEncryptedDek ?? null,
            decryptLegacyDek: (encryptedDek) => KMS.decryptDek(encryptedDek),
          });
          dek = recovery.dek;
        } catch (error) {
          if (error instanceof DekRecoveryError) {
            if (error.code === "SHAMIR_SHARE_REQUIRED") {
              await auditDekRecoveryFailure(
                request,
                pkg.id,
                callerId,
                "corpus",
                error.code,
              );
              return reply.code(400).send({
                error: "Shamir Share Required",
                message: "Provide expert_share to invoke this corpus skill.",
              });
            }
            if (error.code === "INVALID_EXPERT_SHARE") {
              await auditDekRecoveryFailure(
                request,
                pkg.id,
                callerId,
                "corpus",
                error.code,
              );
              return reply.code(400).send({
                error: "Bad Request",
                message: "Invalid expert share.",
              });
            }
            if (
              error.code === "DEK_RECOVERY_UNAVAILABLE" ||
              error.code === "LEGACY_DEK_DECRYPT_FAILED"
            ) {
              return reply.code(404).send({
                error: "No encryption keys found for this skill.",
              });
            }
          }
          throw error;
        }

        if (!env.ANTHROPIC_API_KEY) {
          return reply.code(503).send({
            error: "Service Unavailable",
            message: "LLM provider not configured",
          });
        }

        const llm = new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY });
        const inferenceResult = await InferenceEngine.invoke({
          db: fastify.db,
          llm,
          skillPackageId: pkg.id,
          userQuery,
          dek,
          skillName: pkg.displayName,
        });

        await AuditLogger.logEvent(fastify.db, {
          skillPackageId: pkg.id,
          apiClientId: callerId,
          conclusionText: inferenceResult.text,
          inferenceMs: inferenceResult.inferenceMs,
        }, {
          failClosed: true,
        });

        await recordInvocation(fastify.db, callerId, pkg.id, quota);

        return reply.send({
          success: true,
          conclusion: inferenceResult.text,
          mode: "corpus",
          privacy_notice:
            "CORPUS MODE - Expert knowledge is decrypted server-side and sent to the configured LLM provider for synthesis. Responses are checked for long verbatim leakage before release.",
          qa_count: inferenceResult.qaCount,
          inference_ms: inferenceResult.inferenceMs,
          leakage_blocked: inferenceResult.leakageBlocked,
        });
      }

      // ── Mode C gate: lab_api_key requires author identity ────────────────
      if (labApiKey && pkg.author !== callerId) {
        return reply.code(403).send({
          error: "Forbidden",
          message:
            "Lab preview mode (lab_api_key) is only available to the package author.",
        });
      }

      const knowledgeRecords = await fastify.db
        .select()
        .from(encryptedKnowledgeTable)
        .where(
          and(
            eq(encryptedKnowledgeTable.skillPackageId, pkg.id),
            eq(encryptedKnowledgeTable.isActive, true),
          ),
        )
        .orderBy(desc(encryptedKnowledgeTable.createdAt))
        .limit(1);

      if (!knowledgeRecords.length) {
        // Fallback: check for plaintext rules in yy_skill_rules (e.g. seed/demo skills)
        const ruleDAL = new SkillRuleDAL(fastify.db);
        const ruleRows = await ruleDAL.getByPackage(pkg.id);
        const rulesContent =
          ruleRows.find((r) => r.path.endsWith(".json"))?.content ??
          ruleRows[0]?.content;

        if (!rulesContent) {
          return reply
            .code(404)
            .send({ error: "No encrypted knowledge found for this skill." });
        }

        const parsedRules = RuleEngine.tryParseRules(rulesContent);
        let demoText: string;
        let demoEvaluationDetails: {
          overall_score: number;
          verdict: "recommend" | "neutral" | "caution";
          dimensions: Array<{ name: string; score: number; conclusion_key: string }>;
        } | null = null;

        // Try Markdown parsing if JSON parsing failed
        const mdSections = parsedRules ? null : RuleEngine.tryParseMarkdownRules(rulesContent);

        if (!parsedRules && mdSections) {
          const evaluation = RuleEngine.evaluateMarkdown(mdSections, userQuery);
          demoEvaluationDetails = {
            overall_score: evaluation.overall_score,
            verdict: evaluation.verdict,
            dimensions: evaluation.results.map((r) => ({
              name: r.dimension,
              score: r.score,
              conclusion_key: r.conclusion_key,
            })),
          };
          const scoreLines = evaluation.results
            .map((r) => `• ${r.dimension}: ${r.score}/10 — ${r.conclusion_key}`)
            .join("\n");
          demoText = `Skill Evaluation (Markdown Rules)\nOverall: ${evaluation.overall_score}/10 (${evaluation.verdict})\n\n${scoreLines}`;
        } else if (!parsedRules) {
          demoText = RuleEngine.mockResponseForFreeformRules(userQuery);
        } else {
          const evaluation = RuleEngine.evaluate(parsedRules, userQuery);
          demoEvaluationDetails = {
            overall_score: evaluation.overall_score,
            verdict: evaluation.verdict,
            dimensions: evaluation.results.map((r) => ({
              name: r.dimension,
              score: r.score,
              conclusion_key: r.conclusion_key,
            })),
          };
          const scoreLines = evaluation.results
            .map((r) => `• ${r.dimension}: ${r.score}/10 — ${r.conclusion_key}`)
            .join("\n");
          demoText = `Skill Evaluation\nOverall: ${evaluation.overall_score}/10 (${evaluation.verdict})\n\n${scoreLines}`;
        }

        await AuditLogger.logEvent(fastify.db, {
          skillPackageId: pkg.id,
          apiClientId: callerId,
          conclusionText: demoText,
        }, {
          failClosed: true,
        });

        await recordInvocation(fastify.db, callerId, pkg.id, quota);

        return reply.send({
          success: true,
          conclusion: demoText,
          mode: "local",
          privacy_notice:
            "LOCAL MODE — Rules evaluated entirely in-process. No data was transmitted to any external service.",
          evaluation_details: demoEvaluationDetails,
        });
      }

      const record = knowledgeRecords[0];
      const encryptedDek = record.encryptedDek;
      const ciphertext = record.contentCiphertext;
      const expertShare = bodyParsed.data?.expert_share;

      let inferenceMs = 0;

      type InvokeMode =
        | "local"
        | "hybrid"
        | "lab-preview-expert-key"
        | "lab-preview-platform-key"
        | "mock";

      interface EvaluationDetails {
        overall_score: number;
        verdict: "recommend" | "neutral" | "caution";
        dimensions: Array<{ name: string; score: number; conclusion_key: string }>;
      }

      const toEvaluationDetails = (ev: RuleEvaluation): EvaluationDetails => ({
        overall_score: ev.overall_score,
        verdict: ev.verdict,
        dimensions: ev.results.map((r) => ({
          name: r.dimension,
          score: r.score,
          conclusion_key: r.conclusion_key,
        })),
      });

      // ── DEK Recovery: Shamir or KEK ────────────────────────────────────────
      // If Shamir shares exist for this package, require expert_share to
      // reconstruct the DEK. Otherwise fall back to KEK-based decryption.
      const shamirShares = await fastify.db
        .select()
        .from(shamirSharesTable)
        .where(eq(shamirSharesTable.skillPackageId, pkg.id));

      const dekProvider = async (): Promise<Buffer> => {
        const recovery = await recoverDek({
          shares: shamirShares,
          expertShare,
          legacyEncryptedDek: encryptedDek,
          decryptLegacyDek: (legacyEncryptedDek) =>
            KMS.decryptDek(legacyEncryptedDek),
        });
        return recovery.dek;
      };

      // ── Secure Pipeline ───────────────────────────────────────────────────
      let conclusion: { text: string; mode: InvokeMode; evaluationDetails?: EvaluationDetails | null };
      try {
        conclusion = await SecureBuffer.withSecureContext(
          dekProvider,
        async (dekBuffer) => {
          // Decrypt knowledge — plaintext only exists within this scope
          const plaintextRules = KMS.decryptKnowledge(
            ciphertext as Buffer,
            dekBuffer,
          );

          // ── Mode C: Lab Preview (author-only, explicit consent) ───────────
          if (labApiKey) {
            // Author has provided their own API key — data agreement is between
            // the author and Anthropic, not YigYaps. Plaintext rules are sent.
            const client = new Anthropic({ apiKey: labApiKey });
            const start = Date.now();
            const message = await client.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 1024,
              system: plaintextRules,
              messages: [{ role: "user", content: userQuery }],
            });
            inferenceMs = Date.now() - start;
            const firstBlock = message.content[0];
            return {
              text:
                firstBlock.type === "text"
                  ? firstBlock.text
                  : "Skill processed the request.",
              mode: "lab-preview-expert-key" as InvokeMode,
              evaluationDetails: null,
            };
          }

          // ── Mode A / B: Parse rules and evaluate locally ──────────────────
          const rules = RuleEngine.tryParseRules(plaintextRules);

          if (!rules) {
            // Try Markdown parsing before falling back to mock
            const mdSections = RuleEngine.tryParseMarkdownRules(plaintextRules);
            if (mdSections) {
              const mdEval = RuleEngine.evaluateMarkdown(mdSections, userQuery);
              return {
                text: `Skill Evaluation (Markdown Rules)\nOverall: ${mdEval.overall_score}/10 (${mdEval.verdict})\n\n` +
                  mdEval.results.map((r) => `• ${r.dimension}: ${r.score}/10 — ${r.conclusion_key}`).join("\n"),
                mode: "local" as InvokeMode,
                evaluationDetails: toEvaluationDetails(mdEval),
              };
            }
            return {
              text: RuleEngine.mockResponseForFreeformRules(userQuery),
              mode: "local" as InvokeMode,
              evaluationDetails: null,
            };
          }

          // Mode A: Local evaluation — 100% in-process, zero external calls
          const evaluation = RuleEngine.evaluate(rules, userQuery);
          const evaluationDetails = toEvaluationDetails(evaluation);

          // Mode B upgrade: if platform API key is configured, polish via LLM.
          // Only the safe skeleton (scores + conclusion tokens) is transmitted.
          if (env.ANTHROPIC_API_KEY) {
            const safePrompt = RuleEngine.toSafePrompt(evaluation, userQuery);
            const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
            const start = Date.now();
            const message = await client.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 512,
              system:
                "You are a professional report writer. Rephrase the following structured evaluation into a concise natural language response. Do not add information beyond what is provided.",
              messages: [{ role: "user", content: safePrompt }],
            });
            inferenceMs = Date.now() - start;
            const firstBlock = message.content[0];
            return {
              text:
                firstBlock.type === "text"
                  ? firstBlock.text
                  : `Overall: ${evaluation.verdict} (score ${evaluation.overall_score}/10)`,
              mode: "hybrid" as InvokeMode,
              evaluationDetails,
            };
          }

          // Mode A pure: no external API configured
          const scoreLines = evaluation.results
            .map((r) => `• ${r.dimension}: ${r.score}/10 — ${r.conclusion_key}`)
            .join("\n");
          return {
            text: `Skill Evaluation\nOverall: ${evaluation.overall_score}/10 (${evaluation.verdict})\n\n${scoreLines}`,
            mode: "local" as InvokeMode,
            evaluationDetails,
          };

          // dekBuffer is zeroized by SecureBuffer.withSecureContext after this scope
        },
      );
      } catch (err: unknown) {
        if (err instanceof DekRecoveryError) {
          if (err.code === "SHAMIR_SHARE_REQUIRED") {
            await auditDekRecoveryFailure(
              request,
              pkg.id,
              callerId,
              "rules",
              err.code,
            );
            return reply.code(400).send({
              error: "Shamir Share Required",
              message:
                "This skill uses Shamir key splitting. Provide your expert_share in the request body to invoke it.",
            });
          }
          if (err.code === "INVALID_EXPERT_SHARE") {
            await auditDekRecoveryFailure(
              request,
              pkg.id,
              callerId,
              "rules",
              err.code,
            );
            return reply.code(400).send({
              error: "Bad Request",
              message: "Invalid expert share.",
            });
          }
          if (err.code === "DEK_RECOVERY_UNAVAILABLE") {
            return reply.code(409).send({
              error: "DEK Recovery Unavailable",
              message:
                "This knowledge was uploaded in Shamir-only mode, but no platform share is available.",
            });
          }
        }
        throw err;
      }

      // ── Audit log with hash-chain ─────────────────────────────────────────
      await AuditLogger.logEvent(fastify.db, {
        skillPackageId: pkg.id,
        apiClientId: callerId,
        conclusionText: conclusion.text,
        inferenceMs: inferenceMs || undefined,
      }, {
        failClosed: true,
      });

      // Record usage before returning so successful invocations are billable.
      await recordInvocation(fastify.db, callerId, pkg.id, quota);

      const privacyNotice =
        conclusion.mode === "lab-preview-expert-key"
          ? "LAB PREVIEW — Your skill rules were transmitted to api.anthropic.com using your own API key. Data handling is governed by your agreement with Anthropic, not YigYaps."
          : conclusion.mode === "hybrid"
            ? "HYBRID MODE — Local rule engine evaluated your skill. Only a structured skeleton (scores and conclusion tokens) was sent to an external LLM for language polishing. No rule content was transmitted."
            : "LOCAL MODE — Rules were evaluated entirely in-process. No data was transmitted to any external service.";

      return reply.send({
        success: true,
        conclusion: conclusion.text,
        mode: conclusion.mode,
        privacy_notice: privacyNotice,
        evaluation_details: conclusion.evaluationDetails ?? null,
      });
    },
  );

  /**
   * Crypto-Shredding: Expert revokes knowledge by deleting all Shamir shares.
   * Once shares are deleted, the DEK can never be reconstructed and the
   * encrypted knowledge becomes permanently unreadable.
   *
   * Also deletes the encrypted knowledge records for completeness.
   * Author-only endpoint.
   */
  fastify.delete(
    "/knowledge/:packageId/revoke",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = paramsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({ error: "Bad Request" });
      }
      const { packageId } = paramsParsed.data;

      const pkgDAL = new SkillPackageDAL(fastify.db);
      const pkg = await pkgDAL.getByPackageId(packageId);
      if (!pkg) {
        return reply.code(404).send({ error: "Package not found" });
      }

      const userId = request.user?.userId;
      if (pkg.author !== userId) {
        return reply
          .code(403)
          .send({ error: "Only the package author can revoke knowledge" });
      }

      // Delete all Shamir shares → DEK can never be reconstructed
      const deletedShares = await fastify.db
        .delete(shamirSharesTable)
        .where(eq(shamirSharesTable.skillPackageId, pkg.id))
        .returning({ id: shamirSharesTable.id });

      // Delete encrypted knowledge records (legacy rules path)
      const deletedKnowledge = await fastify.db
        .delete(encryptedKnowledgeTable)
        .where(eq(encryptedKnowledgeTable.skillPackageId, pkg.id))
        .returning({ id: encryptedKnowledgeTable.id });

      // Clear cached DEKs from corpus entries (capture path)
      const corpusDAL = new SkillCorpusDAL(fastify.db);
      await corpusDAL.setCachedDek(pkg.id, null);

      return reply.send({
        success: true,
        message: "Crypto-shredding complete. Knowledge permanently revoked.",
        deleted_shares: deletedShares.length,
        deleted_knowledge_versions: deletedKnowledge.length,
      });
    },
  );

  /**
   * CKKS Homomorphic Encryption PoC
   * Demonstrates computation on encrypted room data.
   */
  fastify.get("/ckks-poc", async (_request, reply) => {
    const userScore = 85;
    const threshold = 15;

    // 1. Client encrypts data before sending
    const encScore = CKKSPoC.encrypt(userScore).ciphertext;
    const encThreshold = CKKSPoC.encrypt(threshold).ciphertext;

    // 2. Room processes encrypted data
    const encResult = CKKSPoC.processSecureRoom(encScore, encThreshold);

    return reply.send({
      concept: "Homomorphic Encryption (CKKS Simulation)",
      inputs: {
        userScore: "ENCRYPTED",
        threshold: "ENCRYPTED",
      },
      operation: "Addition over Ciphertexts",
      encryptedResult: encResult,
      message:
        "The room calculated the sum without ever seeing the numbers 85 or 15.",
    });
  });
};
