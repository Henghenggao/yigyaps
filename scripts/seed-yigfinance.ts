#!/usr/bin/env tsx
/**
 * YigYaps Yigfinance Skills Seed Script
 *
 * Seeds 6 Yigfinance corporate finance analysis skills into the database.
 * Each skill reads its rules from each skill package's rules directory and README.md.
 *
 * Skills:
 *   1. Finance Context Setup — mandatory analysis boundary setter
 *   2. Data Context Check — data quality gatekeeper
 *   3. Variance Review — driver-based variance decomposition
 *   4. Forecast Review — assumption pressure tester
 *   5. Plan CFO Review — CFO-style funding verdict
 *   6. Management Pack — executive output with quality dashboard
 *
 * Usage: DATABASE_URL=... tsx scripts/seed-yigfinance.ts
 *
 * Source: https://github.com/Henghenggao/Yigfinance
 */

import fs from "fs";
import path from "path";
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

const SEED_AUTHOR_ID = process.env.SEED_AUTHOR_ID || "usr_seed_author";
const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");

// ── Helper: Read skill package from disk ─────────────────────────────────────
function readSkillPackage(dirName: string) {
  const skillDir = path.join(SKILLS_DIR, dirName);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(skillDir, "package.json"), "utf-8"),
  );

  // Read all rule files from rules/ directory
  const rulesDir = path.join(skillDir, "rules");
  const ruleFiles: Array<{ path: string; content: string }> = [];
  if (fs.existsSync(rulesDir)) {
    for (const file of fs.readdirSync(rulesDir)) {
      if (file.endsWith(".md") || file.endsWith(".txt")) {
        ruleFiles.push({
          path: file,
          content: fs.readFileSync(path.join(rulesDir, file), "utf-8"),
        });
      }
    }
  }

  // Read README.md
  let readme: string | null = null;
  const readmePath = path.join(skillDir, "README.md");
  if (fs.existsSync(readmePath)) {
    readme = fs.readFileSync(readmePath, "utf-8");
  }

  return { manifest, ruleFiles, readme };
}

// ── 6 Yigfinance Skill Definitions ──────────────────────────────────────────

interface SkillDef {
  dirName: string;
  displayName: string;
  maturity: "experimental" | "beta" | "stable" | "deprecated";
  license: "open-source" | "free" | "premium" | "enterprise";
  priceUsd: string;
}

const YIGFINANCE_SKILLS: SkillDef[] = [
  {
    dirName: "yigfinance-context-setup",
    displayName: "Yigfinance: Finance Context Setup",
    maturity: "beta",
    license: "open-source",
    priceUsd: "0",
  },
  {
    dirName: "yigfinance-data-check",
    displayName: "Yigfinance: Data Context Check",
    maturity: "beta",
    license: "open-source",
    priceUsd: "0",
  },
  {
    dirName: "yigfinance-variance-review",
    displayName: "Yigfinance: Variance Review",
    maturity: "beta",
    license: "open-source",
    priceUsd: "0",
  },
  {
    dirName: "yigfinance-forecast-review",
    displayName: "Yigfinance: Forecast Review",
    maturity: "beta",
    license: "open-source",
    priceUsd: "0",
  },
  {
    dirName: "yigfinance-cfo-review",
    displayName: "Yigfinance: Plan CFO Review",
    maturity: "beta",
    license: "open-source",
    priceUsd: "0",
  },
  {
    dirName: "yigfinance-management-pack",
    displayName: "Yigfinance: Management Pack",
    maturity: "beta",
    license: "open-source",
    priceUsd: "0",
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Connecting to database...");
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });
  const packageDAL = new SkillPackageDAL(db);
  const ruleDAL = new SkillRuleDAL(db);

  console.log(
    `\nSeeding ${YIGFINANCE_SKILLS.length} Yigfinance skills with author: ${SEED_AUTHOR_ID}\n`,
  );
  console.log("Source: https://github.com/Henghenggao/Yigfinance\n");

  let created = 0;
  let skipped = 0;

  for (const skill of YIGFINANCE_SKILLS) {
    const { manifest, ruleFiles, readme } = readSkillPackage(skill.dirName);
    const packageId = manifest.name;

    const existing = await packageDAL.getByPackageId(packageId);
    if (existing) {
      console.log(`  skip: ${packageId} (already exists)`);
      skipped++;
      continue;
    }

    const now = Date.now();
    const id = `spkg_${now}_${Math.random().toString(36).slice(2, 8)}`;

    await packageDAL.create({
      id,
      packageId,
      version: manifest.version,
      displayName: skill.displayName,
      description: manifest.description,
      readme,
      author: SEED_AUTHOR_ID,
      authorName: manifest.author,
      authorUrl: null,
      license: skill.license,
      priceUsd: skill.priceUsd,
      requiresApiKey: false,
      apiKeyInstructions: null,
      category: manifest.yigyaps?.category || "data",
      maturity: skill.maturity,
      tags: manifest.yigyaps?.tags || [],
      minRuntimeVersion: "0.1.0",
      requiredTier: 0,
      mcpTransport: manifest.mcpTransport || "stdio",
      mcpCommand: null,
      mcpUrl: null,
      icon: null,
      repositoryUrl: "https://github.com/Henghenggao/Yigfinance",
      homepageUrl: null,
      origin: "manual",
      createdAt: now,
      updatedAt: now,
      releasedAt: now,
    });

    // Store each rule file
    for (const rule of ruleFiles) {
      await ruleDAL.create({
        id: `rule_${now}_${Math.random().toString(36).slice(2, 8)}`,
        packageId: id,
        path: `rules/${rule.path}`,
        content: rule.content,
        createdAt: now,
      });
    }

    created++;
    console.log(`  + ${skill.displayName} (${packageId}) — ${ruleFiles.length} rule files`);
  }

  await pool.end();
  console.log(`\nYigfinance seed complete: ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
