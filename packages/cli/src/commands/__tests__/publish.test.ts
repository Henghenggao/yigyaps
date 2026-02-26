import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishCommand } from "../publish.js";
import * as auth from "../../lib/auth.js";
import * as packager from "../../lib/packager.js";
import * as registry from "../../lib/registry.js";

vi.mock("../../lib/auth.js");
vi.mock("../../lib/packager.js");
vi.mock("../../lib/registry.js");
vi.mock("../../lib/logger.js");
vi.mock("../validate.js", () => ({
    validateCommand: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("ora", () => ({
    default: () => ({
        start: vi.fn().mockReturnValue({ succeed: vi.fn(), fail: vi.fn() })
    })
}));

describe("publishCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(auth.ensureAuthenticated).mockResolvedValue({
            id: "u1", displayName: "User", githubUsername: "user", email: "", avatarUrl: "", tier: "free", role: "user", isVerifiedCreator: true, totalPackages: 0, totalEarningsUsd: "0"
        });
    });

    it("should pack and publish locally built payload", async () => {
        const mockPayload = {
            manifest: { name: "test-skill", version: "1.0.0", description: "test and some more chars so it passes", author: "test" },
            rules: [{ path: "rule1.md", content: "content" }]
        };
        vi.mocked(packager.packPackage).mockResolvedValue(mockPayload as any);

        const mockClient = {
            publishPackage: vi.fn().mockResolvedValue({ id: "p1", packageId: "test-skill" })
        };
        vi.mocked(registry.createPublisherClient).mockReturnValue(mockClient as any);

        await publishCommand({});

        expect(packager.packPackage).toHaveBeenCalled();
        expect(mockClient.publishPackage).toHaveBeenCalledWith(expect.objectContaining({
            packageId: "test-skill",
            version: "1.0.0",
            rules: [{ path: "rule1.md", content: "content" }]
        }));
    });

    it("should handle dry-run without uploading", async () => {
        const mockPayload = {
            manifest: { name: "test-skill", version: "1.0.0", description: "test and some more chars", author: "test" },
            rules: []
        };
        vi.mocked(packager.packPackage).mockResolvedValue(mockPayload as any);
        const mockClient = { publishPackage: vi.fn() };
        vi.mocked(registry.createPublisherClient).mockReturnValue(mockClient as any);

        await publishCommand({ dryRun: true });

        expect(mockClient.publishPackage).not.toHaveBeenCalled();
    });
});
