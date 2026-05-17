import { describe, expect, it } from "vitest";
import {
  checkKnowledgeLeakage,
  sanitizeKnowledgeOutput,
} from "../../../src/lib/knowledge-leakage-guard.js";

describe("knowledge leakage guard", () => {
  it("blocks long verbatim spans copied from protected expert answers", () => {
    const protectedAnswer =
      "When evaluating a distressed supplier, start by mapping cash conversion cycles, then interview procurement leaders, then compare delivery variance against contractual penalties, and finally build a weekly exception dashboard before renegotiating payment terms.";

    const result = checkKnowledgeLeakage(
      `The answer is: ${protectedAnswer}`,
      [protectedAnswer],
    );

    expect(result.blocked).toBe(true);
    expect(result.matches[0]).toMatchObject({
      sourceIndex: 0,
      reason: "long_verbatim_span",
    });
  });

  it("blocks short protected answers when copied exactly", () => {
    const protectedAnswer =
      "Use the red-yellow-green escalation rubric only after the sponsor confirms budget authority.";

    const result = checkKnowledgeLeakage(protectedAnswer, [protectedAnswer]);

    expect(result.blocked).toBe(true);
    expect(result.matches[0]?.reason).toBe("short_verbatim_answer");
  });

  it("blocks high-entropy secret-like tokens even in short outputs", () => {
    const syntheticToken = ["yyk", "A1b2C3d4E5f6G7h8I9j0KLMN"].join("_");
    const protectedAnswer = `Internal token: ${syntheticToken}`;

    const result = checkKnowledgeLeakage(
      `Use ${syntheticToken} for the request.`,
      [protectedAnswer],
    );

    expect(result.blocked).toBe(true);
    expect(result.matches[0]?.reason).toBe("high_entropy_token");
  });

  it("allows transformed summaries that do not copy protected source text", () => {
    const protectedAnswer =
      "When evaluating a distressed supplier, start by mapping cash conversion cycles, then interview procurement leaders, then compare delivery variance against contractual penalties, and finally build a weekly exception dashboard before renegotiating payment terms.";

    const result = checkKnowledgeLeakage(
      "Assess liquidity, validate operational impact with stakeholders, quantify contract exposure, and monitor exceptions before changing terms.",
      [protectedAnswer],
    );

    expect(result.blocked).toBe(false);
    expect(result.matches).toEqual([]);
  });

  it("replaces blocked output with a safe refusal without exposing the match", () => {
    const protectedAnswer =
      "Use the red-yellow-green escalation rubric only after the sponsor confirms budget authority.";

    const result = sanitizeKnowledgeOutput(protectedAnswer, [protectedAnswer]);

    expect(result.leakageBlocked).toBe(true);
    expect(result.text).toContain("Response withheld");
    expect(result.text).not.toContain("red-yellow-green");
    expect(result.leakageMatches[0]).not.toHaveProperty("fragment");
  });
});
