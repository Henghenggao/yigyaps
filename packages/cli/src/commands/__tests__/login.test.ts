import { describe, it, expect, vi, beforeEach } from "vitest";
import { loginCommand } from "../login.js";
import * as config from "../../lib/config.js";

vi.mock("../../lib/config.js");
vi.mock("../../lib/logger.js");
vi.mock("ora", () => ({
    default: () => ({
        start: vi.fn().mockReturnValue({ succeed: vi.fn(), fail: vi.fn() })
    })
}));

// Mock using a class
const getMeMock = vi.fn();
vi.mock("@yigyaps/client", () => {
    return {
        YigYapsRegistryClient: class {
            constructor() { }
            getMe = getMeMock;
        }
    };
});

describe("loginCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(config.getConfig).mockReturnValue({ registryUrl: "http://api.test" });
    });

    it("should persist API key on successful login", async () => {
        const mockUser = { id: "123", displayName: "Test User", githubUsername: "test" };
        getMeMock.mockResolvedValue(mockUser);

        await loginCommand({ apiKey: "yg_prod_test" });

        expect(config.setConfig).toHaveBeenCalledWith("apiKey", "yg_prod_test");
        expect(config.setConfig).toHaveBeenCalledWith("lastLogin", expect.any(String));
    });

    it("should fail if API key is invalid", async () => {
        getMeMock.mockRejectedValue(new Error("Failed"));

        await expect(loginCommand({ apiKey: "yg_invalid" })).rejects.toThrow();
    });
});
