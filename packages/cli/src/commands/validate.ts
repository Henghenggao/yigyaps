import fs from "fs-extra";
import path from "path";
import { z } from "zod";
import { logger } from "../lib/logger.js";
import { CliError } from "../lib/errors.js";

/**
 * Validation Logic for YigYaps skill packages.
 */
export const manifestSchema = z.object({
    name: z.string().min(1).max(50),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string().min(10).max(500),
    author: z.string(),
    license: z.string().default("MIT"),
    yigyaps: z.object({
        category: z.string().default("general"),
        tags: z.array(z.string()).default([]),
    }).optional(),
});

export async function validateCommand() {
    const root = process.cwd();
    const manifestPath = path.join(root, "package.json");

    logger.info("Validating YigYaps skill package...");

    // Check package.json
    if (!(await fs.pathExists(manifestPath))) {
        throw CliError.user("package.json not found.");
    }

    try {
        const manifest = await fs.readJson(manifestPath);
        manifestSchema.parse(manifest);
        logger.success("package.json is valid.");
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstIssue = error.issues[0];
            const hint = firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : undefined;
            logger.error("Validation failed in package.json", hint);
        } else {
            logger.error("Error reading package.json.");
        }
        throw CliError.user("Manifest validation failed.");
    }

    // Check rules directory
    const rulesDir = path.join(root, "rules");
    if (!(await fs.pathExists(rulesDir)) || !(await fs.stat(rulesDir)).isDirectory()) {
        throw CliError.user("'rules/' directory is missing.");
    }

    const rules = await fs.readdir(rulesDir);
    if (rules.length === 0) {
        logger.warn("'rules/' directory is empty.");
    } else {
        logger.success(`'rules/' directory contains ${rules.length} file(s).`);
    }

    logger.bold("\n✨ All checks passed! Your skill package is valid.");
}

