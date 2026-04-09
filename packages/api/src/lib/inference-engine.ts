/**
 * YigYaps Inference Engine
 *
 * RAG pipeline for corpus-type skills. Retrieves all QA pairs for a skill,
 * decrypts the expert answers, builds a context window, and generates
 * a response using the LLM.
 *
 * V1 strategy: retrieve ALL QA pairs (15-100 per skill, ~20K tokens).
 * No relevance ranking needed yet. Fits comfortably in Haiku's context.
 *
 * License: Apache 2.0
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@yigyaps/db";
import { SkillCorpusDAL } from "@yigyaps/db";
import type { LLMProvider } from "./llm-provider.js";
import { KMS } from "./kms.js";

// ── Types ────────────────────────────────────────────────────────────────

export interface InferenceParams {
  db: NodePgDatabase<typeof schema>;
  llm: LLMProvider;
  skillPackageId: string;
  userQuery: string;
  dek: Buffer;
  /** Skill display name for context */
  skillName?: string;
}

export interface InferenceResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  inferenceMs: number;
  qaCount: number;
}

// ── Inference Engine ────────────────────────────────────────────────────

export class InferenceEngine {
  /**
   * Invoke a corpus-type skill: decrypt all QA pairs, build context, generate response.
   *
   * This is the production inference path for skills that use the capture system
   * (knowledge_type = 'corpus'). The DEK must already be reconstructed by the caller
   * (either from Shamir shares or from the cached production DEK).
   */
  static async invoke(params: InferenceParams): Promise<InferenceResult> {
    const { db, llm, skillPackageId, userQuery, dek, skillName } = params;

    const corpusDAL = new SkillCorpusDAL(db);
    const corpusEntries = await corpusDAL.getBySkill(skillPackageId);

    if (corpusEntries.length === 0) {
      return {
        text: "This skill has no captured knowledge yet.",
        inputTokens: 0,
        outputTokens: 0,
        inferenceMs: 0,
        qaCount: 0,
      };
    }

    // Decrypt all answers and build QA context
    const qaPairs: Array<{
      question: string;
      answer: string;
      tags: string[];
      scenarioType: string;
    }> = [];

    for (const entry of corpusEntries) {
      const answer = KMS.decryptKnowledge(
        entry.encryptedAnswer as Buffer,
        dek,
      );
      qaPairs.push({
        question: entry.question,
        answer,
        tags: entry.tags,
        scenarioType: entry.scenarioType,
      });
    }

    // Build system prompt with all QA pairs as context
    const system = InferenceEngine.buildSystemPrompt(
      qaPairs,
      skillName ?? "Expert Skill",
    );

    const start = Date.now();
    const result = await llm.generateCompletion({
      system,
      userMessage: userQuery,
      maxTokens: 1024,
    });
    const inferenceMs = Date.now() - start;

    return {
      text: result.text,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      inferenceMs,
      qaCount: qaPairs.length,
    };
  }

  /**
   * Build the system prompt from decrypted QA pairs.
   *
   * Uses clear delimiters to separate QA pairs and prevent prompt injection.
   * The system prompt instructs the LLM to answer based ONLY on the expert
   * knowledge provided, not general knowledge.
   */
  private static buildSystemPrompt(
    qaPairs: Array<{
      question: string;
      answer: string;
      tags: string[];
      scenarioType: string;
    }>,
    skillName: string,
  ): string {
    const qaContext = qaPairs
      .map(
        (qa, i) =>
          [
            `--- QA Entry ${i + 1} [${qa.scenarioType}] [${qa.tags.join(", ")}] ---`,
            `Q: ${qa.question}`,
            `A: ${qa.answer}`,
          ].join("\n"),
      )
      .join("\n\n");

    return [
      `You are an AI assistant powered by the "${skillName}" expert skill.`,
      `You have access to the expert's captured knowledge below.`,
      `Answer the user's question based ONLY on the expert knowledge provided.`,
      `If the expert knowledge does not cover the user's question, say so clearly.`,
      `Do not fabricate information beyond what the expert has shared.`,
      ``,
      `=== EXPERT KNOWLEDGE (${qaPairs.length} entries) ===`,
      ``,
      qaContext,
      ``,
      `=== END EXPERT KNOWLEDGE ===`,
      ``,
      `Respond naturally, synthesizing across multiple QA entries when relevant.`,
      `Cite the expert's reasoning when it applies to the user's question.`,
    ].join("\n");
  }
}
