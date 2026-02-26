import { describe, it, expect, vi, beforeEach } from "vitest";
import { initCommand } from "../init.js";
import fs from "fs-extra";
import { CliError } from "../../lib/errors.js";

vi.mock("fs-extra");

// Mock @clack/prompts so interactive prompts don't block
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  note: vi.fn(),
  log: { step: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
  isCancel: vi.fn().mockReturnValue(false),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  select: vi.fn().mockResolvedValue("developer-tools"),
  text: vi.fn().mockResolvedValue("Test Author"),
}));

describe("initCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw if directory already exists", async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    await expect(initCommand("existing")).rejects.toThrow(CliError);
  });

  it("should create directory structure and package.json", async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.outputJson).mockResolvedValue(undefined);
    vi.mocked(fs.outputFile).mockResolvedValue(undefined as never);

    await initCommand("new-skill");

    // Should create rules/, knowledge/, mcp/ directories
    expect(fs.ensureDir).toHaveBeenCalledTimes(3);
    expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining("rules"));

    // Uses outputJson to write package.json
    expect(fs.outputJson).toHaveBeenCalledWith(
      expect.stringContaining("package.json"),
      expect.objectContaining({
        name: "new-skill",
        version: "0.1.0",
      }),
      expect.any(Object),
    );

    // Should create the example rule file
    expect(fs.outputFile).toHaveBeenCalledWith(
      expect.stringContaining("main.md"),
      expect.any(String),
    );
  });
});
