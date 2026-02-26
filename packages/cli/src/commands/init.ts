import fs from "fs-extra";
import path from "path";
import { CliError } from "../lib/errors.js";
import { p, assertNotCancelled } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";

export async function initCommand(name?: string) {
  p.intro(colors.primary.bold("📦 Initialize YigYaps Skill Package"));

  let skillName = name;

  if (!skillName) {
    skillName = assertNotCancelled(
      await p.text({
        message: "What is the name of your skill?",
        placeholder: "my-awesome-skill",
        validate: (input: string | undefined) => {
          if (!input || input.length === 0) return "Name is required";
          return undefined;
        },
      }),
    );
  }

  const category = assertNotCancelled(
    await p.select({
      message: "Pick a category for your skill:",
      options: [
        {
          value: "developer-tools",
          label: "Developer Tools",
          hint: "SDKs, CLI tools, compilers",
        },
        { value: "automation", label: "Automation", hint: "Workflows, bots" },
        {
          value: "data-analysis",
          label: "Data Analysis",
          hint: "Insights, processing",
        },
        {
          value: "content-generation",
          label: "Content Generation",
          hint: "AI writers, image gen",
        },
        { value: "other", label: "Other", hint: "Anything else" },
      ],
    }),
  );

  const template = assertNotCancelled(
    await p.select({
      message: "Choose a starter template:",
      options: [
        { value: "blank", label: "Blank", hint: "Start from scratch" },
        {
          value: "mcp-tool",
          label: "MCP Tool",
          hint: "Pre-configured tool definitions",
        },
        {
          value: "knowledge-base",
          label: "Knowledge Base",
          hint: "RAG-powered skill structure",
        },
      ],
    }),
  );

  const author = assertNotCancelled(
    await p.text({
      message: "Your name or organization:",
      placeholder: "Your Name",
    }),
  );

  const tagsInput = assertNotCancelled(
    await p.text({
      message: "Add some tags (comma-separated):",
      placeholder: "ai, mcp, tool",
    }),
  );
  const tags = tagsInput
    ? tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const s = p.spinner();
  s.start(`Scaffolding ${colors.primary(skillName)}...`);

  const root = path.resolve(process.cwd(), skillName as string);

  if (await fs.pathExists(root)) {
    s.stop();
    throw CliError.user(`Directory ${skillName} already exists.`);
  }

  // Create structure
  await fs.ensureDir(path.join(root, "rules"));
  await fs.ensureDir(path.join(root, "knowledge"));
  await fs.ensureDir(path.join(root, "mcp"));

  // Create boilerplate package.json
  const manifest = {
    name: skillName,
    version: "0.1.0",
    description: "A new YigYaps skill package",
    author: author || "Your Name",
    license: "MIT",
    yigyaps: {
      category,
      template,
      tags,
    },
    mcpTransport: "stdio",
  };

  await fs.outputJson(path.join(root, "package.json"), manifest, { spaces: 2 });

  // Create example rule
  await fs.outputFile(
    path.join(root, "rules", "main.md"),
    `# ${skillName}\n\nDefine your skill logic here.`,
  );

  s.stop(`Skill package ${colors.primary(skillName)} initialized!`);

  p.outro(`${colors.success("✨ All set!")}

Next steps:
  ${colors.muted("1.")} cd ${colors.primary(skillName)}
  ${colors.muted("2.")} yigyaps validate
  ${colors.muted("3.")} yigyaps dev`);
}
