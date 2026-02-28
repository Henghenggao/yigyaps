import fs from "fs-extra";
import path from "path";
import type { z } from "zod";
import { CliError } from "./errors.js";
import { manifestSchema } from "../commands/validate.js";

/**
 * Packager Helpers
 */

export interface RuleFile {
  path: string;
  content: string;
}

export type SkillManifest = z.infer<typeof manifestSchema>;

export interface PackagePayload {
  manifest: SkillManifest;
  rules: RuleFile[];
  readme?: string;
}

/**
 * Reads the current directory and packs it into a payload.
 * Assumes valid structure (caller should run validate command first if unsure).
 */
export async function packPackage(cwd: string): Promise<PackagePayload> {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw CliError.user("package.json not found in current directory.");
  }

  // 1. Read and parse package.json
  const rawManifest = await fs.readJson(packageJsonPath);
  const parsed = manifestSchema.safeParse(rawManifest);
  if (!parsed.success) {
    throw CliError.user("Invalid package.json manifest.");
  }
  const manifest = parsed.data;

  // 2. Read rules/ directory
  const rulesDir = path.join(cwd, "rules");
  if (!fs.existsSync(rulesDir)) {
    throw CliError.user("rules/ directory not found.");
  }

  const ruleFiles: RuleFile[] = [];
  const files = await fs.readdir(rulesDir);
  for (const file of files) {
    if (file.endsWith(".md") || file.endsWith(".txt")) {
      const content = await fs.readFile(path.join(rulesDir, file), "utf-8");
      ruleFiles.push({
        path: file,
        content,
      });
    }
  }

  if (ruleFiles.length === 0) {
    throw CliError.user(
      "No rule files (.md or .txt) found in rules/ directory.",
    );
  }

  // 3. Read optional README.md
  let readme: string | undefined;
  const readmePath = path.join(cwd, "README.md");
  if (fs.existsSync(readmePath)) {
    readme = await fs.readFile(readmePath, "utf-8");
  }

  return {
    manifest,
    rules: ruleFiles,
    readme,
  };
}
