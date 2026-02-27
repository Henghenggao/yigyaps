#!/usr/bin/env tsx
/**
 * YigYaps Seed Data Script
 *
 * Populates the database with sample packages for development/staging.
 * Usage: DATABASE_URL=... tsx scripts/seed.ts
 *
 * Does NOT seed real users (those come from GitHub OAuth).
 * Packages use a hardcoded author ID — update SEED_AUTHOR_ID before running.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../packages/db/src/schema/index.js";
import { SkillPackageDAL, SkillRuleDAL } from "../packages/db/src/dal/index.js";

const { Pool } = pg;

// ── Config ────────────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required");
  process.exit(1);
}

// Set this to your own user ID after logging in via GitHub OAuth
const SEED_AUTHOR_ID = process.env.SEED_AUTHOR_ID || "usr_seed_author";

const SAMPLE_PACKAGES = [
  {
    packageId: "legal-contract-reviewer",
    version: "1.0.0",
    displayName: "Legal Contract Reviewer",
    description: "Reviews contracts for risk clauses, unfavorable terms, and missing standard protections. Specializes in SaaS agreements.",
    readme: "# Legal Contract Reviewer\n\nAn expert skill for reviewing software contracts and SaaS agreements.\n\n## What it does\n\n- Identifies automatic renewal clauses\n- Flags jurisdiction risk\n- Checks for missing limitation of liability caps\n- Highlights IP ownership clauses",
    authorName: "YigYaps Demo",
    category: "security" as const,
    tags: ["legal", "contracts", "compliance", "risk"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    icon: null,
    repositoryUrl: null,
    homepageUrl: null,
    rules: "Rule 1: Always identify automatic renewal clauses and highlight renewal notice deadlines.\nRule 2: Flag any jurisdiction clause that specifies courts in a location unfavorable to the client.\nRule 3: Check for limitation of liability caps and compare to deal value.\nRule 4: Identify IP ownership clauses that could affect work-for-hire arrangements.",
  },
  {
    packageId: "python-code-reviewer",
    version: "1.2.0",
    displayName: "Python Code Reviewer",
    description: "Expert Python code review skill focused on performance, security vulnerabilities, and Pythonic patterns for production code.",
    readme: "# Python Code Reviewer\n\nProduction-grade Python code review with deep expertise in:\n\n- Performance anti-patterns\n- Security vulnerabilities (OWASP)\n- Type safety and mypy compliance\n- Testing coverage gaps",
    authorName: "YigYaps Demo",
    category: "development" as const,
    tags: ["python", "code-review", "security", "performance"],
    maturity: "beta" as const,
    license: "free" as const,
    priceUsd: "0",
    icon: null,
    repositoryUrl: "https://github.com/example/python-reviewer",
    homepageUrl: null,
    rules: "Rule 1: Check for SQL injection vulnerabilities in database queries.\nRule 2: Flag any use of eval() or exec() with user input.\nRule 3: Identify N+1 query patterns in ORM usage.\nRule 4: Ensure proper exception handling — never use bare except clauses.",
  },
  {
    packageId: "ux-research-analyst",
    version: "0.9.0",
    displayName: "UX Research Analyst",
    description: "Expert in user experience research methodologies, interview synthesis, and translating user feedback into actionable product insights.",
    readme: "# UX Research Analyst\n\nBrings 10+ years of UX research expertise to your AI agent.\n\n## Capabilities\n\n- User interview synthesis\n- Journey mapping\n- Usability heuristic evaluation\n- A/B test result interpretation",
    authorName: "YigYaps Demo",
    category: "research" as const,
    tags: ["ux", "research", "product", "interviews"],
    maturity: "experimental" as const,
    license: "open-source" as const,
    priceUsd: "0",
    icon: null,
    repositoryUrl: null,
    homepageUrl: null,
    rules: "Rule 1: When analyzing user feedback, categorize by theme and frequency before drawing conclusions.\nRule 2: Always separate observed behavior from inferred motivation.\nRule 3: Apply Nielsen's 10 usability heuristics when evaluating interfaces.",
  },
  {
    packageId: "financial-model-reviewer",
    version: "1.0.0",
    displayName: "Financial Model Reviewer",
    description: "Reviews financial models and projections for common errors, unrealistic assumptions, and missing sensitivity analyses. For SaaS and startup use cases.",
    readme: "# Financial Model Reviewer\n\nExpert financial model review for SaaS companies and startups.\n\n## What it checks\n\n- Revenue projection assumptions\n- CAC/LTV calculations\n- Cash flow modeling\n- Cohort analysis completeness",
    authorName: "YigYaps Demo",
    category: "data" as const,
    tags: ["finance", "modeling", "saas", "startup"],
    maturity: "beta" as const,
    license: "premium" as const,
    priceUsd: "9.99",
    icon: null,
    repositoryUrl: null,
    homepageUrl: null,
    rules: "Rule 1: Verify revenue projections have explicit assumptions documented for growth rate, churn, and pricing.\nRule 2: Check that CAC payback period is calculated correctly and is realistic for the market.\nRule 3: Ensure cash flow model accounts for payment timing differences.",
  },
  {
    packageId: "api-documentation-writer",
    version: "1.1.0",
    displayName: "API Documentation Writer",
    description: "Generates clear, complete API documentation from code and specifications. Follows OpenAPI 3.0 standards with practical examples.",
    readme: "# API Documentation Writer\n\nTransforms API code into excellent developer documentation.\n\n## Output formats\n\n- OpenAPI 3.0 YAML/JSON\n- Markdown READMEs\n- Postman Collections\n- Quick-start guides",
    authorName: "YigYaps Demo",
    category: "development" as const,
    tags: ["documentation", "api", "openapi", "developer-experience"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    icon: null,
    repositoryUrl: "https://github.com/example/api-docs-writer",
    homepageUrl: null,
    rules: "Rule 1: Every endpoint must have a description, at least one example request, and example response.\nRule 2: Error responses must document all possible HTTP status codes.\nRule 3: Authentication requirements must be explicitly stated for each endpoint.",
  },
] as const;

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Connecting to database...`);
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });
  const packageDAL = new SkillPackageDAL(db);
  const ruleDAL = new SkillRuleDAL(db);

  console.log(`Seeding ${SAMPLE_PACKAGES.length} packages with author: ${SEED_AUTHOR_ID}\n`);

  for (const pkg of SAMPLE_PACKAGES) {
    const existing = await packageDAL.getByPackageId(pkg.packageId);
    if (existing) {
      console.log(`⟳  Skip: ${pkg.packageId} (already exists)`);
      continue;
    }

    const now = Date.now();
    const id = `spkg_${now}_${Math.random().toString(36).slice(2, 8)}`;

    await packageDAL.create({
      id,
      packageId: pkg.packageId,
      version: pkg.version,
      displayName: pkg.displayName,
      description: pkg.description,
      readme: pkg.readme,
      author: SEED_AUTHOR_ID,
      authorName: pkg.authorName,
      authorUrl: null,
      license: pkg.license,
      priceUsd: pkg.priceUsd,
      requiresApiKey: false,
      apiKeyInstructions: null,
      category: pkg.category,
      maturity: pkg.maturity,
      tags: [...pkg.tags],
      minRuntimeVersion: "0.1.0",
      requiredTier: 0,
      mcpTransport: "stdio",
      mcpCommand: null,
      mcpUrl: null,
      icon: pkg.icon,
      repositoryUrl: pkg.repositoryUrl,
      homepageUrl: pkg.homepageUrl,
      origin: "manual",
      createdAt: now,
      updatedAt: now,
      releasedAt: now,
    });

    // Add a sample rule file
    await ruleDAL.create({
      id: `rule_${now}_${Math.random().toString(36).slice(2, 8)}`,
      packageId: id,
      path: ".yigyaps/rules.md",
      content: pkg.rules,
      createdAt: now,
    });

    console.log(`✓  Created: ${pkg.displayName} (${pkg.packageId})`);
  }

  await pool.end();
  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
