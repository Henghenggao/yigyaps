import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchCommand } from "../search.js";
import * as registry from "../../lib/registry.js";

vi.mock("../../lib/registry.js");
vi.mock("../../lib/logger.js");
vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnValue({ stop: vi.fn(), fail: vi.fn() }),
  }),
}));

describe("searchCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display results in a table", async () => {
    const mockResult = {
      packages: [
        {
          packageId: "skill-1",
          displayName: "Skill 1",
          version: "1.0.0",
          authorName: "Dev",
          installCount: 10,
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
    };
    const mockClient = { search: vi.fn().mockResolvedValue(mockResult) };
    vi.mocked(registry.createRegistryClient).mockReturnValue(mockClient as any);

    await searchCommand("test", {});

    expect(mockClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: "test" }),
    );
  });

  it("should handle empty results", async () => {
    const mockResult = { packages: [], total: 0, limit: 10, offset: 0 };
    const mockClient = { search: vi.fn().mockResolvedValue(mockResult) };
    vi.mocked(registry.createRegistryClient).mockReturnValue(mockClient as any);

    await searchCommand("nonexistent", {});

    expect(mockClient.search).toHaveBeenCalled();
  });
});
