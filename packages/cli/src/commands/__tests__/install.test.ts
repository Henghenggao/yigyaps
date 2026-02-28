import { describe, it, expect, vi, beforeEach } from "vitest";
import { installCommand } from "../install.js";
import * as registry from "../../lib/registry.js";
import * as auth from "../../lib/auth.js";
import type { YigYapsRegistryClient } from "@yigyaps/client";
import type { UserProfile } from "../../lib/auth.js";

vi.mock("../../lib/registry.js");
vi.mock("../../lib/auth.js");

// Mock @clack/prompts (used by install.ts via prompts.ts)
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
  confirm: vi.fn().mockResolvedValue(true),
  text: vi.fn().mockResolvedValue("agent1"),
}));

describe("installCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.ensureAuthenticated).mockResolvedValue({
      id: "u1",
      tier: "pro",
    } as unknown as UserProfile);
  });

  it("should install a skill with confirmation", async () => {
    const mockPkg = {
      id: "p1",
      packageId: "test-skill",
      displayName: "Test",
      version: "1.0.0",
    };
    const mockClient = {
      getByPackageId: vi.fn().mockResolvedValue(mockPkg),
      install: vi.fn().mockResolvedValue({ id: "inst1" }),
    };
    vi.mocked(registry.createRegistryClient).mockReturnValue(mockClient as unknown as YigYapsRegistryClient);

    await installCommand("test-skill", { agentId: "agent1" });

    expect(mockClient.install).toHaveBeenCalledWith(
      expect.objectContaining({
        packageId: "p1",
        yigbotId: "agent1",
      }),
    );
  });
});
