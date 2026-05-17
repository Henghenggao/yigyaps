import { describe, expect, it } from "vitest";
import { isValidPackageId } from "@yigyaps/types";

describe("packageId contract", () => {
  it.each([
    "abc",
    "legal-contract-reviewer",
    "skill-123",
    "a".repeat(100),
  ])("accepts valid package id %s", (packageId) => {
    expect(isValidPackageId(packageId)).toBe(true);
  });

  it.each([
    "",
    "ab",
    "-starts-with-dash",
    "ends-with-dash-",
    "HasUppercase",
    "contains space",
    "contains/slash",
    "contains_underscore",
    "a".repeat(101),
  ])("rejects invalid package id %s", (packageId) => {
    expect(isValidPackageId(packageId)).toBe(false);
  });
});
