/**
 * YigYaps Capture Routes
 *
 * Endpoints for the blind interviewer knowledge capture system.
 *
 * POST   /v1/capture/sessions              — Create a capture session
 * GET    /v1/capture/sessions/:id          — Get session details
 * GET    /v1/capture/sessions              — List user's sessions
 * POST   /v1/capture/sessions/:id/start    — Start a session (draft → active)
 * POST   /v1/capture/sessions/:id/pause    — Pause a session
 * POST   /v1/capture/sessions/:id/resume   — Resume a session (paused → active)
 * POST   /v1/capture/sessions/:id/complete — Complete a session
 * POST   /v1/capture/sessions/:id/abandon  — Abandon a session
 * POST   /v1/capture/sessions/:id/question — Generate next interview question
 * POST   /v1/capture/sessions/:id/answer   — Submit expert's answer (encrypted)
 * GET    /v1/capture/templates             — List available domain templates
 * GET    /v1/capture/templates/:id         — Get a single domain template
 * GET    /v1/capture/coverage/:packageId   — Get coverage stats for a skill
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
  shamirSharesTable,
} from "@yigyaps/db";
import { requireAuth } from "../middleware/auth-v2.js";
import { TemplateLoader } from "../lib/template-loader.js";
import { BlindInterviewer } from "../lib/blind-interviewer.js";
import { CoverageTracker } from "../lib/coverage-tracker.js";
import { KMS } from "../lib/kms.js";
import { ShamirManager } from "../lib/shamir.js";
import { AnthropicProvider } from "../lib/llm-provider.js";
import { env } from "../lib/env.js";

// ── Schemas ──────────────────────────────────────────────────────────────

const sessionIdSchema = z.object({
  id: z.string().min(1),
});

const createSessionSchema = z.object({
  skillPackageId: z.string().min(1),
  domainTemplateId: z.string().min(1),
});

const startSessionSchema = z.object({
  /** Expert's Shamir share (share_index 2) for DEK reconstruction */
  expert_share: z.string().min(1),
});

const answerSchema = z.object({
  question: z.string().min(1).max(10_000),
  answer: z.string().min(1).max(50_000),
  tags: z.array(z.string()).min(1),
  scenarioType: z.enum([
    "structured_interview",
    "case_judgment",
    "scenario_simulation",
    "apprentice_correction",
  ]),
  complexity: z.enum(["L1", "L2", "L3"]).optional().default("L1"),
  source: z.enum([
    "structured_interview",
    "case_judgment",
    "scenario_simulation",
    "apprentice_correction",
  ]),
  parentQaId: z.string().optional(),
});

const packageIdSchema = z.object({
  packageId: z.string().min(1),
});

const templateIdSchema = z.object({
  id: z.string().min(1),
});

// ── Routes ───────────────────────────────────────────────────────────────

