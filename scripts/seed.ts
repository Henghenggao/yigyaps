#!/usr/bin/env tsx
/**
 * YigYaps Seed Data Script
 *
 * Populates the database with 10 sample packages for development/staging.
 *   5 Developer Skills  (code review, CI/CD, testing, docs, infra)
 *   5 Expert Skills      (legal, finance, hiring, marketing, medical)
 *
 * Rules use the structured JSON format compatible with RuleEngine and
 * TemplateEditor (decision tree / scoring matrix / case library).
 *
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

// ── Helper: Rule[] JSON builder ───────────────────────────────────────────────
function makeRules(
  rules: Array<{
    id: string;
    dimension: string;
    keywords?: string[];
    conclusion: string;
    weight: number;
  }>,
): string {
  return JSON.stringify(
    rules.map((r) => ({
      id: r.id,
      dimension: r.dimension,
      condition: r.keywords?.length ? { keywords: r.keywords } : {},
      conclusion: r.conclusion,
      weight: r.weight,
    })),
    null,
    2,
  );
}

// ── 10 Seed Skills ────────────────────────────────────────────────────────────

const SAMPLE_PACKAGES = [
  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║  DEVELOPER SKILLS (5)                                                    ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝

  {
    packageId: "python-code-reviewer",
    version: "1.2.0",
    displayName: "Python Code Reviewer",
    description:
      "Expert Python code review focused on performance, security vulnerabilities, and Pythonic patterns for production code.",
    readme:
      "# Python Code Reviewer\n\nProduction-grade Python code review with deep expertise in:\n\n- Performance anti-patterns (N+1 queries, unnecessary copies)\n- Security vulnerabilities (OWASP Top 10)\n- Type safety and mypy compliance\n- Testing coverage gaps\n\n## Usage\n\nSubmit a code snippet and get a structured evaluation across security, performance, readability, and testing dimensions.",
    authorName: "DevSkills Team",
    category: "development" as const,
    tags: ["python", "code-review", "security", "performance"],
    maturity: "stable" as const,
    license: "free" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/example/python-reviewer",
    homepageUrl: null,
    rules: makeRules([
      { id: "py-sec-1", dimension: "Security", keywords: ["sql", "query", "execute", "cursor"], conclusion: "sql_injection_risk", weight: 1.0 },
      { id: "py-sec-2", dimension: "Security", keywords: ["eval", "exec", "compile", "input"], conclusion: "code_injection_risk", weight: 0.95 },
      { id: "py-sec-3", dimension: "Security", keywords: ["pickle", "deserialize", "yaml.load"], conclusion: "deserialization_risk", weight: 0.9 },
      { id: "py-perf-1", dimension: "Performance", keywords: ["loop", "for", "iteration", "append"], conclusion: "list_comprehension_opportunity", weight: 0.7 },
      { id: "py-perf-2", dimension: "Performance", keywords: ["n+1", "query", "orm", "lazy"], conclusion: "n_plus_one_query", weight: 0.85 },
      { id: "py-read-1", dimension: "Readability", keywords: ["except", "pass", "bare", "catch"], conclusion: "bare_except_antipattern", weight: 0.8 },
      { id: "py-test-1", dimension: "Testing", keywords: ["test", "assert", "mock", "coverage"], conclusion: "testing_coverage_check", weight: 0.6 },
    ]),
  },

  {
    packageId: "api-documentation-writer",
    version: "1.1.0",
    displayName: "API Documentation Writer",
    description:
      "Generates clear, complete API documentation from code and specifications. Follows OpenAPI 3.0 standards with practical examples.",
    readme:
      "# API Documentation Writer\n\nTransforms API code into excellent developer documentation.\n\n## Output formats\n\n- OpenAPI 3.0 YAML/JSON\n- Markdown READMEs\n- Postman Collections\n- Quick-start guides\n\n## Quality criteria\n\nEvery endpoint evaluated for completeness, examples, error documentation, and authentication clarity.",
    authorName: "DevSkills Team",
    category: "development" as const,
    tags: ["documentation", "api", "openapi", "developer-experience"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/example/api-docs-writer",
    homepageUrl: null,
    rules: makeRules([
      { id: "doc-comp-1", dimension: "Completeness", keywords: ["endpoint", "route", "path", "method"], conclusion: "endpoint_documented", weight: 0.9 },
      { id: "doc-comp-2", dimension: "Completeness", keywords: ["error", "status", "4xx", "5xx", "response"], conclusion: "error_codes_documented", weight: 0.85 },
      { id: "doc-ex-1", dimension: "Examples", keywords: ["example", "request", "curl", "body"], conclusion: "request_example_present", weight: 0.8 },
      { id: "doc-ex-2", dimension: "Examples", keywords: ["response", "json", "return", "output"], conclusion: "response_example_present", weight: 0.8 },
      { id: "doc-auth-1", dimension: "Authentication", keywords: ["auth", "token", "bearer", "api-key", "header"], conclusion: "auth_requirements_stated", weight: 0.75 },
    ]),
  },

  {
    packageId: "ci-cd-pipeline-auditor",
    version: "1.0.0",
    displayName: "CI/CD Pipeline Auditor",
    description:
      "Reviews CI/CD configurations for security gaps, inefficiencies, and missing best practices. Supports GitHub Actions, GitLab CI, and Jenkins.",
    readme:
      "# CI/CD Pipeline Auditor\n\nAnalyzes continuous integration and deployment pipelines for:\n\n- Secret exposure risks (hardcoded tokens, env leaks)\n- Cache optimization opportunities\n- Dependency pinning and supply chain safety\n- Deployment strategy review (blue-green, canary)\n\n## Supported platforms\n\nGitHub Actions, GitLab CI, Jenkins, CircleCI.",
    authorName: "DevSkills Team",
    category: "development" as const,
    tags: ["cicd", "devops", "github-actions", "security"],
    maturity: "beta" as const,
    license: "free" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "ci-sec-1", dimension: "Secrets", keywords: ["secret", "token", "password", "key", "credential"], conclusion: "secret_exposure_risk", weight: 1.0 },
      { id: "ci-sec-2", dimension: "Secrets", keywords: ["env", "environment", "variable", "hardcoded"], conclusion: "hardcoded_secret_risk", weight: 0.95 },
      { id: "ci-perf-1", dimension: "Performance", keywords: ["cache", "artifact", "restore", "save"], conclusion: "cache_optimization", weight: 0.7 },
      { id: "ci-dep-1", dimension: "Supply Chain", keywords: ["pin", "version", "sha", "digest", "lock"], conclusion: "dependency_pinning", weight: 0.85 },
      { id: "ci-dep-2", dimension: "Supply Chain", keywords: ["third-party", "action", "external", "marketplace"], conclusion: "third_party_action_audit", weight: 0.8 },
      { id: "ci-deploy-1", dimension: "Deployment", keywords: ["deploy", "rollback", "canary", "blue-green"], conclusion: "deployment_strategy_review", weight: 0.65 },
    ]),
  },

  {
    packageId: "typescript-migration-guide",
    version: "0.8.0",
    displayName: "TypeScript Migration Guide",
    description:
      "Helps teams migrate JavaScript codebases to TypeScript. Evaluates readiness, identifies migration risks, and recommends incremental strategies.",
    readme:
      "# TypeScript Migration Guide\n\nStructured evaluation skill for JS → TS migration planning.\n\n## Evaluates\n\n- Codebase readiness (file count, test coverage, dependency TS support)\n- Migration strategy (strict vs gradual, entry points)\n- Risk assessment (runtime type assumptions, dynamic patterns)\n- Tooling setup (tsconfig, path aliases, build integration)",
    authorName: "DevSkills Team",
    category: "development" as const,
    tags: ["typescript", "migration", "javascript", "refactoring"],
    maturity: "experimental" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "ts-ready-1", dimension: "Readiness", keywords: ["test", "coverage", "jest", "vitest", "mocha"], conclusion: "test_coverage_adequate", weight: 0.8 },
      { id: "ts-ready-2", dimension: "Readiness", keywords: ["jsdoc", "type", "typedef", "annotation"], conclusion: "existing_type_annotations", weight: 0.7 },
      { id: "ts-risk-1", dimension: "Risk", keywords: ["eval", "dynamic", "require", "import()"], conclusion: "dynamic_pattern_risk", weight: 0.9 },
      { id: "ts-risk-2", dimension: "Risk", keywords: ["prototype", "this", "bind", "call", "apply"], conclusion: "prototype_mutation_risk", weight: 0.75 },
      { id: "ts-strat-1", dimension: "Strategy", keywords: ["strict", "noImplicitAny", "strictNullChecks"], conclusion: "strict_mode_recommendation", weight: 0.65 },
    ]),
  },

  {
    packageId: "database-schema-reviewer",
    version: "1.0.0",
    displayName: "Database Schema Reviewer",
    description:
      "Reviews relational database schemas for normalization issues, missing indexes, constraint gaps, and scalability concerns.",
    readme:
      "# Database Schema Reviewer\n\nExpert evaluation of SQL database schemas covering:\n\n- Normalization (1NF → 3NF compliance)\n- Index strategy (missing, redundant, covering)\n- Constraint completeness (FK, CHECK, UNIQUE)\n- Naming conventions\n- Scalability patterns (partitioning, sharding readiness)",
    authorName: "DevSkills Team",
    category: "data" as const,
    tags: ["database", "sql", "schema", "postgresql", "performance"],
    maturity: "stable" as const,
    license: "free" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "db-norm-1", dimension: "Normalization", keywords: ["redundant", "duplicate", "denormalize", "repeated"], conclusion: "normalization_violation", weight: 0.85 },
      { id: "db-idx-1", dimension: "Indexing", keywords: ["index", "query", "where", "join", "foreign"], conclusion: "missing_index", weight: 0.9 },
      { id: "db-idx-2", dimension: "Indexing", keywords: ["composite", "covering", "partial", "expression"], conclusion: "index_optimization", weight: 0.7 },
      { id: "db-fk-1", dimension: "Constraints", keywords: ["foreign", "reference", "cascade", "restrict"], conclusion: "foreign_key_check", weight: 0.8 },
      { id: "db-fk-2", dimension: "Constraints", keywords: ["check", "unique", "not null", "default"], conclusion: "constraint_completeness", weight: 0.75 },
      { id: "db-scale-1", dimension: "Scalability", keywords: ["partition", "shard", "archive", "retention"], conclusion: "scalability_assessment", weight: 0.6 },
    ]),
  },

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║  EXPERT SKILLS (5)                                                       ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝

  {
    packageId: "legal-contract-reviewer",
    version: "1.0.0",
    displayName: "Legal Contract Reviewer",
    description:
      "Reviews SaaS contracts and service agreements for risk clauses, unfavorable terms, and missing standard protections.",
    readme:
      "# Legal Contract Reviewer\n\nAn expert skill for reviewing software contracts and SaaS agreements.\n\n## What it does\n\n- Identifies automatic renewal clauses\n- Flags jurisdiction risk\n- Checks for missing limitation of liability caps\n- Highlights IP ownership clauses\n- Evaluates data processing terms\n\n## Evaluation dimensions\n\nLiability, IP Ownership, Jurisdiction, Renewal Terms, Data Privacy.",
    authorName: "Expert Legal",
    category: "security" as const,
    tags: ["legal", "contracts", "compliance", "risk", "saas"],
    maturity: "stable" as const,
    license: "premium" as const,
    priceUsd: "4.99",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "leg-liab-1", dimension: "Liability", keywords: ["liability", "cap", "limit", "damages", "indemnity"], conclusion: "liability_cap_missing", weight: 1.0 },
      { id: "leg-liab-2", dimension: "Liability", keywords: ["consequential", "indirect", "lost profits"], conclusion: "consequential_damages_risk", weight: 0.9 },
      { id: "leg-ip-1", dimension: "IP Ownership", keywords: ["intellectual property", "ownership", "work for hire", "assignment"], conclusion: "ip_ownership_unclear", weight: 0.95 },
      { id: "leg-jur-1", dimension: "Jurisdiction", keywords: ["jurisdiction", "governing law", "venue", "arbitration"], conclusion: "jurisdiction_risk", weight: 0.85 },
      { id: "leg-ren-1", dimension: "Renewal", keywords: ["auto-renew", "renewal", "notice period", "termination"], conclusion: "auto_renewal_trap", weight: 0.8 },
      { id: "leg-data-1", dimension: "Data Privacy", keywords: ["data", "gdpr", "privacy", "processing", "controller"], conclusion: "data_processing_review", weight: 0.75 },
    ]),
  },

  {
    packageId: "startup-financial-evaluator",
    version: "1.0.0",
    displayName: "Startup Financial Evaluator",
    description:
      "Evaluates startup financial models, projections, and unit economics. Scores team, market, financials, and technology dimensions.",
    readme:
      "# Startup Financial Evaluator\n\nExpert evaluation skill for early-stage startup financials.\n\n## Scoring Matrix\n\n| Dimension | Weight | What it checks |\n|-----------|--------|----------------|\n| Team | 0.3 | Founder experience, hiring velocity, domain expertise |\n| Market | 0.25 | TAM/SAM/SOM, competition, timing |\n| Financials | 0.3 | Unit economics, burn rate, runway, revenue growth |\n| Technology | 0.15 | Defensibility, scalability, IP |\n\n## Output\n\nStructured verdict: recommend / neutral / caution with per-dimension scores.",
    authorName: "Expert Finance",
    category: "data" as const,
    tags: ["finance", "startup", "evaluation", "investment", "unit-economics"],
    maturity: "beta" as const,
    license: "premium" as const,
    priceUsd: "9.99",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "fin-team-h", dimension: "Team", keywords: ["experienced", "serial founder", "domain expert", "strong hire"], conclusion: "high_team", weight: 0.3 },
      { id: "fin-team-m", dimension: "Team", keywords: ["team", "founder", "cto", "hire"], conclusion: "mid_team", weight: 0.18 },
      { id: "fin-team-l", dimension: "Team", keywords: ["solo", "first-time", "no experience"], conclusion: "low_team", weight: 0.06 },
      { id: "fin-mkt-h", dimension: "Market", keywords: ["large tam", "growing market", "underserved", "tailwind"], conclusion: "high_market", weight: 0.25 },
      { id: "fin-mkt-m", dimension: "Market", keywords: ["market", "competition", "niche"], conclusion: "mid_market", weight: 0.15 },
      { id: "fin-mkt-l", dimension: "Market", keywords: ["saturated", "declining", "no moat"], conclusion: "low_market", weight: 0.05 },
      { id: "fin-num-h", dimension: "Financials", keywords: ["profitable", "positive unit economics", "low burn", "strong growth"], conclusion: "high_financials", weight: 0.3 },
      { id: "fin-num-m", dimension: "Financials", keywords: ["revenue", "mrr", "arr", "growth"], conclusion: "mid_financials", weight: 0.18 },
      { id: "fin-num-l", dimension: "Financials", keywords: ["pre-revenue", "high burn", "no runway"], conclusion: "low_financials", weight: 0.06 },
      { id: "fin-tech-h", dimension: "Technology", keywords: ["patent", "defensible", "proprietary", "moat"], conclusion: "high_technology", weight: 0.15 },
      { id: "fin-tech-m", dimension: "Technology", keywords: ["technology", "platform", "scalable"], conclusion: "mid_technology", weight: 0.09 },
    ]),
  },

  {
    packageId: "ux-research-analyst",
    version: "1.0.0",
    displayName: "UX Research Analyst",
    description:
      "Expert in user experience research methodologies, interview synthesis, and translating user feedback into actionable product insights.",
    readme:
      "# UX Research Analyst\n\nBrings 10+ years of UX research expertise to your AI agent.\n\n## Capabilities\n\n- User interview synthesis and theme extraction\n- Journey mapping and friction point identification\n- Usability heuristic evaluation (Nielsen's 10)\n- A/B test result interpretation\n- Persona validation\n\n## Evaluation dimensions\n\nMethodology, Insights Quality, Actionability, User Evidence.",
    authorName: "Expert UX",
    category: "research" as const,
    tags: ["ux", "research", "product", "interviews", "usability"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "ux-meth-1", dimension: "Methodology", keywords: ["interview", "survey", "usability test", "diary study"], conclusion: "methodology_appropriate", weight: 0.8 },
      { id: "ux-meth-2", dimension: "Methodology", keywords: ["sample size", "participants", "recruitment", "bias"], conclusion: "sample_adequacy", weight: 0.75 },
      { id: "ux-ins-1", dimension: "Insights", keywords: ["theme", "pattern", "finding", "insight", "behavior"], conclusion: "insight_quality_check", weight: 0.9 },
      { id: "ux-ins-2", dimension: "Insights", keywords: ["quote", "evidence", "observed", "data point"], conclusion: "evidence_backed_insight", weight: 0.85 },
      { id: "ux-act-1", dimension: "Actionability", keywords: ["recommendation", "action", "priority", "next step"], conclusion: "actionable_recommendation", weight: 0.7 },
      { id: "ux-heur-1", dimension: "Heuristics", keywords: ["visibility", "feedback", "consistency", "error prevention", "recognition"], conclusion: "nielsen_heuristic_match", weight: 0.65 },
    ]),
  },

  {
    packageId: "hiring-interview-evaluator",
    version: "0.9.0",
    displayName: "Hiring Interview Evaluator",
    description:
      "Structures and evaluates hiring interviews. Assesses candidates across technical depth, communication, culture fit, and growth potential.",
    readme:
      "# Hiring Interview Evaluator\n\nHelps hiring managers make structured, bias-reduced decisions.\n\n## Scoring Matrix\n\n| Dimension | Weight | Signals |\n|-----------|--------|----------|\n| Technical Depth | 0.35 | Problem solving, system design, code quality |\n| Communication | 0.2 | Clarity, listening, collaboration |\n| Culture Fit | 0.2 | Values alignment, team dynamics, adaptability |\n| Growth Potential | 0.25 | Learning velocity, curiosity, ambition |\n\n## Output\n\nHire / Maybe / Pass verdict with per-dimension scores and evidence notes.",
    authorName: "Expert HR",
    category: "other" as const,
    tags: ["hiring", "interview", "hr", "evaluation", "structured-interview"],
    maturity: "beta" as const,
    license: "premium" as const,
    priceUsd: "2.99",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "hire-tech-h", dimension: "Technical Depth", keywords: ["strong", "excellent", "deep knowledge", "senior level", "system design"], conclusion: "high_technical", weight: 0.35 },
      { id: "hire-tech-m", dimension: "Technical Depth", keywords: ["adequate", "mid-level", "good understanding", "competent"], conclusion: "mid_technical", weight: 0.21 },
      { id: "hire-tech-l", dimension: "Technical Depth", keywords: ["junior", "gaps", "struggled", "incorrect"], conclusion: "low_technical", weight: 0.07 },
      { id: "hire-comm-h", dimension: "Communication", keywords: ["articulate", "clear", "collaborative", "active listener"], conclusion: "high_communication", weight: 0.2 },
      { id: "hire-comm-m", dimension: "Communication", keywords: ["communicates", "explains", "responds"], conclusion: "mid_communication", weight: 0.12 },
      { id: "hire-cult-h", dimension: "Culture Fit", keywords: ["values aligned", "team player", "adaptable", "ownership"], conclusion: "high_culture", weight: 0.2 },
      { id: "hire-cult-m", dimension: "Culture Fit", keywords: ["culture", "team", "work style"], conclusion: "mid_culture", weight: 0.12 },
      { id: "hire-grow-h", dimension: "Growth Potential", keywords: ["fast learner", "curious", "ambitious", "self-driven"], conclusion: "high_growth", weight: 0.25 },
      { id: "hire-grow-m", dimension: "Growth Potential", keywords: ["learning", "growth", "improve"], conclusion: "mid_growth", weight: 0.15 },
    ]),
  },

  {
    packageId: "content-marketing-strategist",
    version: "1.0.0",
    displayName: "Content Marketing Strategist",
    description:
      "Evaluates content marketing strategies across SEO, audience targeting, distribution channels, and conversion optimization.",
    readme:
      "# Content Marketing Strategist\n\nExpert skill for evaluating and improving content marketing plans.\n\n## Evaluation dimensions\n\n- **SEO**: Keyword research, on-page optimization, link strategy\n- **Audience**: Persona alignment, funnel stage mapping, intent matching\n- **Distribution**: Channel mix, promotion strategy, repurposing\n- **Conversion**: CTA effectiveness, lead magnets, nurture sequences\n\n## Use cases\n\nContent calendar review, blog post strategy, thought leadership planning.",
    authorName: "Expert Marketing",
    category: "other" as const,
    tags: ["marketing", "content", "seo", "strategy", "conversion"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "mkt-seo-1", dimension: "SEO", keywords: ["keyword", "search volume", "ranking", "serp", "backlink"], conclusion: "seo_strategy_check", weight: 0.8 },
      { id: "mkt-seo-2", dimension: "SEO", keywords: ["on-page", "meta", "title", "h1", "alt text"], conclusion: "on_page_optimization", weight: 0.7 },
      { id: "mkt-aud-1", dimension: "Audience", keywords: ["persona", "audience", "target", "segment", "icp"], conclusion: "audience_alignment", weight: 0.85 },
      { id: "mkt-aud-2", dimension: "Audience", keywords: ["funnel", "awareness", "consideration", "decision", "intent"], conclusion: "funnel_stage_mapping", weight: 0.75 },
      { id: "mkt-dist-1", dimension: "Distribution", keywords: ["channel", "social", "email", "newsletter", "syndication"], conclusion: "distribution_strategy", weight: 0.7 },
      { id: "mkt-conv-1", dimension: "Conversion", keywords: ["cta", "conversion", "lead magnet", "signup", "download"], conclusion: "conversion_optimization", weight: 0.65 },
    ]),
  },
] as const;

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Connecting to database...`);
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });
  const packageDAL = new SkillPackageDAL(db);
  const ruleDAL = new SkillRuleDAL(db);

  console.log(
    `Seeding ${SAMPLE_PACKAGES.length} packages with author: ${SEED_AUTHOR_ID}\n`,
  );

  let created = 0;
  let skipped = 0;

  for (const pkg of SAMPLE_PACKAGES) {
    const existing = await packageDAL.getByPackageId(pkg.packageId);
    if (existing) {
      console.log(`  skip: ${pkg.packageId} (already exists)`);
      skipped++;
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
      icon: null,
      repositoryUrl: pkg.repositoryUrl,
      homepageUrl: pkg.homepageUrl,
      origin: "manual",
      createdAt: now,
      updatedAt: now,
      releasedAt: now,
    });

    // Store rules as structured JSON in .yigyaps/rules.json
    await ruleDAL.create({
      id: `rule_${now}_${Math.random().toString(36).slice(2, 8)}`,
      packageId: id,
      path: ".yigyaps/rules.json",
      content: pkg.rules,
      createdAt: now,
    });

    created++;
    console.log(`  + ${pkg.displayName} (${pkg.packageId})`);
  }

  await pool.end();
  console.log(`\nSeed complete: ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
