/**
 * YigYaps Local Rule Engine
 *
 * Evaluates skill rules entirely in-process without transmitting plaintext rules
 * to any external API. Only a structured conclusion skeleton leaves this module.
 *
 * Rule Format (JSON array):
 * [
 *   {
 *     "id": "rule-001",
 *     "dimension": "market_fit",
 *     "condition": { "keywords": ["B2B", "enterprise"] },
 *     "conclusion": "strong_market_signal",
 *     "weight": 0.8
 *   }
 * ]
 *
 * License: Apache 2.0
 */

export interface Rule {
  id: string;
  /** Evaluation dimension, e.g. "market_fit", "team_quality" */
  dimension: string;
  /**
   * Conditions that trigger this rule.
   * Supported keys:
   *   - keywords: string[]  — any keyword must appear in userQuery (case-insensitive)
   *   - (empty object)      — always fires
   */
  condition: { keywords?: string[] } & Record<string, unknown>;
  /** Short conclusion token returned in skeleton — NEVER the full reasoning */
  conclusion: string;
  /** Relative weight [0–1] for score computation */
  weight: number;
}

export interface MatchResult {
  /** Dimension name (safe to transmit) */
  dimension: string;
  /** Computed score 0–10 */
  score: number;
  /** IDs of triggered rules — no rule content is exposed */
  triggered_rules: string[];
  /** Primary conclusion token from the highest-weight triggered rule */
  conclusion_key: string;
}

export interface RuleEvaluation {
  results: MatchResult[];
  /** Aggregate verdict: recommend | neutral | caution */
  verdict: "recommend" | "neutral" | "caution";
  /** Overall score 0–10 */
  overall_score: number;
}

export class RuleEngine {
  /**
   * Attempt to parse text as a structured JSON rule set.
   * Returns null if text is free-form (markdown, plain text, etc.).
   */
  static tryParseRules(text: string): Rule[] | null {
    try {
      const parsed: unknown = JSON.parse(text.trim());
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every(
          (r) =>
            typeof r === "object" &&
            r !== null &&
            typeof (r as Rule).id === "string" &&
            typeof (r as Rule).dimension === "string" &&
            typeof (r as Rule).conclusion === "string",
        )
      ) {
        return parsed as Rule[];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Evaluate structured rules against a user query.
   * The evaluation is entirely local — no external calls.
   */
  static evaluate(rules: Rule[], userQuery: string): RuleEvaluation {
    const queryLower = userQuery.toLowerCase();

    // Group rules by dimension
    const byDimension = new Map<string, Rule[]>();
    for (const rule of rules) {
      const list = byDimension.get(rule.dimension) ?? [];
      list.push(rule);
      byDimension.set(rule.dimension, list);
    }

    const results: MatchResult[] = [];

    for (const [dimension, dimRules] of byDimension) {
      const triggered: Rule[] = [];

      for (const rule of dimRules) {
        const keywords = rule.condition?.keywords ?? [];
        const conditionMet =
          keywords.length === 0 ||
          keywords.some((kw) => queryLower.includes(kw.toLowerCase()));

        if (conditionMet) {
          triggered.push(rule);
        }
      }

      // Score = (sum of triggered weights / max possible weight) × 10
      const triggeredWeight = triggered.reduce(
        (acc, r) => acc + (r.weight ?? 0.5),
        0,
      );
      const maxWeight = dimRules.reduce((acc, r) => acc + (r.weight ?? 0.5), 0);
      const score =
        maxWeight > 0 ? Math.round((triggeredWeight / maxWeight) * 10) : 5;

      // Pick the conclusion of the highest-weight triggered rule
      const topRule = triggered.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0];

      results.push({
        dimension,
        score,
        triggered_rules: triggered.map((r) => r.id),
        conclusion_key: topRule?.conclusion ?? "inconclusive",
      });
    }

    // Aggregate verdict
    const overallScore =
      results.length > 0
        ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)
        : 5;

    const verdict: RuleEvaluation["verdict"] =
      overallScore >= 7 ? "recommend" : overallScore >= 4 ? "neutral" : "caution";

    return { results, verdict, overall_score: overallScore };
  }

  /**
   * Serialize the evaluation skeleton into a safe prompt for external LLM polishing.
   * This prompt contains ONLY scores, dimension names, and conclusion tokens —
   * never any rule content, reasoning paths, or knowledge details.
   */
  static toSafePrompt(evaluation: RuleEvaluation, userQuery: string): string {
    const dimensionLines = evaluation.results
      .map(
        (r) =>
          `  - ${r.dimension}: score=${r.score}/10, conclusion="${r.conclusion_key}"`,
      )
      .join("\n");

    return [
      `User query: ${userQuery}`,
      ``,
      `Structured skill evaluation:`,
      `  Overall score: ${evaluation.overall_score}/10`,
      `  Verdict: ${evaluation.verdict}`,
      `  Dimension breakdown:`,
      dimensionLines,
      ``,
      `Write a concise natural language response based solely on the above evaluation data.`,
      `Do not infer or add information beyond what is shown.`,
    ].join("\n");
  }

  /**
   * Generate a mock response for free-form (non-JSON) rule sets.
   * Used when the skill knowledge is plain text and cannot be parsed as rules.
   * Returns a safe response without exposing any knowledge content.
   */
  static mockResponseForFreeformRules(userQuery: string): string {
    return (
      `[Skill processed your query: "${userQuery.slice(0, 100)}${userQuery.length > 100 ? "..." : ""}"]\n\n` +
      `This skill uses free-form knowledge. ` +
      `To enable structured evaluation with local rule matching, the author should format rules as a JSON array. ` +
      `See the skill documentation for the supported rule format.`
    );
  }
}
