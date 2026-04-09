/**
 * BlindInterviewer Unit Tests
 *
 * Tests the interview question generation and coverage gap analysis.
 * Uses mock LLMProvider to avoid external API calls.
 *
 * License: Apache 2.0
 */

import { describe, it, expect, vi } from "vitest";
import { BlindInterviewer } from "../../../src/lib/blind-interviewer.js";
import type { LLMProvider, LLMCompletionResult } from "../../../src/lib/llm-provider.js";
import type { DomainTemplate } from "../../../src/lib/template-loader.js";

// ── Fixtures ─────────────────────────────────────────────────────────────

const mockTemplate: DomainTemplate = {
  id: "test-domain",
  name: "Test Domain",
  description: "A test domain for unit testing",
  tags: [
    { id: "tag_a", label: "Tag A", category: "cat1" },
    { id: "tag_b", label: "Tag B", category: "cat1" },
    { id: "tag_c", label: "Tag C", category: "cat2" },
  ],
  scenarioTypes: [
    { id: "structured_interview", label: "Structured Interview" },
    { id: "case_judgment", label: "Case Judgment" },
    { id: "scenario_simulation", label: "Scenario Simulation" },
  ],
  complexityLevels: ["L1", "L2", "L3"],
  convergence: {
    minQaPairs: 15,
    minScenarioCoverage: 3,
    minValidationPassRate: 0.6,
    minValidationRounds: 1,
    minSourceDiversity: 1,
  },
  questionHints: {
    structured_interview: "Ask about processes",
    case_judgment: "Present case scenarios",
    scenario_simulation: "Simulate real situations",
  },
};

