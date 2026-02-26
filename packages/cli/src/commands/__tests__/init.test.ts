import { describe, it, expect, vi, beforeEach } from "vitest";
import { initCommand } from "../init.js";
import fs from "fs-extra";
import { CliError } from "../../lib/errors.js";

vi.mock("fs-extra");
vi.mock("../../lib/logger.js");

describe("initCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should throw if directory already exists", async () => {
        vi.mocked(fs.pathExists).mockResolvedValue(true as never);
        await expect(initCommand("existing")).rejects.toThrow(CliError);
    });

    it("should create directory structure and package.json", async () => {
        vi.mocked(fs.pathExists).mockResolvedValue(false as never);
        vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
        vi.mocked(fs.outputJson).mockResolvedValue(undefined);
        vi.mocked(fs.outputFile).mockResolvedValue(undefined as never);

        await initCommand("new-skill");

        // Should create rules/, knowledge/, mcp/ directories
        expect(fs.ensureDir).toHaveBeenCalledTimes(3);
        expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining("rules"));

        // Uses outputJson (not writeJson) to write package.json
        expect(fs.outputJson).toHaveBeenCalledWith(
            expect.stringContaining("package.json"),
            expect.objectContaining({
                packageId: "new-skill",
                version: "0.1.0"
            }),
            expect.any(Object)
        );

        // Should create the example rule file
        expect(fs.outputFile).toHaveBeenCalledWith(
            expect.stringContaining("main.md"),
            expect.any(String)
        );
    });
});
