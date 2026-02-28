/**
 * Unit tests for RuleEngine — the P0 LLM Firewall fix.
 *
 * These tests verify that the local evaluation logic is correct
 * and that NO plaintext rule content escapes the engine.
 *
 * License: Apache 2.0
 */

import { describe, it, expect } from "vitest";
import {
  RuleEngine,
  type Rule,
} from "../../../src/lib/rule-engine.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const INVESTMENT_RULES: Rule[] = [
  {
    id: "rule-001",
    dimension: "market_fit",
    condition: { keywords: ["B2B", "enterprise", "SaaS"] },
    conclusion: "strong_market_signal",
    weight: 0.9,
  },
  {
    id: "rule-002",
    dimension: "market_fit",
    condition: { keywords: ["niche", "small"] },
    conclusion: "weak_market_signal",
    weight: 0.4,
  },
  {
    id: "rule-003",
    dimension: "team_quality",
    condition: { keywords: ["serial entrepreneur", "YC", "Stanford"] },
    conclusion: "top_tier_team",
    weight: 1.0,
  },
  {
    id: "rule-004",
    dimension: "team_quality",
    condition: {},  // always fires
    conclusion: "unknown_team",
    weight: 0.2,
  },
];

// ─── tryParseRules ────────────────────────────────────────────────────────────

describe("RuleEngine.tryParseRules", () => {
  it("returns Rule[] for valid JSON rule array", () => {
    const json = JSON.stringify(INVESTMENT_RULES);
    const result = RuleEngine.tryParseRules(json);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);
    expect(result![0].id).toBe("rule-001");
  });

  it("returns null for plain text (markdown)", () => {
    const text = "# Expert Knowledge\n\nThis is a markdown document.\n\nKey insight: focus on retention.";
    expect(RuleEngine.tryParseRules(text)).toBeNull();
  });

  it("returns null for JSON that is not an array of Rules", () => {
    expect(RuleEngine.tryParseRules('{"key": "value"}')).toBeNull();
    expect(RuleEngine.tryParseRules("[]")).toBeNull(); // empty array
    expect(RuleEngine.tryParseRules("[1, 2, 3]")).toBeNull(); // wrong element type
  });

  it("returns null for invalid JSON", () => {
    expect(RuleEngine.tryParseRules("not json")).toBeNull();
    expect(RuleEngine.tryParseRules("{broken:}")).toBeNull();
  });

  it("handles extra whitespace around JSON", () => {
    const json = "  " + JSON.stringify(INVESTMENT_RULES) + "\n";
    expect(RuleEngine.tryParseRules(json)).not.toBeNull();
  });
});

// ─── evaluate ────────────────────────────────────────────────────────────────