function createMockLLM(responseText: string): LLMProvider {
  return {
    generateCompletion: vi.fn().mockResolvedValue({
      text: responseText,
      model: "test-model",
      inputTokens: 100,
      outputTokens: 50,
    } as LLMCompletionResult),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("BlindInterviewer", () => {
  describe("identifyGaps", () => {
    it("identifies all scenarios as gaps when no QA pairs exist", () => {
      const stats = {
        totalQaPairs: 0,
        tagCounts: {},
        scenarioTypeCounts: {},
        sourceCounts: {},
      };

      const gaps = BlindInterviewer.identifyGaps(mockTemplate, stats);

      expect(gaps.underrepresentedScenarios).toContain("structured_interview");
      expect(gaps.underrepresentedScenarios).toContain("case_judgment");
      expect(gaps.underrepresentedScenarios).toContain("scenario_simulation");
      expect(gaps.underrepresentedTags).toContain("tag_a");
      expect(gaps.underrepresentedTags).toContain("tag_b");
      expect(gaps.underrepresentedTags).toContain("tag_c");
    });

    it("reduces gaps as coverage increases", () => {
      const stats = {
        totalQaPairs: 10,
        tagCounts: { tag_a: 5, tag_b: 5, tag_c: 5 },
        scenarioTypeCounts: {
          structured_interview: 5,
          case_judgment: 5,
        },
        sourceCounts: { structured_interview: 10 },
      };

      const gaps = BlindInterviewer.identifyGaps(mockTemplate, stats);

      // scenario_simulation is still missing
      expect(gaps.underrepresentedScenarios).toContain("scenario_simulation");
      // structured_interview and case_judgment should be covered
      expect(gaps.underrepresentedScenarios).not.toContain(
        "structured_interview",
      );
      expect(gaps.underrepresentedScenarios).not.toContain("case_judgment");
    });

    it("returns empty gaps when fully covered", () => {
      const stats = {
        totalQaPairs: 15,
        tagCounts: { tag_a: 5, tag_b: 5, tag_c: 5 },
        scenarioTypeCounts: {
          structured_interview: 5,
          case_judgment: 5,
          scenario_simulation: 5,
        },
        sourceCounts: { structured_interview: 15 },
      };

      const gaps = BlindInterviewer.identifyGaps(mockTemplate, stats);

      expect(gaps.underrepresentedScenarios).toHaveLength(0);
      expect(gaps.underrepresentedTags).toHaveLength(0);
    });
  });

  describe("generateQuestion", () => {
    it("parses well-formed JSON response from LLM", async () => {
      const response = JSON.stringify({
        question: "How do you handle deadline pressure?",
        scenarioType: "structured_interview",
        tags: ["tag_a", "tag_b"],
        complexity: "L2",
      });

      const llm = createMockLLM(response);

      const result = await BlindInterviewer.generateQuestion({
        llm,
        template: mockTemplate,
        coverageStats: {
          totalQaPairs: 0,
          tagCounts: {},
          scenarioTypeCounts: {},
          sourceCounts: {},
        },
        previousQuestions: [],
        currentRound: 0,
      });

      expect(result.question).toBe("How do you handle deadline pressure?");
      expect(result.targetScenarioType).toBe("structured_interview");
      expect(result.targetTags).toEqual(["tag_a", "tag_b"]);
      expect(result.suggestedComplexity).toBe("L2");
    });

    it("falls back gracefully for non-JSON LLM response", async () => {
      const llm = createMockLLM(
        "What is your approach to risk management?",
      );

      const result = await BlindInterviewer.generateQuestion({
        llm,
        template: mockTemplate,
        coverageStats: {
          totalQaPairs: 0,
          tagCounts: {},
          scenarioTypeCounts: {},
          sourceCounts: {},
        },
        previousQuestions: [],
        currentRound: 0,
      });

      expect(result.question).toBe(
        "What is your approach to risk management?",
      );
      // Should use first underrepresented scenario as fallback
      expect(mockTemplate.scenarioTypes.map((s) => s.id)).toContain(
        result.targetScenarioType,
      );
      expect(result.suggestedComplexity).toBe("L1");
    });

    it("validates scenario type against template", async () => {
      const response = JSON.stringify({
        question: "Test question?",
        scenarioType: "invalid_scenario",
        tags: ["tag_a"],
        complexity: "L1",
      });

      const llm = createMockLLM(response);

      const result = await BlindInterviewer.generateQuestion({
        llm,
        template: mockTemplate,
        coverageStats: {
          totalQaPairs: 0,
          tagCounts: {},
          scenarioTypeCounts: {},
          sourceCounts: {},
        },
        previousQuestions: [],
        currentRound: 0,
      });

      // Should fall back to a valid scenario type
      expect(
        mockTemplate.scenarioTypes.map((s) => s.id),
      ).toContain(result.targetScenarioType);
    });

    it("filters invalid tags from LLM response", async () => {
      const response = JSON.stringify({
        question: "Test question?",
        scenarioType: "structured_interview",
        tags: ["tag_a", "invalid_tag", "tag_c"],
        complexity: "L1",
      });

      const llm = createMockLLM(response);

      const result = await BlindInterviewer.generateQuestion({
        llm,
        template: mockTemplate,
        coverageStats: {
          totalQaPairs: 0,
          tagCounts: {},
          scenarioTypeCounts: {},
          sourceCounts: {},
        },
        previousQuestions: [],
        currentRound: 0,
      });

      expect(result.targetTags).toContain("tag_a");
      expect(result.targetTags).toContain("tag_c");
      expect(result.targetTags).not.toContain("invalid_tag");
    });

    it("sends previous questions in the prompt", async () => {
      const llm = createMockLLM(
        '{"question":"New question?","scenarioType":"structured_interview","tags":["tag_a"],"complexity":"L1"}',
      );

      await BlindInterviewer.generateQuestion({
        llm,
        template: mockTemplate,
        coverageStats: {
          totalQaPairs: 2,
          tagCounts: { tag_a: 2 },
          scenarioTypeCounts: { structured_interview: 2 },
          sourceCounts: { structured_interview: 2 },
        },
        previousQuestions: ["Question 1?", "Question 2?"],
        currentRound: 2,
      });

      // Verify the LLM was called with previous questions in the user message
      const call = (llm.generateCompletion as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(call.userMessage).toContain("Question 1?");
      expect(call.userMessage).toContain("Question 2?");
    });

    it("never includes answer content in the prompt", async () => {
      const llm = createMockLLM(
        '{"question":"Next question?","scenarioType":"case_judgment","tags":["tag_b"],"complexity":"L1"}',
      );

      await BlindInterviewer.generateQuestion({
        llm,
        template: mockTemplate,
        coverageStats: {
          totalQaPairs: 3,
          tagCounts: { tag_a: 3 },
          scenarioTypeCounts: { structured_interview: 3 },
          sourceCounts: { structured_interview: 3 },
        },
        previousQuestions: ["What is your approach?"],
        currentRound: 3,
      });

      const call = (llm.generateCompletion as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      // The system prompt and user message should never contain "answer"
      // in a way that suggests expert content is being passed
      expect(call.system).not.toContain("expert answer");
      expect(call.userMessage).not.toContain("expert answer");
    });
  });
});
