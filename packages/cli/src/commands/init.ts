import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";

export async function initCommand(name?: string) {
    let skillName = name;

    if (!skillName) {
        const answers = await inquirer.prompt([
            {
                type: "input",
                name: "name",
                message: "Enter the name of your skill package:",
                validate: (input: string) => input.length > 0 || "Name is required",
            },
        ]);
        skillName = answers.name;
    }

    const root = path.resolve(process.cwd(), skillName as string);

    if (await fs.pathExists(root)) {
        console.error(chalk.red(`Error: Directory ${skillName} already exists.`));
        process.exit(1);
    }

    // Create structure
    await fs.ensureDir(path.join(root, "rules"));
    await fs.ensureDir(path.join(root, "knowledge"));
    await fs.ensureDir(path.join(root, "mcp"));

    // Create boilerplate package.json
    const manifest = {
        packageId: skillName,
        version: "0.1.0",
        displayName: skillName,
        description: "A new YigYaps skill package",
        authorName: "Your Name",
        license: "open-source",
        category: "other",
        maturity: "experimental",
        tags: [],
        mcpTransport: "stdio",
    };

    await fs.outputJson(path.join(root, "package.json"), manifest, { spaces: 2 });

    // Create example rule
    await fs.outputFile(
        path.join(root, "rules", "main.md"),
        "# Skill Rules\n\nDefine your skill logic here."
    );

    console.log(chalk.green(`\n✅ Skill package ${skillName} initialized successfully!`));
    console.log(`\nNext steps:\n  cd ${skillName}\n  yigyaps validate\n`);
}
