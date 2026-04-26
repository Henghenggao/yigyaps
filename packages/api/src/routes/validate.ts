/**
 * YigYaps Validation Routes
 *
 * Endpoints for the validation loop: generate test variations from existing
 * QA corpus, present AI answers for expert review, and record verdicts.
 *
 * POST   /v1/validate/:packageId/generate — Generate a test variation
 * POST   /v1/validate/:packageId/verdict  — Record expert verdict on a test
 * GET    /v1/validate/:packageId/results  — Get validation results
 * POST   /v1/validate/:packageId/publish  — Publish skill (completed → published)
 *
 * License: Apache 2.0
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  SkillPackageDAL,
  CaptureSessionDAL,
  SkillCorpusDAL,
  SkillTestDAL,
  shamirSharesTable,
  skillCorpusTable,
  skillTestsTable,
} from "@yigyaps/db";
import { requireAuth } from "../middleware/auth-v2.js";
import { TemplateLoader } from "../lib/template-loader.js";
import { CoverageTracker } from "../lib/coverage-tracker.js";
import { InferenceEngine } from "../lib/inference-engine.js";
import { KMS } from "../lib/kms.js";
import { ShamirManager } from "../lib/shamir.js";
import { AnthropicProvider } from "../lib/llm-provider.js";
import { env } from "../lib/env.js";

// ── Schemas ──────────────────────────────────────────────────────────────

const packageIdSchema = z.object({
  packageId: z.string().min(1),
});

const generateSchema = z.object({
  sourceQaId: z.string().min(1),
  variationType: z.enum([
    "condition_swap",
    "param_extreme",
    "negation",
    "scenario_merge",
  ]),
  /** Expert's Shamir share for DEK reconstruction */
  expert_share: z.string().min(1),
});

const verdictSchema = z.object({
  testId: z.string().min(1),
  verdict: z.enum(["correct", "partial", "wrong"]),
  correction: z.string().max(50_000).optional(),
  /** Expert's Shamir share (needed if correction creates new corpus entry) */
  expert_share: z.string().optional(),
});

const publishSchema = z.object({
  /** Expert's Shamir share for caching DEK at publish time */
  expert_share: z.string().min(1),
  /** Template ID for convergence check */
  templateId: z.string().min(1),
});

// ── Routes ───────────────────────────────────────────────────────────────

