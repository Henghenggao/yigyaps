/**
 * YigYaps CLI — export command
 *
 * Usage:
 *   yigyaps export <packageId> [--format skill-md] [--output <file>]
 *
 * Downloads the public layer of a skill and writes it as a SKILL.md file,
 * ready to submit to SkillsMP or any SKILL.md-compatible ecosystem.
 *
 * License: Apache 2.0
 */

import fs from "fs-extra";
import path from "path";
import { p } from "../lib/ui/prompts.js";
import { colors } from "../lib/ui/theme.js";
import { getConfig } from "../lib/config.js";

interface ExportOptions {
  format?: string;
  output?: string;
  json?: boolean;
}

export async function exportCommand(
  packageId: string,
  options: ExportOptions,
) {
  const fmt = options.format ?? "skill-md";

  if (fmt !== "skill-md") {
    console.error(`Unsupported format: ${fmt}. Currently supported: skill-md`);
    process.exit(1);
  }

  if (!options.json) {
    p.intro(colors.primary.bold("📦 Export Skill as SKILL.md"));
    p.log.step(`Fetching public metadata for ${colors.accent(packageId)}…`);
  }

  const config = await getConfig();
  const apiUrl = config.registryUrl ?? "https://api.yigyaps.com";
  const endpoint = `${apiUrl}/v1/packages/${encodeURIComponent(packageId)}/skill-md`;

  let response: Response;
  try {
    response = await fetch(endpoint);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (options.json) {
      console.error(JSON.stringify({ error: msg }));
    } else {
      p.log.error(`Network error: ${msg}`);
    }
    process.exit(1);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    if (options.json) {
      console.error(JSON.stringify({ error: `HTTP ${response.status}`, detail: body }));
    } else {
      p.log.error(`API error ${response.status}: ${body}`);
    }
    process.exit(1);
  }

  const mdContent = await response.text();

  // Determine output file path
  const slug = packageId.replace(/\//g, "-").replace(/[^a-z0-9-_.]/gi, "_");
  const defaultFile = `${slug}.skill.md`;
  const outputPath = options.output
    ? path.resolve(options.output)
    : path.resolve(process.cwd(), defaultFile);

  await fs.outputFile(outputPath, mdContent, "utf-8");

  if (options.json) {
    console.log(
      JSON.stringify({ success: true, outputPath, bytes: mdContent.length }),
    );
  } else {
    p.log.success(`Written to ${colors.accent(outputPath)}`);
    p.log.info(
      `Submit this file to SkillsMP or any SKILL.md-compatible registry.`,
    );
    p.outro(colors.success("Export complete!"));
  }
}
