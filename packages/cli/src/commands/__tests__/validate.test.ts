import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateCommand } from "../validate.js";
import fs from "fs-extra";
import { CliError } from "../../lib/errors.js";

vi.mock("fs-extra");
vi.mock("../../lib/logger.js");

describe("validateCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw if package.json is missing", async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    await expect(validateCommand()).rejects.toThrow(CliError);
  });

  it("should throw if manifest is invalid", async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readJson).mockResolvedValue({ name: "invalid" }); // Small description missing
    await expect(validateCommand()).rejects.toThrow(CliError);
  });

  it("should pass if everything is valid", async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readJson).mockResolvedValue({
      name: "test-skill",
      version: "1.0.0",
      description: "A very long description that passes validation.",
      author: "test",
      license: "MIT",
    });
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
    vi.mocked(fs.readdir).mockResolvedValue(["rule1.md"] as any);

    await expect(validateCommand()).resolves.not.toThrow();
  });
});