export const validateRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Generate Test Variation ────────────────────────────────────────────

  fastify.post(
    "/:packageId/generate",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = packageIdSchema.safeParse(request.params);
      const bodyParsed = generateSchema.safeParse(request.body);
      if (!paramsParsed.success || !bodyParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: bodyParsed.error?.issues,
        });
      }

      const { packageId } = paramsParsed.data;
      const { sourceQaId, variationType, expert_share } = bodyParsed.data;

      // Resolve package
      const pkgDAL = new SkillPackageDAL(fastify.db);
      const pkg = await pkgDAL.getByPackageId(packageId);
      if (!pkg) {
        return reply.code(404).send({ error: "Package not found" });
      }
      if (pkg.author !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      // Get source QA entry
      const corpusDAL = new SkillCorpusDAL(fastify.db);
      const sourceQa = await corpusDAL.getById(sourceQaId);
      if (!sourceQa || sourceQa.skillPackageId !== pkg.id) {
        return reply.code(404).send({ error: "Source QA entry not found" });
      }

      // Reconstruct DEK for decryption
      const dek = await reconstructDek(fastify.db, pkg.id, expert_share);
      if (!dek) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Failed to reconstruct DEK. Check your expert share.",
        });
      }

      // Use LLM to generate a variation question
      const anthropicKey = env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        return reply.code(503).send({
          error: "Service Unavailable",
          message: "LLM provider not configured",
        });
      }

      const llm = new AnthropicProvider({ apiKey: anthropicKey });

      const variationPrompt = buildVariationPrompt(
        sourceQa.question,
        variationType,
      );

      const variationResult = await llm.generateCompletion({
        system:
          "You generate test variations of interview questions. " +
          "Output ONLY the new question, nothing else.",
        userMessage: variationPrompt,
        maxTokens: 256,
      });

      const generatedQuestion = variationResult.text.trim();

      // Use InferenceEngine to generate AI answer using the full corpus
      const aiResult = await InferenceEngine.invoke({
        db: fastify.db,
        llm,
        skillPackageId: pkg.id,
        userQuery: generatedQuestion,
        dek,
        skillName: pkg.displayName,
      });

      // Record the test
      const testDAL = new SkillTestDAL(fastify.db);
      const test = await testDAL.create({
        id: randomUUID(),
        skillPackageId: pkg.id,
        sourceQaId,
        variationType,
        generatedQuestion,
        aiAnswer: aiResult.text,
        expertVerdict: "pending",
        createdAt: Date.now(),
      });

      return reply.code(201).send({
        test: {
          id: test.id,
          generatedQuestion: test.generatedQuestion,
          aiAnswer: test.aiAnswer,
          variationType: test.variationType,
          sourceQuestion: sourceQa.question,
        },
      });
    },
  );

  // ── Record Expert Verdict ──────────────────────────────────────────────

  fastify.post(
    "/:packageId/verdict",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = packageIdSchema.safeParse(request.params);
      const bodyParsed = verdictSchema.safeParse(request.body);
      if (!paramsParsed.success || !bodyParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: bodyParsed.error?.issues,
        });
      }

      const { packageId } = paramsParsed.data;
      const { testId, verdict, correction, expert_share } = bodyParsed.data;

      const pkgDAL = new SkillPackageDAL(fastify.db);
      const pkg = await pkgDAL.getByPackageId(packageId);
      if (!pkg) {
        return reply.code(404).send({ error: "Package not found" });
      }
      if (pkg.author !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      // Update the test record with expert verdict
      const testDAL = new SkillTestDAL(fastify.db);
      const tests = await testDAL.getBySkill(pkg.id);
      const test = tests.find((t) => t.id === testId);
      if (!test) {
        return reply.code(404).send({ error: "Test not found" });
      }

      let correctionQaId: string | null = null;

      // If expert provided a correction, create a new corpus entry
      if (correction && expert_share) {
        const dek = await reconstructDek(fastify.db, pkg.id, expert_share);
        if (!dek) {
          return reply.code(400).send({
            error: "Bad Request",
            message: "Failed to reconstruct DEK for correction.",
          });
        }

        const encryptedAnswer = KMS.encryptKnowledge(correction, dek);

        // Find an active session for this package to link the correction
        const sessionDAL = new CaptureSessionDAL(fastify.db);
        const sessions = await sessionDAL.getBySkill(pkg.id);
        const activeSession = sessions.find(
          (s) => s.status === "active" || s.status === "completed",
        );

        if (activeSession) {
          const corpusDAL = new SkillCorpusDAL(fastify.db);
          const correctionEntry = await corpusDAL.create({
            id: randomUUID(),
            skillPackageId: pkg.id,
            sessionId: activeSession.id,
            question: test.generatedQuestion,
            encryptedAnswer,
            tags: [],
            scenarioType: "apprentice_correction",
            complexity: "L1",
            source: "apprentice_correction",
            parentQaId: test.sourceQaId,
            createdAt: Date.now(),
          });
          correctionQaId = correctionEntry.id;
        }
      }

      // Update test with verdict
      await fastify.db
        .update(skillTestsTable)
        .set({
          expertVerdict: verdict,
          expertCorrection: correction ?? null,
          correctionQaId,
        })
        .where(eq(skillTestsTable.id, testId));

      return reply.send({
        testId,
        verdict,
        correctionQaId,
      });
    },
  );

  // ── Get Validation Results ─────────────────────────────────────────────

  fastify.get(
    "/:packageId/results",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const parsed = packageIdSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Bad Request" });
      }

      const pkgDAL = new SkillPackageDAL(fastify.db);
      const pkg = await pkgDAL.getByPackageId(parsed.data.packageId);
      if (!pkg) {
        return reply.code(404).send({ error: "Package not found" });
      }
      if (pkg.author !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      const testDAL = new SkillTestDAL(fastify.db);
      const [tests, passRate] = await Promise.all([
        testDAL.getBySkill(pkg.id),
        testDAL.getPassRate(pkg.id),
      ]);

      return reply.send({
        tests: tests.map((t) => ({
          id: t.id,
          variationType: t.variationType,
          generatedQuestion: t.generatedQuestion,
          aiAnswer: t.aiAnswer,
          expertVerdict: t.expertVerdict,
          expertCorrection: t.expertCorrection,
          correctionQaId: t.correctionQaId,
          createdAt: t.createdAt,
        })),
        summary: passRate,
      });
    },
  );

  // ── Publish Skill ──────────────────────────────────────────────────────

  fastify.post(
    "/:packageId/publish",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = packageIdSchema.safeParse(request.params);
      const bodyParsed = publishSchema.safeParse(request.body);
      if (!paramsParsed.success || !bodyParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: bodyParsed.error?.issues,
        });
      }

      const { packageId } = paramsParsed.data;
      const { expert_share, templateId } = bodyParsed.data;
      const userId = request.user!.userId;

      const pkgDAL = new SkillPackageDAL(fastify.db);
      const pkg = await pkgDAL.getByPackageId(packageId);
      if (!pkg) {
        return reply.code(404).send({ error: "Package not found" });
      }
      if (pkg.author !== userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      // Check convergence
      const template = TemplateLoader.getById(templateId);
      if (!template) {
        return reply.code(400).send({
          error: "Bad Request",
          message: `Unknown template: ${templateId}`,
        });
      }

      const coverage = await CoverageTracker.checkConvergence(
        fastify.db,
        pkg.id,
        template,
      );

      if (!coverage.ready) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Skill does not meet convergence thresholds",
          gaps: coverage.gaps,
        });
      }

      // Reconstruct DEK and cache it for production invocations
      const dek = await reconstructDek(fastify.db, pkg.id, expert_share);
      if (!dek) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Failed to reconstruct DEK.",
        });
      }

      // Cache KEK-encrypted DEK on all corpus entries for production
      const { encryptedDek } = await KMS.encryptDek(dek);
      const corpusDAL = new SkillCorpusDAL(fastify.db);
      await corpusDAL.setCachedDek(pkg.id, encryptedDek);

      // Transition all completed sessions for this package to published
      const sessionDAL = new CaptureSessionDAL(fastify.db);
      const sessions = await sessionDAL.getBySkill(pkg.id);
      for (const session of sessions) {
        if (session.status === "completed") {
          await sessionDAL.transition(session.id, "published");
        }
      }

      // Update skill package knowledge_type to corpus
      await pkgDAL.update(pkg.id, { knowledgeType: "corpus" });

      return reply.send({
        published: true,
        packageId: pkg.packageId,
        coverage,
      });
    },
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────

