/**
 * YigYaps Security Routes MVP
 *
 * Implements endpoints to test the Encryption Pipeline (Phase 1)
 * and Software Enclave Isolation (Phase 2).
 *
 * License: Apache 2.0
 */

import { FastifyPluginAsync } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import { KMS } from "../lib/kms.js";
import { CKKSPoC } from "../lib/ckks.js";
import { SecureBuffer } from "../middleware/memory-zeroizer.js";
import {
  encryptedKnowledgeTable,
  invocationLogsTable,
  ipRegistrationsTable,
} from "@yigyaps/db";
import { SkillPackageDAL } from "@yigyaps/db";
import { eq } from "drizzle-orm";
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
   * Expert's own Anthropic API key for lab-preview mode.
   * When provided, inference uses this key directly — the YigYaps platform key
   * is NOT used. The data agreement is then between the expert and Anthropic.
   * This key is never stored; it is used only for this single request.
   */
  lab_api_key: z.string().optional(),
});

const paramsSchema = z.object({
  packageId: z.string().min(1),
});

export const securityRoutes: FastifyPluginAsync = async (fastify) => {
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

      // 2. Encrypt DEK with KEK (KMS Mock)
      const { encryptedDek } = await KMS.encryptDek(dek);

      // 3. Encrypt Knowledge using DEK
      const contentCiphertext = KMS.encryptKnowledge(plaintextRules, dek);

      // 4. Hash the original plaintext for IP Registration verification
      const contentHash = crypto
        .createHash("sha256")
        .update(plaintextRules)
        .digest("hex");

      // 4b. Mock Blockchain Transaction (Polygon RPC Simulated)
      const mockTxHash = `0x${crypto.randomBytes(32).toString("hex")}`;
      await fastify.db.insert(ipRegistrationsTable).values({
        id: randomUUID(),
        skillPackageId: internalId,
        contentHash,
        blockchainTx: mockTxHash,
        registeredAt: Date.now(),
      });

      // 5. UPSERT: delete existing knowledge for this package, then insert the new version.
      //    This ensures "Evolve" always replaces the current version, not accumulates versions.
      await fastify.db
        .delete(encryptedKnowledgeTable)
        .where(eq(encryptedKnowledgeTable.skillPackageId, internalId));

      await fastify.db.insert(encryptedKnowledgeTable).values({
        id: randomUUID(),
        skillPackageId: internalId,
        encryptedDek,
        contentCiphertext,
        contentHash,
        createdAt: Date.now(),
      });

      return reply.send({
        success: true,
        message: "Knowledge encrypted and saved.",
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
        .where(eq(encryptedKnowledgeTable.skillPackageId, pkg.id))
        .limit(1);

      if (!knowledgeRecords.length) {
        return reply
          .code(404)
          .send({ error: "No knowledge uploaded for this skill yet." });
      }

      const record = knowledgeRecords[0];
      const dek = await KMS.decryptDek(record.encryptedDek);
      const plaintextRules = KMS.decryptKnowledge(
        record.contentCiphertext as Buffer,
        dek,
      );

      return reply.send({ plaintextRules });
    },
  );

  /**
   * Invoke the skill in the Memory-Only Sandbox.
   * Decrypts rules in SecureBuffer, passes them as the LLM system prompt,
   * processes the user_query, then zeroizes the DEK immediately.
   * The plaintext rules never leave the secure context.
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

      const bodyParsed = invokeBodySchema.safeParse(request.body);
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

      const knowledgeRecords = await fastify.db
        .select()
        .from(encryptedKnowledgeTable)
        .where(eq(encryptedKnowledgeTable.skillPackageId, pkg.id))
        .limit(1);

      if (!knowledgeRecords.length) {
        return reply
          .code(404)
          .send({ error: "No encrypted knowledge found for this skill." });
      }

      const record = knowledgeRecords[0];
      const encryptedDek = record.encryptedDek;
      const ciphertext = record.contentCiphertext;

      let inferenceMs = 0;

      // Determine which API key to use and set the invocation mode accordingly.
      // Priority: expert's own key (lab_api_key) > platform key (ANTHROPIC_API_KEY) > mock
      const activeApiKey = labApiKey || env.ANTHROPIC_API_KEY;
      const invokeMode: "lab-preview-expert-key" | "lab-preview-platform-key" | "mock" =
        labApiKey
          ? "lab-preview-expert-key"
          : env.ANTHROPIC_API_KEY
            ? "lab-preview-platform-key"
            : "mock";

      // Secure Pipeline: decrypt rules inside the secure context, call LLM, return only the response.
      const conclusion = await SecureBuffer.withSecureContext(
        async () => {
          return await KMS.decryptDek(encryptedDek);
        },
        async (dekBuffer) => {
          // We are now inside the Software Enclave / Sandbox
          // 1. Decrypt knowledge — only exists within this scope
          const plaintextRules = KMS.decryptKnowledge(
            ciphertext as Buffer,
            dekBuffer,
          );

          // 2. If no API key is available, fall back to mock
          if (!activeApiKey) {
            const mockScore = Math.floor(Math.random() * 10) + 1;
            return `[Mock — no API key configured] Score: ${mockScore}/10.`;
          }

          // 3. Call Claude with rules as system prompt, user_query as the message.
          //    ⚠️ LAB-PREVIEW: plaintextRules are transmitted to api.anthropic.com.
          //    Production agent invocations require a TEE-isolated proxy (Phase 3).
          const client = new Anthropic({ apiKey: activeApiKey });
          const start = Date.now();
          const message = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: plaintextRules,
            messages: [{ role: "user", content: userQuery }],
          });
          inferenceMs = Date.now() - start;

          const firstBlock = message.content[0];
          return firstBlock.type === "text"
            ? firstBlock.text
            : "Skill processed the request.";

          // At the end of this scope, dekBuffer will be wiped by SecureBuffer
        },
      );

      // Log the invocation (Auditing)
      const conclusionHash = crypto
        .createHash("sha256")
        .update(conclusion)
        .digest("hex");
      await fastify.db.insert(invocationLogsTable).values({
        id: randomUUID(),
        skillPackageId: pkg.id,
        apiClientId: request.user?.userId ?? "anonymous",
        inferenceMs: inferenceMs || null,
        conclusionHash,
        createdAt: Date.now(),
      });

      // Build the privacy notice based on actual invocation mode
      const privacyNotice =
        invokeMode === "lab-preview-expert-key"
          ? "LAB PREVIEW — Your skill rules were transmitted to api.anthropic.com using your own API key. Data handling is governed by your agreement with Anthropic, not YigYaps."
          : invokeMode === "lab-preview-platform-key"
            ? "LAB PREVIEW — Your skill rules were transmitted to api.anthropic.com using the YigYaps platform key. This mode is for testing only. Production agent invocations require a TEE-isolated environment."
            : "MOCK MODE — No LLM was called. Rules stayed on this server.";

      return reply.send({
        success: true,
        conclusion,
        mode: invokeMode,
        privacy_notice: privacyNotice,
      });
    },
  );

  /**
   * CKKS Homomorphic Encryption PoC
   * Demonstrates computation on encrypted room data.
   */
  fastify.get("/ckks-poc", async (request, reply) => {
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
