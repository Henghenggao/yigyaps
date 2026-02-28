import { describe, it, expect, vi, beforeEach } from "vitest";
import { statusCommand } from "../status.js";
import * as registry from "../../lib/registry.js";
import { CliError } from "../../lib/errors.js";
import type { YigYapsRegistryClient } from "@yigyaps/client";

vi.mock("../../lib/registry.js");
vi.mock("../../lib/logger.js");
vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnValue({ stop: vi.fn(), fail: vi.fn() }),
  }),
}));

describe("statusCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display status for existing package", async () => {
    const mockPkg = {
      id: "spkg_123",
      packageId: "test-skill",
      displayName: "Test Skill",
      version: "1.0.0",
      authorName: "Owner",
      maturity: "stable",
      installCount: 5,
      rating: 4.5,
      ratingCount: 10,
    };
    const mockClient = { getByPackageId: vi.fn().mockResolvedValue(mockPkg) };
    vi.mocked(registry.createRegistryClient).mockReturnValue(mockClient as unknown as YigYapsRegistryClient);

    await statusCommand("test-skill");

    expect(mockClient.getByPackageId).toHaveBeenCalledWith("test-skill");
  });

  it("should handle non-existent package", async () => {
    const mockClient = {
      getByPackageId: vi.fn().mockRejectedValue(new Error("404")),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(mockClient as unknown as YigYapsRegistryClient);

    await expect(statusCommand("missing")).rejects.toThrow(CliError);
  });
});
