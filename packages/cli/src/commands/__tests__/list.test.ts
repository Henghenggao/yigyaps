import { describe, it, expect, vi, beforeEach } from "vitest";
import { listCommand } from "../list.js";
import * as registry from "../../lib/registry.js";
import * as auth from "../../lib/auth.js";
import { YigYapsRegistryClient } from "@yigyaps/client";

vi.mock("../../lib/registry.js");
vi.mock("../../lib/auth.js");
vi.mock("../../lib/logger.js");
vi.mock("ora", () => ({
  default: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn(),
    fail: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe("listCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.ensureAuthenticated).mockResolvedValue({
      id: "u1",
      displayName: "User",
      githubUsername: "user",
      email: "",
      avatarUrl: "",
      tier: "free",
      role: "user",
      isVerifiedCreator: false,
      totalPackages: 0,
      createdAt: 0,
      lastLoginAt: 0,
    });
  });

  it("should list installed skills in a table", async () => {
    const mockInstallations = [
      {
        id: "inst1",
        packageId: "test-pkg",
        agentId: "agent1",
        status: "active",
        installedAt: Date.now(),
      },
    ];
    const mockClient = {
      getInstallations: vi
        .fn()
        .mockResolvedValue({ installations: mockInstallations }),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(
      mockClient as unknown as YigYapsRegistryClient,
    );

    await listCommand({});

    expect(mockClient.getInstallations).toHaveBeenCalled();
  });

  it("should handle empty installations list", async () => {
    const mockClient = {
      getInstallations: vi.fn().mockResolvedValue({ installations: [] }),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(
      mockClient as unknown as YigYapsRegistryClient,
    );

    await listCommand({});

    expect(mockClient.getInstallations).toHaveBeenCalled();
  });

  it("should output JSON when --json flag is set", async () => {
    const mockInstallations = [
      {
        id: "inst1",
        packageId: "pkg",
        agentId: "a1",
        status: "active",
        installedAt: 0,
      },
    ];
    const mockClient = {
      getInstallations: vi
        .fn()
        .mockResolvedValue({ installations: mockInstallations }),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(
      mockClient as unknown as YigYapsRegistryClient,
    );
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await listCommand({ json: true });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("inst1"));
    consoleSpy.mockRestore();
  });
});