export const captureRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Templates ──────────────────────────────────────────────────────────

  fastify.get("/templates", async (_request, reply) => {
    const templates = TemplateLoader.loadAll();
    return reply.send({ templates });
  });

  fastify.get("/templates/:id", async (request, reply) => {
    const parsed = templateIdSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Bad Request", message: "Invalid template ID" });
    }
    const template = TemplateLoader.getById(parsed.data.id);
    if (!template) {
      return reply.code(404).send({ error: "Template not found" });
    }
    return reply.send({ template });
  });

  // ── Create Session ─────────────────────────────────────────────────────

  fastify.post(
    "/sessions",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const parsed = createSessionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: parsed.error.issues,
        });
      }

      const { skillPackageId, domainTemplateId } = parsed.data;
      const userId = request.user!.userId;

      // Validate skill package exists and belongs to the user
      const pkgDAL = new SkillPackageDAL(fastify.db);
      const pkg = await pkgDAL.getByPackageId(skillPackageId);
      if (!pkg) {
        return reply.code(404).send({ error: "Skill package not found" });
      }
      if (pkg.author !== userId) {
        return reply.code(403).send({
          error: "Forbidden",
          message: "Only the package author can create capture sessions",
        });
      }

      // Validate domain template exists
      const template = TemplateLoader.getById(domainTemplateId);
      if (!template) {
        return reply.code(400).send({
          error: "Bad Request",
          message: `Unknown domain template: ${domainTemplateId}`,
        });
      }

      const sessionDAL = new CaptureSessionDAL(fastify.db);
      const now = Date.now();
      const session = await sessionDAL.create({
        id: randomUUID(),
        skillPackageId: pkg.id,
        userId,
        domainTemplateId,
        status: "draft",
        currentRound: 0,
        createdAt: now,
        updatedAt: now,
      });

      return reply.code(201).send({ session });
    },
  );

  // ── Get Session ────────────────────────────────────────────────────────

  fastify.get(
    "/sessions/:id",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const parsed = sessionIdSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Bad Request" });
      }

      const sessionDAL = new CaptureSessionDAL(fastify.db);
      const session = await sessionDAL.getById(parsed.data.id);
      if (!session) {
        return reply.code(404).send({ error: "Session not found" });
      }
      if (session.userId !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      return reply.send({ session });
    },
  );

  // ── List User Sessions ─────────────────────────────────────────────────

  fastify.get(
    "/sessions",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const sessionDAL = new CaptureSessionDAL(fastify.db);
      const sessions = await sessionDAL.getByUser(request.user!.userId);
      return reply.send({ sessions });
    },
  );

  // ── Start Session (draft → active) ────────────────────────────────────

  fastify.post(
    "/sessions/:id/start",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = sessionIdSchema.safeParse(request.params);
      const bodyParsed = startSessionSchema.safeParse(request.body);
      if (!paramsParsed.success || !bodyParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "expert_share is required to start a session",
        });
      }

      const sessionDAL = new CaptureSessionDAL(fastify.db);
      const session = await sessionDAL.getById(paramsParsed.data.id);
      if (!session) {
        return reply.code(404).send({ error: "Session not found" });
      }
      if (session.userId !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      // Reconstruct DEK from expert share + platform share, then cache it
      const { expert_share } = bodyParsed.data;
      const shamirSharesResult = await fastify.db
        .select()
        .from(shamirSharesTable)
        .where(eq(shamirSharesTable.skillPackageId, session.skillPackageId));

      const platformShare = shamirSharesResult.find(
        (s) => s.shareIndex === 1,
      );
      if (!platformShare) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "No Shamir shares found for this skill. Encrypt knowledge first.",
        });
      }

      // Verify DEK can be reconstructed
      let sessionEncryptedDek: string;
      try {
        const dekHex = ShamirManager.reconstruct([
          platformShare.shareData,
          expert_share,
        ]);
        const dekBuffer = Buffer.from(dekHex, "hex");
        // Cache DEK encrypted with KEK for session duration
        const { encryptedDek } = await KMS.encryptDek(dekBuffer);
        sessionEncryptedDek = encryptedDek;
      } catch {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Invalid expert share. DEK reconstruction failed.",
        });
      }

      const updated = await sessionDAL.transition(session.id, "active", {
        sessionEncryptedDek,
      });

      return reply.send({ session: updated });
    },
  );

  // ── Pause Session ──────────────────────────────────────────────────────

  fastify.post(
    "/sessions/:id/pause",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const parsed = sessionIdSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Bad Request" });
      }

      const sessionDAL = new CaptureSessionDAL(fastify.db);
      const session = await sessionDAL.getById(parsed.data.id);
      if (!session) {
        return reply.code(404).send({ error: "Session not found" });
      }
      if (session.userId !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      const updated = await sessionDAL.transition(session.id, "paused");
      return reply.send({ session: updated });
    },
  );

  // ── Resume Session (paused → active) ──────────────────────────────────

  fastify.post(
    "/sessions/:id/resume",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = sessionIdSchema.safeParse(request.params);
      const bodyParsed = startSessionSchema.safeParse(request.body);
      if (!paramsParsed.success || !bodyParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "expert_share is required to resume a session",
        });
      }

      const sessionDAL = new CaptureSessionDAL(fastify.db);
      const session = await sessionDAL.getById(paramsParsed.data.id);
      if (!session) {
        return reply.code(404).send({ error: "Session not found" });
      }
      if (session.userId !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      // Reconstruct DEK again (was zeroed on pause)
      const { expert_share } = bodyParsed.data;
      const shamirShares = await fastify.db
        .select()
        .from(shamirSharesTable)
        .where(eq(shamirSharesTable.skillPackageId, session.skillPackageId));

      const platformShare = shamirShares.find((s) => s.shareIndex === 1);
      if (!platformShare) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "No Shamir shares found.",
        });
      }

      let sessionEncryptedDek: string;
      try {
        const dekHex = ShamirManager.reconstruct([
          platformShare.shareData,
          expert_share,
        ]);
        const dekBuffer = Buffer.from(dekHex, "hex");
        const { encryptedDek } = await KMS.encryptDek(dekBuffer);
        sessionEncryptedDek = encryptedDek;
      } catch {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Invalid expert share.",
        });
      }

      const updated = await sessionDAL.transition(session.id, "active", {
        sessionEncryptedDek,
      });

      return reply.send({ session: updated });
    },
  );

  // ── Complete Session ───────────────────────────────────────────────────

  fastify.post(
    "/sessions/:id/complete",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const parsed = sessionIdSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Bad Request" });
      }

      const sessionDAL = new CaptureSessionDAL(fastify.db);
      const session = await sessionDAL.getById(parsed.data.id);
      if (!session) {
        return reply.code(404).send({ error: "Session not found" });
      }
      if (session.userId !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      const updated = await sessionDAL.transition(session.id, "completed");
      return reply.send({ session: updated });
    },
  );

  // ── Abandon Session ────────────────────────────────────────────────────

  fastify.post(
    "/sessions/:id/abandon",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const parsed = sessionIdSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Bad Request" });
      }

      const sessionDAL = new CaptureSessionDAL(fastify.db);
      const session = await sessionDAL.getById(parsed.data.id);
      if (!session) {
        return reply.code(404).send({ error: "Session not found" });
      }
      if (session.userId !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      const updated = await sessionDAL.transition(session.id, "abandoned");
      return reply.send({ session: updated });
    },
  );

  // ── Generate Question ──────────────────────────────────────────────────

  fastify.post(
    "/sessions/:id/question",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const parsed = sessionIdSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Bad Request" });
      }

      const sessionDAL = new CaptureSessionDAL(fastify.db);
      const session = await sessionDAL.getById(parsed.data.id);
      if (!session) {
        return reply.code(404).send({ error: "Session not found" });
      }
      if (session.userId !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      if (session.status !== "active") {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Session must be active to generate questions",
        });
      }

      const template = TemplateLoader.getById(session.domainTemplateId);
      if (!template) {
        return reply.code(500).send({
          error: "Internal Server Error",
          message: "Domain template not found",
        });
      }

      const corpusDAL = new SkillCorpusDAL(fastify.db);
      const [coverageStats, existingEntries] = await Promise.all([
        corpusDAL.getCoverageStats(session.skillPackageId),
        corpusDAL.getBySession(session.id),
      ]);

      // Extract previous questions (NEVER answers)
      const previousQuestions = existingEntries.map((e) => e.question);

      const anthropicKey = env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        return reply.code(503).send({
          error: "Service Unavailable",
          message: "LLM provider not configured",
        });
      }

      const llm = new AnthropicProvider({ apiKey: anthropicKey });

      const generated = await BlindInterviewer.generateQuestion({
        llm,
        template,
        coverageStats,
        previousQuestions,
        currentRound: session.currentRound,
      });

      return reply.send({ question: generated });
    },
  );

  // ── Submit Answer ──────────────────────────────────────────────────────

  fastify.post(
    "/sessions/:id/answer",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const paramsParsed = sessionIdSchema.safeParse(request.params);
      const bodyParsed = answerSchema.safeParse(request.body);
      if (!paramsParsed.success || !bodyParsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Validation failed",
          details: bodyParsed.error?.issues,
        });
      }

      const sessionDAL = new CaptureSessionDAL(fastify.db);
      const session = await sessionDAL.getById(paramsParsed.data.id);
      if (!session) {
        return reply.code(404).send({ error: "Session not found" });
      }
      if (session.userId !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      if (session.status !== "active") {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Session must be active to submit answers",
        });
      }
      if (!session.sessionEncryptedDek) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Session DEK not available. Restart the session.",
        });
      }

      // Decrypt the session DEK to encrypt the answer
      const dekBuffer = await KMS.decryptDek(session.sessionEncryptedDek);
      const { question, answer, tags, scenarioType, complexity, source, parentQaId } =
        bodyParsed.data;

      // Encrypt the expert's answer
      const encryptedAnswer = KMS.encryptKnowledge(answer, dekBuffer);

      const corpusDAL = new SkillCorpusDAL(fastify.db);
      const entry = await corpusDAL.create({
        id: randomUUID(),
        skillPackageId: session.skillPackageId,
        sessionId: session.id,
        question,
        encryptedAnswer,
        tags,
        scenarioType,
        complexity,
        source,
        parentQaId: parentQaId ?? null,
        createdAt: Date.now(),
      });

      // Increment round counter (no state change, session stays active)
      await sessionDAL.incrementRound(session.id);

      return reply.code(201).send({
        entry: {
          id: entry.id,
          question: entry.question,
          tags: entry.tags,
          scenarioType: entry.scenarioType,
          complexity: entry.complexity,
          // Never return the encrypted answer to the client
        },
      });
    },
  );

  // ── Coverage Stats ─────────────────────────────────────────────────────

  fastify.get(
    "/coverage/:packageId",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const parsed = packageIdSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Bad Request" });
      }

      const pkgDAL = new SkillPackageDAL(fastify.db);
      const pkg = await pkgDAL.getByPackageId(parsed.data.packageId);
      if (!pkg) {
        return reply.code(404).send({ error: "Skill package not found" });
      }

      // Only the author can see coverage stats
      if (pkg.author !== request.user!.userId) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      const template = TemplateLoader.getById(
        // We need to find the template from a session for this package
        // For now, check query params
        (request.query as { templateId?: string }).templateId ?? "",
      );

      if (!template) {
        // If no template specified, return raw stats without convergence check
        const corpusDAL = new SkillCorpusDAL(fastify.db);
        const stats = await corpusDAL.getCoverageStats(pkg.id);
        return reply.send({ stats, convergence: null });
      }

      const report = await CoverageTracker.checkConvergence(
        fastify.db,
        pkg.id,
        template,
      );

      return reply.send({ report });
    },
  );
};
