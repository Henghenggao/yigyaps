import fs from "fs-extra";
import path from "path";
import { z } from "zod";
import { CliError } from "../lib/errors.js";
import { p } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";
import { panel, keyValue } from "../lib/ui/components.js";

/**
 * Validation Logic for YigYaps skill packages.
 */
export const manifestSchema = z.object({
  name: z.string().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(10).max(500),
  author: z.string(),
  license: z.string().default("MIT"),
  yigyaps: z
    .object({
      category: z.string().default("general"),
      tags: z.array(z.string()).default([]),
    })
    .optional(),
});

export async function validateCommand() {
  const s = p.spinner();
  s.start("Validating skill package...");

  const root = process.cwd();
  const manifestPath = path.join(root, "package.json");

  // Check package.json
  if (!(await fs.pathExists(manifestPath))) {
    s.stop("Missing package.json");
    throw CliError.user("package.json not found. Run 'yigyaps init' first.");
  }

  try {
    const manifest = await fs.readJson(manifestPath);
    manifestSchema.parse(manifest);

    // Check rules directory
    const rulesDir = path.join(root, "rules");
    if (
      !(await fs.pathExists(rulesDir)) ||
      !(await fs.stat(rulesDir)).isDirectory()
    ) {
      s.stop("Missing rules directory");
      throw CliError.user("'rules/' directory is missing.");
    }

    const rules = await fs.readdir(rulesDir);
    s.stop("Validation successful");

    const summary = keyValue({
      Name: manifest.name,
      Version: manifest.version,
      Rules:
        rules.length > 0
          ? `${rules.length} files detected`
          : colors.warning("0 files (empty)"),
      Status: colors.success("Ready to publish"),
    });

    console.log(panel("Validation Summary", summary));
    p.outro(
      `${colors.muted("Next step:")} ${colors.primary("yigyaps publish --dry-run")}`,
    );
  } catch (error) {
    if (error instanceof CliError) throw error;
    if (error instanceof z.ZodError) {
      s.stop("Validation failed");
      const firstIssue = error.issues[0];
      const hint = firstIssue
        ? `${firstIssue.path.join(".")}: ${firstIssue.message}`
        : "Unknown error";
      throw CliError.user(`Manifest validation failed: ${hint}`);
    }
    s.stop("Validation failed");
    throw CliError.user(
      `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
