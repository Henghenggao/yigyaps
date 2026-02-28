import { describe, it, expect, vi, beforeEach } from "vitest";
import { uninstallCommand } from "../uninstall.js";
import * as registry from "../../lib/registry.js";
import * as auth from "../../lib/auth.js";
import { YigYapsRegistryClient } from "@yigyaps/client";

vi.mock("../../lib/registry.js");
vi.mock("../../lib/auth.js");

// Mock @clack/prompts
const mockConfirm = vi.fn();
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
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));

describe("uninstallCommand", () => {
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

  it("should uninstall with confirmation", async () => {
    const mockClient = {
      uninstall: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(
      mockClient as unknown as YigYapsRegistryClient,
    );
    mockConfirm.mockResolvedValue(true);

    await uninstallCommand("inst1", {});

    expect(mockClient.uninstall).toHaveBeenCalledWith("inst1");
  });

  it("should skip uninstall if user declines confirmation", async () => {
    const mockClient = {
      uninstall: vi.fn(),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(
      mockClient as unknown as YigYapsRegistryClient,
    );
    mockConfirm.mockResolvedValue(false);

    await uninstallCommand("inst1", {});

    expect(mockClient.uninstall).not.toHaveBeenCalled();
  });

  it("should skip confirmation when --yes flag is set", async () => {
    const mockClient = {
      uninstall: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(
      mockClient as unknown as YigYapsRegistryClient,
    );

    await uninstallCommand("inst1", { yes: true });

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockClient.uninstall).toHaveBeenCalledWith("inst1");
  });
});
