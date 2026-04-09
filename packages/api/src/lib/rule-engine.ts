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

  // ── Markdown Rule Parsing ───────────────────────────────────────────────────

  /**
   * Parse Markdown-formatted rules into structured sections.
   * Extracts ## headings as dimensions, bold items and list items as rules,
   * and keywords from content for matching.
   * Returns null if text has no recognizable Markdown structure.
   */
  static tryParseMarkdownRules(text: string): MarkdownSection[] | null {
    const lines = text.split("\n");
    const sections: MarkdownSection[] = [];
    let current: MarkdownSection | null = null;

    for (const line of lines) {
      const headingMatch = line.match(/^##\s+(.+)/);
      if (headingMatch) {
        if (current && current.items.length > 0) {
          sections.push(current);
        }
        current = {
          heading: headingMatch[1].trim(),
          items: [],
          keywords: [],
        };
        continue;
      }
      if (!current) continue;

      // Extract numbered list items: "1. **NEVER do X**" or "1. Do X"
      const numberedMatch = line.match(/^\s*\d+\.\s+\*{0,2}(.+?)\*{0,2}\s*$/);
      // Extract bullet list items: "- Something important"
      const bulletMatch = line.match(/^\s*[-*]\s+\*{0,2}(.+?)\*{0,2}\s*$/);
      // Extract bold text from any line: "**important phrase**"
      const boldMatches = line.matchAll(/\*\*([^*]+)\*\*/g);

      if (numberedMatch) {
        current.items.push(numberedMatch[1].replace(/\*\*/g, "").trim());
      } else if (bulletMatch) {
        current.items.push(bulletMatch[1].replace(/\*\*/g, "").trim());
      }

      for (const bold of boldMatches) {
        const phrase = bold[1].toLowerCase().trim();
        if (phrase.length > 2 && phrase.length < 80) {
          current.keywords.push(phrase);
        }
      }

      // Extract backtick tokens: `BLOCKED`, `ESCALATION_REQUIRED`
      const tickMatches = line.matchAll(/`([A-Z_]{3,})`/g);
      for (const tick of tickMatches) {
        current.keywords.push(tick[1].toLowerCase());
      }
    }

    if (current && current.items.length > 0) {
      sections.push(current);
    }

    return sections.length > 0 ? sections : null;
  }

  /**
   * Evaluate Markdown-parsed sections against a user query.
   * Scores each section by keyword overlap between query and section content.
   * No rule content is exposed in the output — only dimension names, scores,
   * and generic conclusion tokens.
   */
  static evaluateMarkdown(
    sections: MarkdownSection[],
    userQuery: string,
  ): RuleEvaluation {
    const queryWords = new Set(
      userQuery
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );

    const results: MatchResult[] = [];

    for (const section of sections) {
      // Build the section's keyword set from items + extracted keywords
      const sectionText = section.items.join(" ").toLowerCase();
      const sectionWords = new Set(
        sectionText
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2),
      );

      // Count query words that match section content
      let matches = 0;
      for (const word of queryWords) {
        if (sectionWords.has(word)) matches++;
      }

      // Also check extracted keyword phrases
      const queryLower = userQuery.toLowerCase();
      let phraseMatches = 0;
      for (const kw of section.keywords) {
        if (queryLower.includes(kw)) phraseMatches++;
      }

      // Score: combination of word overlap and phrase matches
      const wordScore = queryWords.size > 0 ? matches / queryWords.size : 0;
      const phraseScore =
        section.keywords.length > 0
          ? phraseMatches / section.keywords.length
          : 0;
      const combined = wordScore * 0.6 + phraseScore * 0.4;
      const score = Math.max(1, Math.min(10, Math.round(combined * 10 + 3)));

      // Determine conclusion token from heading — never expose rule content
      const conclusion = section.items.length > 0
        ? `${section.items.length}_rules_defined`
        : "section_present";

      results.push({
        dimension: section.heading,
        score,
        triggered_rules: [`md_${section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`],
        conclusion_key: conclusion,
      });
    }

    const overallScore =
      results.length > 0
        ? Math.round(
            results.reduce((acc, r) => acc + r.score, 0) / results.length,
          )
        : 5;

    const verdict: RuleEvaluation["verdict"] =
      overallScore >= 7 ? "recommend" : overallScore >= 4 ? "neutral" : "caution";

    return { results, verdict, overall_score: overallScore };
  }
}

/** Parsed Markdown section used by evaluateMarkdown */
export interface MarkdownSection {
  heading: string;
  items: string[];
  keywords: string[];
}
