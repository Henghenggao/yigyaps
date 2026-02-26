import { describe, it, expect, vi, beforeEach } from "vitest";
import { doctorCommand } from "../doctor.js";
import * as registry from "../../lib/registry.js";
import * as auth from "../../lib/auth.js";
import { YigYapsRegistryClient } from "@yigyaps/client";

vi.mock("../../lib/registry.js");
vi.mock("../../lib/auth.js");
vi.mock("../../lib/logger.js");
vi.mock("fs-extra");
vi.mock("ora", () => ({
  default: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn(),
    fail: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe("doctorCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.getSession).mockReturnValue({
      registryUrl: "https://api.yigyaps.com",
      apiKey: "yg_test_key",
    });
  });

  it("should complete diagnostics when registry is reachable", async () => {
    const mockClient = {
      getDiscovery: vi.fn().mockResolvedValue({ registries: [] }),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(
      mockClient as unknown as YigYapsRegistryClient,
    );

    // Should not throw
    await expect(doctorCommand()).resolves.toBeUndefined();

    expect(mockClient.getDiscovery).toHaveBeenCalled();
  });

  it("should continue even when registry is unreachable", async () => {
    const mockClient = {
      getDiscovery: vi.fn().mockRejectedValue(new Error("Network error")),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(
      mockClient as unknown as YigYapsRegistryClient,
    );

    // Should not throw even with network failure
    await expect(doctorCommand()).resolves.toBeUndefined();
  });
});
