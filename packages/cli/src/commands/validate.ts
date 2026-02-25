import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { z } from "zod";

const manifestSchema = z.object({
    packageId: z.string().min(1),
    version: z.string().min(1),
    displayName: z.string().min(1),
    description: z.string().min(10).max(500),
    authorName: z.string().min(1),
    license: z.enum(["open-source", "free", "premium", "enterprise"]),
    category: z.string(),
    maturity: z.enum(["experimental", "beta", "stable", "deprecated"]),
});

export async function validateCommand() {
    const root = process.cwd();
    const manifestPath = path.join(root, "package.json");

    console.log(chalk.blue("🔍 Validating YigYaps skill package..."));

    // Check package.json
    if (!(await fs.pathExists(manifestPath))) {
        console.error(chalk.red("❌ Error: package.json not found."));
        process.exit(1);
    }

    try {
        const manifest = await fs.readJson(manifestPath);
        manifestSchema.parse(manifest);
        console.log(chalk.green("✅ package.json is valid."));
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error(chalk.red("❌ Validation failed in package.json:"));
            error.issues.forEach((issue) => {
                console.error(chalk.yellow(`   - ${issue.path.join(".")}: ${issue.message}`));
            });
        } else {
            console.error(chalk.red("❌ Error reading package.json."));
        }
        process.exit(1);
    }

    // Check rules directory
    const rulesDir = path.join(root, "rules");
    if (!(await fs.pathExists(rulesDir)) || !(await fs.stat(rulesDir)).isDirectory()) {
        console.error(chalk.red("❌ Error: 'rules/' directory is missing."));
        process.exit(1);
    }

    const rules = await fs.readdir(rulesDir);
    if (rules.length === 0) {
        console.warn(chalk.yellow("⚠️ Warning: 'rules/' directory is empty."));
    } else {
        console.log(chalk.green(`✅ 'rules/' directory contains ${rules.length} file(s).`));
    }

    console.log(chalk.bold.green("\n✨ All checks passed! Your skill package is valid."));
}
