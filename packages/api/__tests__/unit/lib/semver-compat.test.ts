import { describe, expect, it } from "vitest";
import { satisfiesVersionRange } from "../../../src/lib/semver-compat.js";

describe("satisfiesVersionRange", () => {
  it("supports comparator sets used by SkillPack compatibility metadata", () => {
    expect(satisfiesVersionRange("0.7.0", ">=0.7.0 <1.0.0")).toBe(true);
    expect(satisfiesVersionRange("1.0.0", ">=0.7.0 <1.0.0")).toBe(false);
  });

  it("supports caret, tilde, exact, wildcard, and OR ranges", () => {
    expect(satisfiesVersionRange("0.7.3", "^0.7.0")).toBe(true);
    expect(satisfiesVersionRange("0.8.0", "^0.7.0")).toBe(false);
    expect(satisfiesVersionRange("1.2.9", "~1.2.0")).toBe(true);
    expect(satisfiesVersionRange("1.3.0", "~1.2.0")).toBe(false);
    expect(satisfiesVersionRange("1.2.3", "1.2.3")).toBe(true);
    expect(satisfiesVersionRange("2.0.0", "*")).toBe(true);
    expect(satisfiesVersionRange("0.6.0", "<0.5.0 || >=0.6.0 <0.7.0")).toBe(
      true,
    );
  });
});
