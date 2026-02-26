import { describe, it, expect } from "vitest";
import { CliError } from "../errors.js";

describe("CliError", () => {
    it("should create a user error with code 1", () => {
        const err = CliError.user("test user error");
        expect(err.message).toBe("test user error");
        expect(err.exitCode).toBe(1);
        expect(err).toBeInstanceOf(Error);
    });

    it("should create a system error with code 2", () => {
        const err = CliError.system("test system error");
        expect(err.exitCode).toBe(2);
    });

    it("should create a network error with code 3", () => {
        const err = CliError.network("test network error");
        expect(err.exitCode).toBe(3);
    });

    it("should allow custom exit codes", () => {
        const err = new CliError("custom", 42);
        expect(err.exitCode).toBe(42);
    });
});