async function reconstructDek(
  db: import("drizzle-orm/node-postgres").NodePgDatabase<
    typeof import("@yigyaps/db")
  >,
  skillPackageId: string,
  expertShare: string,
): Promise<Buffer | null> {
  // First check if there's a cached DEK on corpus entries
  const cachedEntries = await db
    .select({ cachedEncryptedDek: skillCorpusTable.cachedEncryptedDek })
    .from(skillCorpusTable)
    .where(eq(skillCorpusTable.skillPackageId, skillPackageId))
    .limit(1);

  if (cachedEntries[0]?.cachedEncryptedDek) {
    try {
      return await KMS.decryptDek(cachedEntries[0].cachedEncryptedDek);
    } catch {
      // Fall through to Shamir reconstruction
    }
  }

  // Shamir reconstruction
  const shares = await db
    .select()
    .from(shamirSharesTable)
    .where(eq(shamirSharesTable.skillPackageId, skillPackageId));

  const platformShare = shares.find((s) => s.shareIndex === 1);
  if (!platformShare) return null;

  try {
    const dekHex = ShamirManager.reconstruct([
      platformShare.shareData,
      expertShare,
    ]);
    return Buffer.from(dekHex, "hex");
  } catch {
    return null;
  }
}

function buildVariationPrompt(
  originalQuestion: string,
  variationType: string,
): string {
  const instructions: Record<string, string> = {
    condition_swap:
      "Change a key condition or constraint in this question while keeping the core scenario.",
    param_extreme:
      "Push a parameter to an extreme value (very large, very small, zero, negative).",
    negation:
      "Negate the premise or reverse the expected outcome of this question.",
    scenario_merge:
      "Combine this scenario with an unrelated complication or cross-domain challenge.",
  };

  return [
    `Original question: "${originalQuestion}"`,
    ``,
    `Variation type: ${variationType}`,
    `Instructions: ${instructions[variationType] ?? "Create a variation."}`,
    ``,
    `Generate ONE variation question. Output ONLY the question text.`,
  ].join("\n");
}
