/**
 * YigYaps Blind Interviewer
 *
 * Generates interview questions for expert knowledge capture.
 * The LLM sees ONLY previous questions and coverage statistics,
 * NEVER the expert's answers. This is the core security boundary
 * of the capture system.
 *
 * License: Apache 2.0
 */

import type { LLMProvider } from "./llm-provider.js";
import type { DomainTemplate } from "./template-loader.js";

// ── Types ────────────────────────────────────────────────────────────────

export interface CoverageStats {
  totalQaPairs: number;
  tagCounts: Record<string, number>;
  scenarioTypeCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
}

export interface GeneratedQuestion {
  question: string;
  targetScenarioType: string;
  targetTags: string[];
  suggestedComplexity: string;
}

export interface BlindInterviewerParams {
  llm: LLMProvider;
  template: DomainTemplate;
  coverageStats: CoverageStats;
  previousQuestions: string[];
  currentRound: number;
}

// ── Blind Interviewer ────────────────────────────────────────────────────

export class BlindInterviewer {
  /**
   * Generate the next interview question based on coverage gaps.
   *
   * SECURITY: The prompt contains ONLY:
   *   - Domain template metadata (public)
   *   - Previous questions (no answers)
   *   - Coverage gap statistics (counts, not content)
   *
   * The LLM never sees any expert answers.
   */
  static async generateQuestion(
    params: BlindInterviewerParams,
  ): Promise<GeneratedQuestion> {
    const { llm, template, coverageStats, previousQuestions, currentRound } =
      params;

    // Identify coverage gaps
    const gaps = BlindInterviewer.identifyGaps(template, coverageStats);

    const system = BlindInterviewer.buildSystemPrompt(template, gaps);
    const userMessage = BlindInterviewer.buildUserMessage(
      template,
      coverageStats,
      previousQuestions,
      currentRound,
      gaps,
    );

    const result = await llm.generateCompletion({
      system,
      userMessage,
      maxTokens: 512,
    });

    return BlindInterviewer.parseResponse(result.text, template, gaps);
  }

  /**
   * Identify which scenario types and tags are under-represented.
   */
  static identifyGaps(
    template: DomainTemplate,
    stats: CoverageStats,
  ): { underrepresentedScenarios: string[]; underrepresentedTags: string[] } {
    const targetPerScenario = Math.max(
      2,
      Math.ceil(template.convergence.minQaPairs / template.scenarioTypes.length),
    );

    const underrepresentedScenarios = template.scenarioTypes
      .filter((s) => (stats.scenarioTypeCounts[s.id] ?? 0) < targetPerScenario)
      .map((s) => s.id);

    const targetPerTag = Math.max(
      1,
      Math.ceil(
        template.convergence.minQaPairs / Math.max(template.tags.length, 1),
      ),
    );

    const underrepresentedTags = template.tags
      .filter((t) => (stats.tagCounts[t.id] ?? 0) < targetPerTag)
      .map((t) => t.id);

    return { underrepresentedScenarios, underrepresentedTags };
  }

  // ── Prompt Construction ──────────────────────────────────────────────

  private static buildSystemPrompt(
    template: DomainTemplate,
    gaps: { underrepresentedScenarios: string[]; underrepresentedTags: string[] },
  ): string {
    const scenarioList = template.scenarioTypes
      .map((s) => `- ${s.id}: ${s.label}`)
      .join("\n");
    const tagList = template.tags
      .map((t) => `- ${t.id} (${t.category}): ${t.label}`)
      .join("\n");

    return [
      `You are an expert interviewer for the domain: ${template.name}.`,
      `${template.description}`,
      ``,
      `Your job is to generate ONE interview question that captures the expert's knowledge.`,
      `You must NEVER ask the expert to confirm or deny previous answers.`,
      `You have NO access to the expert's previous answers. You only see questions.`,
      ``,
      `Available scenario types:`,
      scenarioList,
      ``,
      `Available tags:`,
      tagList,
      ``,
      `Complexity levels: ${template.complexityLevels.join(", ")}`,
      ``,
      `Priority: Focus on ${gaps.underrepresentedScenarios.length > 0 ? `under-represented scenarios: ${gaps.underrepresentedScenarios.join(", ")}` : "deepening existing coverage"}.`,
      ``,
      `Respond in this exact JSON format:`,
      `{"question": "...", "scenarioType": "...", "tags": ["..."], "complexity": "..."}`,
    ].join("\n");
  }

  private static buildUserMessage(
    template: DomainTemplate,
    stats: CoverageStats,
    previousQuestions: string[],
    currentRound: number,
    gaps: { underrepresentedScenarios: string[]; underrepresentedTags: string[] },
  ): string {
    const parts: string[] = [
      `Round ${currentRound + 1}. Total QA pairs so far: ${stats.totalQaPairs}.`,
    ];

    if (previousQuestions.length > 0) {
      // Show the last 10 questions to avoid repetition
      const recent = previousQuestions.slice(-10);
      parts.push(
        `\nPrevious questions asked (do NOT repeat these):`,
        ...recent.map((q, i) => `${i + 1}. ${q}`),
      );
    }

    if (gaps.underrepresentedScenarios.length > 0) {
      parts.push(
        `\nScenarios needing more coverage: ${gaps.underrepresentedScenarios.join(", ")}`,
      );
    }

    if (gaps.underrepresentedTags.length > 0) {
      parts.push(
        `\nTags needing more coverage: ${gaps.underrepresentedTags.join(", ")}`,
      );
    }

    // Include relevant question hints from the template
    const hintKey = gaps.underrepresentedScenarios[0] as keyof typeof template.questionHints | undefined;
    if (hintKey && template.questionHints[hintKey]) {
      parts.push(`\nHint for this scenario type: ${template.questionHints[hintKey]}`);
    }

    parts.push(
      `\nGenerate ONE new interview question targeting the identified gaps.`,
    );

    return parts.join("\n");
  }

  // ── Response Parsing ──────────────────────────────────────────────────

  private static parseResponse(
    text: string,
    template: DomainTemplate,
    gaps: { underrepresentedScenarios: string[]; underrepresentedTags: string[] },
  ): GeneratedQuestion {
    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as {
          question?: string;
          scenarioType?: string;
          tags?: string[];
          complexity?: string;
        };

        if (parsed.question) {
          // Validate scenario type against template
          const validScenarios = new Set(template.scenarioTypes.map((s) => s.id));
          const scenarioType = parsed.scenarioType && validScenarios.has(parsed.scenarioType)
            ? parsed.scenarioType
            : gaps.underrepresentedScenarios[0] ?? template.scenarioTypes[0].id;

          // Validate tags against template
          const validTags = new Set(template.tags.map((t) => t.id));
          const tags = (parsed.tags ?? []).filter((t) => validTags.has(t));
          if (tags.length === 0 && gaps.underrepresentedTags.length > 0) {
            tags.push(gaps.underrepresentedTags[0]);
          }

          // Validate complexity
          const complexity = template.complexityLevels.includes(parsed.complexity ?? "")
            ? parsed.complexity!
            : "L1";

          return {
            question: parsed.question,
            targetScenarioType: scenarioType,
            targetTags: tags,
            suggestedComplexity: complexity,
          };
        }
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback: use the raw text as the question
    return {
      question: text.trim().replace(/^["']|["']$/g, ""),
      targetScenarioType:
        gaps.underrepresentedScenarios[0] ?? template.scenarioTypes[0].id,
      targetTags: gaps.underrepresentedTags.slice(0, 2),
      suggestedComplexity: "L1",
    };
  }
}