describe("RuleEngine.evaluate", () => {
  it("matches keyword rules and computes per-dimension scores", () => {
    const query = "This is a B2B SaaS startup founded by a serial entrepreneur from Stanford.";
    const result = RuleEngine.evaluate(INVESTMENT_RULES, query);

    // Both market_fit rules — rule-001 fires (B2B), rule-002 does not (no "niche")
    const marketFit = result.results.find((r) => r.dimension === "market_fit");
    expect(marketFit).toBeDefined();
    expect(marketFit!.triggered_rules).toContain("rule-001");
    expect(marketFit!.triggered_rules).not.toContain("rule-002");
    expect(marketFit!.score).toBeGreaterThan(5); // high score since top weight rule fires

    // Both team rules — rule-003 fires (serial entrepreneur), rule-004 always fires
    const team = result.results.find((r) => r.dimension === "team_quality");
    expect(team).toBeDefined();
    expect(team!.triggered_rules).toContain("rule-003");
    expect(team!.triggered_rules).toContain("rule-004");
    expect(team!.score).toBe(10); // all weight fired
  });

  it("returns 'recommend' verdict for high overall score", () => {
    const query = "B2B enterprise SaaS, serial entrepreneur, Stanford YC background";
    const result = RuleEngine.evaluate(INVESTMENT_RULES, query);
    expect(result.overall_score).toBeGreaterThanOrEqual(7);
    expect(result.verdict).toBe("recommend");
  });

  it("returns 'caution' verdict for no keyword matches", () => {
    const noMatchRules: Rule[] = [
      {
        id: "r1",
        dimension: "fit",
        condition: { keywords: ["unicorn", "impossible"] },
        conclusion: "match",
        weight: 1.0,
      },
    ];
    const result = RuleEngine.evaluate(noMatchRules, "completely irrelevant query");
    expect(result.results[0].score).toBe(0);
    expect(result.verdict).toBe("caution");
  });

  it("empty keywords = always-fire condition", () => {
    const alwaysRule: Rule[] = [
      {
        id: "r1",
        dimension: "test",
        condition: {},
        conclusion: "always",
        weight: 0.5,
      },
    ];
    const result = RuleEngine.evaluate(alwaysRule, "anything at all");
    expect(result.results[0].triggered_rules).toContain("r1");
    expect(result.results[0].score).toBe(10);
  });

  it("is case-insensitive for keyword matching", () => {
    const rule: Rule[] = [
      {
        id: "r1",
        dimension: "test",
        condition: { keywords: ["ENTERPRISE"] },
        conclusion: "match",
        weight: 0.8,
      },
    ];
    const result = RuleEngine.evaluate(rule, "an enterprise deal");
    expect(result.results[0].triggered_rules).toContain("r1");
  });

  it("conclusion_key is from the highest-weight triggered rule", () => {
    const query = "B2B SaaS niche small startup";
    const result = RuleEngine.evaluate(INVESTMENT_RULES, query);
    const marketFit = result.results.find((r) => r.dimension === "market_fit")!;
    // Both rule-001 (weight 0.9) and rule-002 (weight 0.4) fire
    expect(marketFit.triggered_rules).toContain("rule-001");
    expect(marketFit.triggered_rules).toContain("rule-002");
    // Top-weight conclusion should win
    expect(marketFit.conclusion_key).toBe("strong_market_signal");
  });

  it("empty rules array → neutral score 5", () => {
    const result = RuleEngine.evaluate([], "any query");
    expect(result.overall_score).toBe(5);
    expect(result.verdict).toBe("neutral");
    expect(result.results).toHaveLength(0);
  });
});

// ─── toSafePrompt ─────────────────────────────────────────────────────────────

describe("RuleEngine.toSafePrompt", () => {
  it("contains scores and verdict but NO rule internals", () => {
    // Use a query that has no overlap with rule condition keywords
    const query = "Evaluate this startup opportunity please.";
    const evaluation = RuleEngine.evaluate(INVESTMENT_RULES, query);
    const prompt = RuleEngine.toSafePrompt(evaluation, query);

    // Must include safe output fields
    expect(prompt).toContain(String(evaluation.overall_score));
    expect(prompt).toContain(evaluation.verdict);
    expect(prompt).toContain("market_fit");
    expect(prompt).toContain("team_quality");
    // User query is safely included (caller already knows their own query)
    expect(prompt).toContain(query);

    // Must NOT contain rule internals: condition keywords, weights, or rule IDs
    expect(prompt).not.toContain("B2B");              // rule condition keyword
    expect(prompt).not.toContain("serial entrepreneur"); // rule condition keyword
    expect(prompt).not.toContain("rule-001");           // internal rule id
    expect(prompt).not.toContain("rule-002");           // internal rule id
    expect(prompt).not.toContain('"weight"');           // rule structure field
    expect(prompt).not.toContain('"condition"');        // rule structure field
  });

  it("contains user query for context but no rule internals", () => {
    const query = "Is this startup worth investing in?";
    const evaluation = RuleEngine.evaluate(INVESTMENT_RULES, query);
    const prompt = RuleEngine.toSafePrompt(evaluation, query);
    expect(prompt).toContain(query);
  });
});

// ─── mockResponseForFreeformRules ─────────────────────────────────────────────

describe("RuleEngine.mockResponseForFreeformRules", () => {
  it("returns a response that does not expose any rule content", () => {
    const query = "Should I invest in Acme Corp?";
    const response = RuleEngine.mockResponseForFreeformRules(query);
    expect(response).toContain(query.slice(0, 50)); // includes truncated query
    expect(response).toContain("free-form");
    expect(response).toContain("JSON array");
  });

  it("truncates long queries to 100 chars", () => {
    const longQuery = "a".repeat(200);
    const response = RuleEngine.mockResponseForFreeformRules(longQuery);
    expect(response).toContain("...");
    expect(response).not.toContain("a".repeat(101));
  });
});
