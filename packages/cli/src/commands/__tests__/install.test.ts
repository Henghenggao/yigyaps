import { describe, it, expect, vi, beforeEach } from "vitest";
import { installCommand } from "../install.js";
import * as registry from "../../lib/registry.js";
import * as auth from "../../lib/auth.js";
import inquirer from "inquirer";

vi.mock("../../lib/registry.js");
vi.mock("../../lib/auth.js");
vi.mock("../../lib/logger.js");
vi.mock("inquirer");
vi.mock("ora", () => ({
    default: () => ({
        start: vi.fn().mockReturnValue({ stop: vi.fn(), fail: vi.fn(), succeed: vi.fn() })
    })
}));

describe("installCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(auth.ensureAuthenticated).mockResolvedValue({ id: "u1", tier: "pro" } as any);
    });

    it("should install a skill with confirmation", async () => {
        const mockPkg = { id: "p1", packageId: "test-skill", displayName: "Test", version: "1.0.0" };
        const mockClient = {
            getByPackageId: vi.fn().mockResolvedValue(mockPkg),
            install: vi.fn().mockResolvedValue({ id: "inst1" })
        };
        vi.mocked(registry.createRegistryClient).mockReturnValue(mockClient as any);
        vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });

        await installCommand("test-skill", { agentId: "agent1" });

        expect(mockClient.install).toHaveBeenCalledWith(expect.objectContaining({
            packageId: "p1",
            yigbotId: "agent1"
        }));
    });
});
