import { describe, it, expect, vi, beforeEach } from "vitest";
import { uninstallCommand } from "../uninstall.js";
import * as registry from "../../lib/registry.js";
import * as auth from "../../lib/auth.js";
import inquirer from "inquirer";
import { YigYapsRegistryClient } from "@yigyaps/client";

vi.mock("../../lib/registry.js");
vi.mock("../../lib/auth.js");
vi.mock("../../lib/logger.js");
vi.mock("inquirer");
vi.mock("ora", () => ({
    default: vi.fn().mockImplementation(() => ({
        start: vi.fn().mockReturnThis(),
        succeed: vi.fn(),
        fail: vi.fn(),
        stop: vi.fn()
    }))
}));

describe("uninstallCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(auth.ensureAuthenticated).mockResolvedValue({
            id: "u1", displayName: "User", githubUsername: "user",
            email: "", avatarUrl: "", tier: "free", role: "user",
            isVerifiedCreator: false, totalPackages: 0
        });
    });

    it("should uninstall with confirmation", async () => {
        const mockClient = {
            uninstall: vi.fn().mockResolvedValue(undefined)
        };
        vi.mocked(registry.createRegistryClient).mockReturnValue(
            mockClient as unknown as YigYapsRegistryClient
        );
        vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });

        await uninstallCommand("inst1", {});

        expect(mockClient.uninstall).toHaveBeenCalledWith("inst1");
    });

    it("should skip uninstall if user declines confirmation", async () => {
        const mockClient = {
            uninstall: vi.fn()
        };
        vi.mocked(registry.createRegistryClient).mockReturnValue(
            mockClient as unknown as YigYapsRegistryClient
        );
        vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: false });

        await uninstallCommand("inst1", {});

        expect(mockClient.uninstall).not.toHaveBeenCalled();
    });

    it("should skip confirmation when --yes flag is set", async () => {
        const mockClient = {
            uninstall: vi.fn().mockResolvedValue(undefined)
        };
        vi.mocked(registry.createRegistryClient).mockReturnValue(
            mockClient as unknown as YigYapsRegistryClient
        );

        await uninstallCommand("inst1", { yes: true });

        expect(inquirer.prompt).not.toHaveBeenCalled();
        expect(mockClient.uninstall).toHaveBeenCalledWith("inst1");
    });
});
