/**
 * YigYaps Export Routes
 *
 * GET /v1/packages/:id/skill-md   — Export a skill as a SKILL.md file
 *                                   (public metadata layer only; no encrypted rules)
 *
 * SKILL.md is the emerging open standard for AI skill interoperability,
 * adopted by SkillsMP (270K+ skills) and Verdent.
 * YigYaps skills export their public layer as SKILL.md so they can be
 * indexed by the broader ecosystem while keeping knowledge encrypted.
 *
 * License: Apache 2.0
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { SkillPackageDAL, UserDAL } from "@yigyaps/db";

const paramsSchema = z.object({
  id: z.string().min(1),
});

/**
 * Render a SkillPackage row as a SKILL.md string.
 *
 * Format:
 *   ---
 *   YAML front-matter (public metadata)
 *   ---
 *   Markdown body (display name + description + README)
 *
 * Intentionally omits: encrypted rules, DEK, pricing internals.
 */
function renderSkillMd(
  pkg: {
    packageId: string;
    displayName: string;
    version: string;
    description: string;
    readme: string | null | undefined;
    authorName: string;
    category: string;
    license: string;
    priceUsd: string | number;
    tags: string[];
    maturity: string;
    mcpTransport: string;
    mcpCommand: string | null | undefined;
    mcpUrl: string | null | undefined;
    requiresApiKey: boolean;
    apiKeyInstructions: string | null | undefined;
    homepageUrl: string | null | undefined;
    repositoryUrl: string | null | undefined;
    icon: string | null | undefined;
    installCount: number;
    rating: string | number;
    ratingCount: number;
    createdAt: number;
    updatedAt: number;
  },
  authorUsername: string | null,
): string {
  const authorHandle = authorUsername
    ? `@${authorUsername}`
    : pkg.authorName;

  // YAML front-matter values — escape double-quotes in strings
  const esc = (s: string) => s.replace(/"/g, '\\"');

  const priceUsd =
    typeof pkg.priceUsd === "string"
      ? parseFloat(pkg.priceUsd)
      : pkg.priceUsd;

  const lines: string[] = [
    "---",
    `name: "${esc(pkg.displayName)}"`,
    `version: "${esc(pkg.version)}"`,
    `id: "${esc(pkg.packageId)}"`,
    `author: "${esc(authorHandle)}"`,
    `description: "${esc(pkg.description)}"`,
    `category: "${esc(pkg.category)}"`,
    `license: "${esc(pkg.license)}"`,
    `price_usd: ${priceUsd.toFixed(2)}`,
    `maturity: "${esc(pkg.maturity)}"`,
    `tags: [${pkg.tags.map((t) => `"${esc(t)}"`).join(", ")}]`,
    `mcp_transport: "${esc(pkg.mcpTransport)}"`,
  ];

  if (pkg.mcpCommand) lines.push(`mcp_command: "${esc(pkg.mcpCommand)}"`);
  if (pkg.mcpUrl) lines.push(`mcp_url: "${esc(pkg.mcpUrl)}"`);
  if (pkg.requiresApiKey) {
    lines.push(`requires_api_key: true`);
    if (pkg.apiKeyInstructions)
      lines.push(`api_key_instructions: "${esc(pkg.apiKeyInstructions)}"`);
  }
  if (pkg.homepageUrl) lines.push(`homepage_url: "${esc(pkg.homepageUrl)}"`);
  if (pkg.repositoryUrl)
    lines.push(`repository_url: "${esc(pkg.repositoryUrl)}"`);
  if (pkg.icon) lines.push(`icon: "${esc(pkg.icon)}"`);

  lines.push(
    `install_count: ${pkg.installCount}`,
    `rating: ${pkg.rating}`,
    `rating_count: ${pkg.ratingCount}`,
    `created_at: "${new Date(pkg.createdAt).toISOString()}"`,
    `updated_at: "${new Date(pkg.updatedAt).toISOString()}"`,
    `platform: "yigyaps"`,
    `platform_url: "https://yigyaps.com/skills/${esc(pkg.packageId)}"`,
    `encrypted_knowledge: true`,
    "---",
    "",
    `# ${pkg.displayName}`,
    "",
    `> ${pkg.description}`,
    "",
  );

  if (pkg.readme) {
    lines.push(pkg.readme, "");
  } else {
    lines.push(
      "## About",
      "",
      `**${pkg.displayName}** is a verified skill available on the YigYaps platform.`,
      "",
      "Install it with the YigYaps CLI:",
      "```bash",
      `npx yigyaps install ${pkg.packageId}`,
      "```",
      "",
    );
  }

  lines.push(
    "---",
    "",
    "_This skill is powered by YigYaps encrypted knowledge technology._",
    "_The full rule set is encrypted and never transmitted in plaintext._",
    `_Learn more: https://yigyaps.com/skills/${pkg.packageId}_`,
  );

  return lines.join("\n");
}

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /v1/packages/:id/skill-md
   *
   * Returns the package as a SKILL.md file (Content-Type: text/markdown).
   * :id can be either the public packageId slug (e.g. "expert/investment-eval")
   * or the internal UUID.
   *
   * Rate limit: 60/min (read-only, indexable by ecosystem crawlers).
   */
  fastify.get(
    "/:id/skill-md",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const paramsParsed = paramsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({ error: "Bad Request" });
      }
      const { id } = paramsParsed.data;

      const pkgDAL = new SkillPackageDAL(fastify.db);

      // Try by packageId slug first, then by internal UUID
      let pkg = await pkgDAL.getByPackageId(id);
      if (!pkg) {
        pkg = await pkgDAL.getById(id);
      }

      if (!pkg) {
        return reply.code(404).send({ error: "Package not found" });
      }

      if (pkg.status !== "active") {
        return reply.code(404).send({ error: "Package not found" });
      }

      // Resolve author username for the @handle in front-matter
      let authorUsername: string | null = null;
      try {
        const userDAL = new UserDAL(fastify.db);
        const author = await userDAL.getById(pkg.author);
        authorUsername = author?.githubUsername ?? null;
      } catch {
        // Non-fatal — fall back to authorName
      }

      const md = renderSkillMd(pkg, authorUsername);

      const filename = `${pkg.packageId.replace(/\//g, "-")}-v${pkg.version}.skill.md`;

      return reply
        .header("Content-Type", "text/markdown; charset=utf-8")
        .header(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        )
        .header("Cache-Control", "public, max-age=300") // 5-min cache
        .send(md);
    },
  );
};
