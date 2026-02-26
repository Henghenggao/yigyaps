import { describe, it, expect, vi, beforeEach } from "vitest";
import { runCommand } from "../run.js";
import * as registry from "../../lib/registry.js";
import { YigYapsRegistryClient } from "@yigyaps/client";

vi.mock("../../lib/registry.js");
vi.mock("../../lib/logger.js");
vi.mock("../../lib/sandbox.js", () => {
  return {
    SkillSandbox: class {
      start = vi.fn().mockResolvedValue(undefined);
    },
  };
});

vi.mock("ora", () => ({
  default: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn(),
    fail: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe("runCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should flow through the run process", async () => {
    const mockPkg = {
      id: "p1",
      packageId: "test",
      displayName: "Test",
      version: "1.0.0",
      description: "Desc",
      authorName: "Author",
      category: "tools",
    };
    const mockRules = { rules: [] };
    const mockClient = {
      getByPackageId: vi.fn().mockResolvedValue(mockPkg),
      getRules: vi.fn().mockResolvedValue(mockRules),
    };

    vi.mocked(registry.createRegistryClient).mockReturnValue(
      mockClient as unknown as YigYapsRegistryClient,
    );

    await runCommand("test", {});

    expect(mockClient.getByPackageId).toHaveBeenCalled();
    expect(mockClient.getRules).toHaveBeenCalled();
  });
});
