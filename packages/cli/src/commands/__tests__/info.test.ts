import { describe, it, expect, vi, beforeEach } from "vitest";
import { infoCommand } from "../info.js";
import * as registry from "../../lib/registry.js";

vi.mock("../../lib/registry.js");
vi.mock("../../lib/logger.js");
vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnValue({ stop: vi.fn(), fail: vi.fn() }),
  }),
}));

describe("infoCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch by packageId and display details", async () => {
    const mockPkg = {
      id: "p1",
      packageId: "test-skill",
      displayName: "Test Skill",
      version: "1.0.0",
      description: "A cool skill",
      authorName: "Author",
      category: "tools",
      maturity: "stable",
      license: "MIT",
      installCount: 100,
      rating: 4.8,
      ratingCount: 50,
      readme: "Hello world",
    };
    const mockClient = {
      getByPackageId: vi.fn().mockResolvedValue(mockPkg),
      getById: vi.fn(),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(mockClient as any);

    await infoCommand("test-skill", {});

    expect(mockClient.getByPackageId).toHaveBeenCalledWith("test-skill");
  });
});
