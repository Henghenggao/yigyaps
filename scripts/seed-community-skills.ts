#!/usr/bin/env tsx
/**
 * YigYaps Community Skills Seed Script
 *
 * 26 open-source-inspired productivity skills in priority order:
 *   Priority 1 — ⭐ Immediately implementable (8 skills)
 *   Priority 2 — ⭐⭐ Open-source validated + immediately implementable (5 skills)
 *   Priority 3 — ⭐⭐ Remaining (13 skills)
 *
 * Categories: development, productivity, automation, research, communication,
 *             security, data, ai-ml
 *
 * Usage: DATABASE_URL=... SEED_AUTHOR_ID=usr_xxx tsx scripts/seed-community-skills.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { fileURLToPath } from "url";
import * as schema from "../packages/db/src/schema/index.js";
import { SkillPackageDAL, SkillRuleDAL } from "../packages/db/src/dal/index.js";

const { Pool } = pg;

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

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY 1 — ⭐ Immediately Implementable (8 skills)
// ─────────────────────────────────────────────────────────────────────────────

export const COMMUNITY_SKILLS = [

  // ── C4: Git Commit Message Writer ─────────────────────────────────────────
  {
    packageId: "git-commit-writer",
    version: "1.0.0",
    displayName: "Git Commit Message Writer",
    description:
      "Generates clear, conventional commit messages from git diffs. Follows Conventional Commits spec with type, scope, and breaking change detection.",
    readme: `# Git Commit Message Writer

Transforms raw git diffs into well-structured commit messages following the [Conventional Commits](https://conventionalcommits.org) specification.

## Output Format

\`\`\`
<type>(<scope>): <short summary>

[optional body]

[optional footer: BREAKING CHANGE: ...]
\`\`\`

## Supported Types

| Type | When to use |
|------|-------------|
| \`feat\` | New feature |
| \`fix\` | Bug fix |
| \`refactor\` | Code restructuring, no behavior change |
| \`docs\` | Documentation only |
| \`test\` | Adding or fixing tests |
| \`chore\` | Build process, dependency updates |
| \`perf\` | Performance improvement |
| \`ci\` | CI/CD configuration |

## Rules

Evaluates diffs across: type detection, scope inference, breaking change signals, and body necessity.`,
    authorName: "Community Dev",
    category: "development" as const,
    tags: ["git", "commit", "conventional-commits", "devops", "dx"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/conventional-commits/conventionalcommits.org",
    homepageUrl: "https://conventionalcommits.org",
    rules: makeRules([
      { id: "gc-type-1", dimension: "Type Detection", keywords: ["add", "new", "implement", "introduce", "create"], conclusion: "type_feat", weight: 0.9 },
      { id: "gc-type-2", dimension: "Type Detection", keywords: ["fix", "bug", "patch", "resolve", "correct"], conclusion: "type_fix", weight: 0.95 },
      { id: "gc-type-3", dimension: "Type Detection", keywords: ["refactor", "restructure", "reorganize", "move", "rename"], conclusion: "type_refactor", weight: 0.8 },
      { id: "gc-type-4", dimension: "Type Detection", keywords: ["test", "spec", "coverage", "assert", "mock"], conclusion: "type_test", weight: 0.85 },
      { id: "gc-type-5", dimension: "Type Detection", keywords: ["docs", "readme", "comment", "jsdoc", "documentation"], conclusion: "type_docs", weight: 0.8 },
      { id: "gc-scope-1", dimension: "Scope", keywords: ["api", "endpoint", "route", "controller"], conclusion: "scope_api", weight: 0.7 },
      { id: "gc-scope-2", dimension: "Scope", keywords: ["auth", "login", "token", "session", "jwt"], conclusion: "scope_auth", weight: 0.75 },
      { id: "gc-scope-3", dimension: "Scope", keywords: ["ui", "component", "page", "layout", "style"], conclusion: "scope_ui", weight: 0.7 },
      { id: "gc-break-1", dimension: "Breaking Change", keywords: ["breaking", "BREAKING", "remove", "rename", "incompatible"], conclusion: "breaking_change_flag", weight: 1.0 },
      { id: "gc-body-1", dimension: "Body Necessity", keywords: ["complex", "multiple files", "migration", "upgrade"], conclusion: "body_recommended", weight: 0.6 },
    ]),
  },

  // ── C3: Regex Builder & Explainer ─────────────────────────────────────────
  {
    packageId: "regex-builder",
    version: "1.0.0",
    displayName: "Regex Builder & Explainer",
    description:
      "Generates regular expressions from natural language descriptions and explains existing regex patterns in plain English. Supports major flavors (JS, Python, PCRE).",
    readme: `# Regex Builder & Explainer

Two modes in one skill:

### Build Mode
Describe what you want to match → get a production-ready regex with explanation.

**Examples:**
- "email addresses" → \`/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/\`
- "US phone numbers with optional country code" → \`/^(\\+1)?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$/\`

### Explain Mode
Paste any regex → get a plain-English breakdown token by token.

## Evaluation Dimensions

- **Pattern Type**: Identifies the data type being matched
- **Anchoring**: Checks for proper start/end anchors
- **Groups**: Named vs unnamed capture groups
- **Quantifiers**: Greedy vs lazy, specific ranges
- **Flags**: Case sensitivity, multiline, global`,
    authorName: "Community Dev",
    category: "development" as const,
    tags: ["regex", "pattern-matching", "string-processing", "developer-tools", "parsing"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "rx-type-1", dimension: "Pattern Type", keywords: ["email", "mail", "address"], conclusion: "pattern_email", weight: 0.95 },
      { id: "rx-type-2", dimension: "Pattern Type", keywords: ["url", "http", "https", "link", "website"], conclusion: "pattern_url", weight: 0.95 },
      { id: "rx-type-3", dimension: "Pattern Type", keywords: ["phone", "telephone", "mobile", "number"], conclusion: "pattern_phone", weight: 0.9 },
      { id: "rx-type-4", dimension: "Pattern Type", keywords: ["date", "time", "timestamp", "datetime"], conclusion: "pattern_datetime", weight: 0.9 },
      { id: "rx-type-5", dimension: "Pattern Type", keywords: ["ip", "ipv4", "ipv6", "address"], conclusion: "pattern_ip", weight: 0.9 },
      { id: "rx-type-6", dimension: "Pattern Type", keywords: ["uuid", "guid", "id", "identifier"], conclusion: "pattern_uuid", weight: 0.85 },
      { id: "rx-anchor-1", dimension: "Anchoring", keywords: ["start", "beginning", "end", "whole", "exact"], conclusion: "anchors_recommended", weight: 0.8 },
      { id: "rx-group-1", dimension: "Groups", keywords: ["capture", "group", "extract", "named"], conclusion: "named_group_recommended", weight: 0.7 },
      { id: "rx-quant-1", dimension: "Quantifiers", keywords: ["one or more", "zero or more", "optional", "between", "exactly"], conclusion: "quantifier_precision", weight: 0.75 },
      { id: "rx-flag-1", dimension: "Flags", keywords: ["case insensitive", "multiline", "global", "all matches"], conclusion: "flag_recommendation", weight: 0.65 },
    ]),
  },

  // ── O1: Meeting Notes → Action Items ──────────────────────────────────────
  {
    packageId: "meeting-notes-extractor",
    version: "1.0.0",
    displayName: "Meeting Notes → Action Items",
    description:
      "Extracts structured action items, decisions, owners, and deadlines from unstructured meeting notes or transcripts. Outputs a clean, shareable summary.",
    readme: `# Meeting Notes → Action Items

Transforms raw meeting notes or transcripts into structured output:

## Output Structure

\`\`\`
## ✅ Action Items
- [ ] [Owner] Task description — Due: [date]

## 📋 Decisions Made
- Decision with rationale

## ❓ Open Questions
- Question — assigned to [person]

## 📅 Next Meeting
- [date/time if mentioned]
\`\`\`

## Evaluation Dimensions

- **Action Detection**: Identifies commitments and tasks
- **Owner Assignment**: Links tasks to people or teams
- **Deadlines**: Extracts explicit and implicit time constraints
- **Decisions**: Separates resolved vs open items
- **Follow-ups**: Flags items needing future attention`,
    authorName: "Community Productivity",
    category: "productivity" as const,
    tags: ["meetings", "productivity", "action-items", "project-management", "notes"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "mn-act-1", dimension: "Action Detection", keywords: ["will", "shall", "going to", "need to", "action item", "todo"], conclusion: "action_item_detected", weight: 0.95 },
      { id: "mn-act-2", dimension: "Action Detection", keywords: ["responsible", "take care", "handle", "own", "assigned"], conclusion: "ownership_signal", weight: 0.85 },
      { id: "mn-own-1", dimension: "Owner", keywords: ["@", "team", "department", "i will", "she will", "he will", "they will"], conclusion: "owner_identified", weight: 0.9 },
      { id: "mn-dead-1", dimension: "Deadline", keywords: ["by", "until", "deadline", "end of week", "eod", "eow", "friday", "monday", "next week"], conclusion: "deadline_extracted", weight: 0.85 },
      { id: "mn-dead-2", dimension: "Deadline", keywords: ["asap", "urgent", "immediately", "today", "tomorrow"], conclusion: "urgent_deadline", weight: 0.9 },
      { id: "mn-dec-1", dimension: "Decision", keywords: ["decided", "agreed", "approved", "rejected", "confirmed", "resolved"], conclusion: "decision_logged", weight: 0.9 },
      { id: "mn-open-1", dimension: "Open Questions", keywords: ["question", "unclear", "need to find out", "tbd", "pending", "investigate"], conclusion: "open_item_flagged", weight: 0.8 },
      { id: "mn-next-1", dimension: "Follow-ups", keywords: ["follow up", "revisit", "check back", "next meeting", "sync again"], conclusion: "follow_up_needed", weight: 0.75 },
    ]),
  },

  // ── O3: Spreadsheet Formula Expert ────────────────────────────────────────
  {
    packageId: "spreadsheet-formula-expert",
    version: "1.0.0",
    displayName: "Spreadsheet Formula Expert",
    description:
      "Generates and explains Excel and Google Sheets formulas from plain English descriptions. Covers lookups, conditionals, text, dates, arrays, and error handling.",
    readme: `# Spreadsheet Formula Expert

Describe what you need → get the exact formula with explanation.

## Formula Categories

| Category | Examples |
|----------|---------|
| Lookup | XLOOKUP, INDEX/MATCH, VLOOKUP |
| Conditional | SUMIF, COUNTIFS, AVERAGEIF |
| Text | TEXTJOIN, SPLIT, REGEXEXTRACT |
| Date | NETWORKDAYS, EOMONTH, DATEDIF |
| Array | ARRAYFORMULA, FILTER, UNIQUE |
| Statistical | PERCENTILE, STDEV, CORREL |

## Best Practices Applied

- Prefers XLOOKUP over VLOOKUP (Google Sheets / Excel 365)
- Wraps risky formulas in IFERROR
- Uses absolute references ($) where needed
- Adds formula explanation as a comment`,
    authorName: "Community Productivity",
    category: "productivity" as const,
    tags: ["excel", "google-sheets", "formulas", "spreadsheet", "productivity", "data"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "sf-look-1", dimension: "Lookup", keywords: ["find", "lookup", "search", "match", "retrieve", "get value"], conclusion: "lookup_formula", weight: 0.9 },
      { id: "sf-look-2", dimension: "Lookup", keywords: ["vlookup", "xlookup", "index match", "hlookup"], conclusion: "lookup_type_specified", weight: 0.95 },
      { id: "sf-cond-1", dimension: "Conditional", keywords: ["if", "when", "condition", "criteria", "where", "filter"], conclusion: "conditional_formula", weight: 0.85 },
      { id: "sf-cond-2", dimension: "Conditional", keywords: ["sum if", "count if", "average if", "sumproduct"], conclusion: "conditional_aggregation", weight: 0.9 },
      { id: "sf-text-1", dimension: "Text", keywords: ["combine", "join", "concatenate", "split", "extract", "left", "right", "mid"], conclusion: "text_formula", weight: 0.85 },
      { id: "sf-date-1", dimension: "Date", keywords: ["date", "day", "month", "year", "working days", "business days", "end of month"], conclusion: "date_formula", weight: 0.85 },
      { id: "sf-arr-1", dimension: "Array", keywords: ["array", "multiple", "all rows", "dynamic", "spill", "filter"], conclusion: "array_formula", weight: 0.8 },
      { id: "sf-err-1", dimension: "Error Handling", keywords: ["error", "na", "div/0", "ref", "handle", "fallback", "default"], conclusion: "error_handling_needed", weight: 0.85 },
      { id: "sf-ref-1", dimension: "Reference", keywords: ["absolute", "lock", "fixed", "dollar sign", "copy formula"], conclusion: "absolute_reference_needed", weight: 0.7 },
    ]),
  },

  // ── O6: OKR & Goal Cascade Writer ─────────────────────────────────────────
  {
    packageId: "okr-cascade-writer",
    version: "1.0.0",
    displayName: "OKR & Goal Cascade Writer",
    description:
      "Writes and evaluates Objectives and Key Results (OKRs) from strategic goals. Checks SMART criteria, measurability, and cascading alignment across levels.",
    readme: `# OKR & Goal Cascade Writer

Transforms strategy into actionable OKRs, evaluated against proven frameworks.

## Output Format

\`\`\`
Objective: [Inspiring, qualitative goal]
  KR1: [Measurable outcome] — Target: X by [date]
  KR2: [Measurable outcome] — Target: X by [date]
  KR3: [Measurable outcome] — Target: X by [date]
\`\`\`

## Quality Checks

- **SMART**: Specific, Measurable, Achievable, Relevant, Time-bound
- **Ambition**: Stretch goals (70% achievement = success)
- **Cascade**: Company → Team → Individual alignment
- **Outcome vs Output**: KRs measure results, not activities

## Inspired by

Google's OKR framework (John Doerr — *Measure What Matters*)`,
    authorName: "Community Productivity",
    category: "productivity" as const,
    tags: ["okr", "goals", "strategy", "planning", "management", "performance"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "okr-meas-1", dimension: "Measurability", keywords: ["%", "number", "increase", "decrease", "grow", "reduce", "from", "to"], conclusion: "measurable_kr", weight: 0.95 },
      { id: "okr-meas-2", dimension: "Measurability", keywords: ["metric", "kpi", "score", "rating", "count", "revenue", "users"], conclusion: "metric_defined", weight: 0.9 },
      { id: "okr-time-1", dimension: "Timebound", keywords: ["by q", "by end of", "by january", "by march", "by june", "by september", "by december", "quarterly"], conclusion: "timebound_kr", weight: 0.9 },
      { id: "okr-ambi-1", dimension: "Ambition", keywords: ["10x", "stretch", "moonshot", "ambitious", "bold", "breakthrough"], conclusion: "stretch_goal", weight: 0.8 },
      { id: "okr-outp-1", dimension: "Outcome vs Output", keywords: ["launch", "deliver", "complete", "ship", "implement"], conclusion: "output_kr_warning", weight: 0.85 },
      { id: "okr-casc-1", dimension: "Cascade", keywords: ["company", "team", "individual", "department", "align", "supports"], conclusion: "cascade_level_defined", weight: 0.75 },
      { id: "okr-insp-1", dimension: "Objective Quality", keywords: ["inspire", "vision", "purpose", "why", "mission"], conclusion: "objective_inspiring", weight: 0.7 },
    ]),
  },

  // ── CR1: AI Image Prompt Engineer ─────────────────────────────────────────
  {
    packageId: "ai-image-prompt-engineer",
    version: "1.0.0",
    displayName: "AI Image Prompt Engineer",
    description:
      "Optimizes and generates prompts for AI image generators (Midjourney, DALL-E 3, Stable Diffusion, Flux). Covers subject, style, composition, lighting, and negative prompts.",
    readme: `# AI Image Prompt Engineer

Craft prompts that consistently produce high-quality AI-generated images.

## Supported Generators

- **Midjourney v6** — parameter syntax (\`--ar\`, \`--style\`, \`--v\`)
- **DALL-E 3** — natural language optimization
- **Stable Diffusion / Flux** — positive + negative prompt structure
- **Adobe Firefly** — content credentials aware

## Prompt Anatomy

\`\`\`
[Subject], [Style], [Composition], [Lighting], [Quality modifiers]
--ar [ratio] --v [version] --style [raw|scenic]
Negative: [what to avoid]
\`\`\`

## Evaluation Dimensions

- **Subject Clarity**: Is the main subject unambiguous?
- **Style Definition**: Art style, medium, artist reference
- **Composition**: Camera angle, framing, depth of field
- **Lighting**: Time of day, light source, mood
- **Quality Modifiers**: Resolution, detail level
- **Negative Prompt**: Common artifacts to exclude`,
    authorName: "Community AI",
    category: "ai-ml" as const,
    tags: ["ai-art", "midjourney", "dall-e", "stable-diffusion", "prompt-engineering", "flux"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "img-subj-1", dimension: "Subject", keywords: ["portrait", "landscape", "scene", "character", "object", "animal", "person"], conclusion: "subject_defined", weight: 0.9 },
      { id: "img-styl-1", dimension: "Style", keywords: ["photorealistic", "digital art", "oil painting", "watercolor", "anime", "illustration", "concept art", "3d render"], conclusion: "style_defined", weight: 0.85 },
      { id: "img-styl-2", dimension: "Style", keywords: ["by", "style of", "inspired by", "in the style"], conclusion: "artist_reference", weight: 0.75 },
      { id: "img-comp-1", dimension: "Composition", keywords: ["close-up", "wide shot", "aerial", "portrait", "macro", "full body", "overhead"], conclusion: "composition_set", weight: 0.8 },
      { id: "img-light-1", dimension: "Lighting", keywords: ["golden hour", "studio lighting", "cinematic", "backlit", "dramatic", "soft light", "neon", "sunlight"], conclusion: "lighting_specified", weight: 0.8 },
      { id: "img-qual-1", dimension: "Quality", keywords: ["4k", "8k", "ultra detailed", "masterpiece", "high resolution", "sharp", "intricate details"], conclusion: "quality_modifiers", weight: 0.75 },
      { id: "img-neg-1", dimension: "Negative Prompt", keywords: ["no", "avoid", "without", "exclude", "negative", "ugly", "blurry", "deformed"], conclusion: "negative_prompt_present", weight: 0.7 },
      { id: "img-ar-1", dimension: "Aspect Ratio", keywords: ["--ar", "aspect ratio", "16:9", "1:1", "9:16", "4:3", "square", "portrait", "landscape"], conclusion: "aspect_ratio_set", weight: 0.65 },
    ]),
  },

  // ── CR3: Video Script Structurer ──────────────────────────────────────────
  {
    packageId: "video-script-structurer",
    version: "1.0.0",
    displayName: "Video Script Structurer",
    description:
      "Structures and evaluates video scripts for YouTube, TikTok, and short-form content. Checks hook strength, narrative flow, pacing, and call-to-action effectiveness.",
    readme: `# Video Script Structurer

Evaluate and generate video scripts optimized for viewer retention.

## The Proven 5-Act Structure

\`\`\`
[0:00-0:15]  HOOK       — Pattern interrupt, open loop, bold claim
[0:15-1:00]  PROBLEM    — Establish stakes, viewer's pain point
[1:00-4:00]  CONTENT    — Value delivery, story, evidence
[4:00-4:30]  PAYOFF     — Resolution, transformation
[4:30-5:00]  CTA        — Subscribe, comment, next video
\`\`\`

## Platform Optimization

| Platform | Ideal Length | Hook Window | Key Metric |
|----------|-------------|-------------|------------|
| YouTube long-form | 8-15 min | First 30s | Watch time |
| YouTube Shorts | 30-60s | First 3s | Loop rate |
| TikTok | 15-60s | First 1s | Completion |
| Instagram Reels | 15-90s | First 3s | Shares |

## Evaluation Dimensions

- **Hook**: Pattern interrupt strength, open loop
- **Problem**: Stakes clarity, viewer identification
- **Evidence**: Data, stories, examples
- **CTA**: Specificity and placement`,
    authorName: "Community Creative",
    category: "communication" as const,
    tags: ["video", "youtube", "tiktok", "content", "scriptwriting", "marketing", "short-form"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "vs-hook-1", dimension: "Hook", keywords: ["did you know", "what if", "most people", "secret", "mistake", "never", "always", "shocking"], conclusion: "hook_pattern_interrupt", weight: 0.95 },
      { id: "vs-hook-2", dimension: "Hook", keywords: ["in this video", "today i'll show", "by the end", "you'll learn"], conclusion: "hook_promise", weight: 0.85 },
      { id: "vs-prob-1", dimension: "Problem", keywords: ["problem", "struggle", "pain", "frustrating", "difficult", "challenge", "most people"], conclusion: "problem_established", weight: 0.85 },
      { id: "vs-evid-1", dimension: "Evidence", keywords: ["study", "research", "data", "according to", "example", "case study", "statistics"], conclusion: "evidence_provided", weight: 0.8 },
      { id: "vs-pace-1", dimension: "Pacing", keywords: ["chapter", "section", "part 1", "step 1", "first", "second", "next", "finally"], conclusion: "structure_signposted", weight: 0.75 },
      { id: "vs-cta-1", dimension: "CTA", keywords: ["subscribe", "like", "comment", "follow", "share", "click", "link in bio", "watch next"], conclusion: "cta_present", weight: 0.9 },
      { id: "vs-cta-2", dimension: "CTA", keywords: ["let me know", "tell me", "what do you think", "have you ever"], conclusion: "engagement_cta", weight: 0.75 },
    ]),
  },

  // ── W6: Job Listing Aggregator ────────────────────────────────────────────
  {
    packageId: "job-listing-aggregator",
    version: "1.0.0",
    displayName: "Job Listing Aggregator & Analyzer",
    description:
      "Extracts and normalizes job listing data from any source. Structures role, requirements, compensation, remote policy, and company info into a consistent format.",
    readme: `# Job Listing Aggregator & Analyzer

Parses job postings from any format (HTML, PDF, plain text) into a structured schema.

## Output Schema

\`\`\`json
{
  "title": "Senior Software Engineer",
  "company": "Acme Corp",
  "seniority": "senior",
  "location": { "type": "remote", "timezone": "US" },
  "compensation": { "min": 150000, "max": 200000, "currency": "USD", "equity": true },
  "requirements": { "required": [...], "preferred": [...] },
  "benefits": [...],
  "deadline": "2025-04-01"
}
\`\`\`

## Use Cases

- Job board aggregation pipelines
- Compensation benchmarking
- Skills gap analysis
- Automated application tracking`,
    authorName: "Community Automation",
    category: "automation" as const,
    tags: ["jobs", "hiring", "recruitment", "aggregator", "career", "data-extraction"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "jl-title-1", dimension: "Job Title", keywords: ["engineer", "developer", "manager", "analyst", "designer", "director", "lead", "architect"], conclusion: "job_title_extracted", weight: 0.95 },
      { id: "jl-level-1", dimension: "Seniority", keywords: ["junior", "mid-level", "senior", "lead", "principal", "staff", "vp", "director", "entry-level"], conclusion: "seniority_classified", weight: 0.9 },
      { id: "jl-loc-1", dimension: "Location Policy", keywords: ["remote", "hybrid", "on-site", "in-office", "work from home", "flexible"], conclusion: "remote_policy_extracted", weight: 0.9 },
      { id: "jl-comp-1", dimension: "Compensation", keywords: ["salary", "$", "€", "ote", "compensation", "equity", "rsu", "bonus", "range"], conclusion: "compensation_extracted", weight: 0.85 },
      { id: "jl-req-1", dimension: "Requirements", keywords: ["required", "must have", "minimum", "essential", "mandatory"], conclusion: "hard_requirements", weight: 0.9 },
      { id: "jl-req-2", dimension: "Requirements", keywords: ["nice to have", "preferred", "bonus", "plus", "ideally"], conclusion: "soft_requirements", weight: 0.85 },
      { id: "jl-ben-1", dimension: "Benefits", keywords: ["healthcare", "401k", "pto", "vacation", "parental leave", "equity", "gym", "learning"], conclusion: "benefits_extracted", weight: 0.75 },
      { id: "jl-dead-1", dimension: "Deadline", keywords: ["apply by", "closing date", "deadline", "applications close"], conclusion: "deadline_noted", weight: 0.7 },
    ]),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PRIORITY 2 — ⭐⭐ Open-source validated + immediately implementable (5 skills)
  // ─────────────────────────────────────────────────────────────────────────

  // ── R1: Academic Paper Analyzer ───────────────────────────────────────────
  {
    packageId: "academic-paper-analyzer",
    version: "1.0.0",
    displayName: "Academic Paper Analyzer",
    description:
      "Analyzes academic papers for methodology quality, statistical rigor, reproducibility, and practical implications. Inspired by GPT-Researcher and PaperQA.",
    readme: `# Academic Paper Analyzer

Structured evaluation of research papers across 6 quality dimensions.

## Inspired By

- [GPT-Researcher](https://github.com/assafelovic/gpt-researcher) — autonomous research agent
- [PaperQA](https://github.com/whitead/paper-qa) — question answering over papers

## Evaluation Dimensions

| Dimension | What it checks |
|-----------|---------------|
| Methodology | Research design, appropriate method for question |
| Sample | Sample size adequacy, representativeness, bias |
| Statistics | p-values, confidence intervals, effect sizes |
| Reproducibility | Pre-registration, open data, code availability |
| Limitations | Author-acknowledged constraints |
| Publication Venue | Peer review status, journal impact |

## Output

Structured verdict with per-dimension scores (1-5) and key findings summary.`,
    authorName: "Community Research",
    category: "research" as const,
    tags: ["research", "academia", "papers", "literature-review", "science", "citations"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/assafelovic/gpt-researcher",
    homepageUrl: null,
    rules: makeRules([
      { id: "ap-meth-1", dimension: "Methodology", keywords: ["randomized controlled trial", "rct", "meta-analysis", "systematic review", "longitudinal"], conclusion: "strong_methodology", weight: 0.95 },
      { id: "ap-meth-2", dimension: "Methodology", keywords: ["survey", "case study", "qualitative", "interview", "observational"], conclusion: "descriptive_methodology", weight: 0.8 },
      { id: "ap-samp-1", dimension: "Sample", keywords: ["n=", "sample size", "participants", "n >", "subjects", "respondents"], conclusion: "sample_size_noted", weight: 0.85 },
      { id: "ap-stat-1", dimension: "Statistics", keywords: ["p <", "p-value", "confidence interval", "effect size", "cohen's d", "odds ratio"], conclusion: "statistical_rigor", weight: 0.9 },
      { id: "ap-stat-2", dimension: "Statistics", keywords: ["statistically significant", "not significant", "p = 0.0", "95% ci"], conclusion: "significance_reported", weight: 0.85 },
      { id: "ap-repr-1", dimension: "Reproducibility", keywords: ["preregistered", "open data", "github", "code available", "supplementary", "replication"], conclusion: "reproducibility_strong", weight: 0.9 },
      { id: "ap-lim-1", dimension: "Limitations", keywords: ["limitation", "caveat", "future work", "constraint", "cannot generalize", "confound"], conclusion: "limitations_acknowledged", weight: 0.85 },
      { id: "ap-pub-1", dimension: "Publication", keywords: ["nature", "science", "cell", "nejm", "lancet", "jama", "peer-reviewed", "doi"], conclusion: "high_impact_venue", weight: 0.75 },
      { id: "ap-pub-2", dimension: "Publication", keywords: ["arxiv", "preprint", "ssrn", "biorxiv", "not peer reviewed"], conclusion: "preprint_caution", weight: 0.7 },
    ]),
  },

  // ── R4: Claim Fact-Checker ────────────────────────────────────────────────
  {
    packageId: "claim-fact-checker",
    version: "1.0.0",
    displayName: "Claim Fact-Checker",
    description:
      "Evaluates factual claims for source quality, evidence strength, scientific consensus alignment, and potential conflicts of interest. Media literacy for the AI age.",
    readme: `# Claim Fact-Checker

A structured fact-checking framework for evaluating the credibility of claims.

## Inspired By

- [Perplexica](https://github.com/ItzCrazyKns/Perplexica) — open-source search
- International Fact-Checking Network (IFCN) standards

## Evaluation Framework

\`\`\`
Claim → Source Quality → Evidence Type → Consensus Check
      → Recency → Conflict of Interest → Verdict
\`\`\`

## Verdict Scale

| Level | Meaning |
|-------|---------|
| ✅ Verified | Strong evidence from authoritative sources |
| ⚠️ Partially True | Some support but nuanced |
| ❓ Unverified | Insufficient evidence found |
| ❌ False | Contradicted by evidence |
| 🔄 Misleading | True but missing context |

## Source Tiers

1. Peer-reviewed journals, government agencies, WHO/CDC
2. Major newspapers, established institutions
3. Industry reports, expert opinions
4. Social media, anonymous sources (flag for verification)`,
    authorName: "Community Research",
    category: "research" as const,
    tags: ["fact-checking", "misinformation", "research", "verification", "media-literacy"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/ItzCrazyKns/Perplexica",
    homepageUrl: null,
    rules: makeRules([
      { id: "fc-src-1", dimension: "Source Quality", keywords: [".gov", ".edu", "who", "cdc", "nih", "nature", "science", "peer-reviewed", "pubmed"], conclusion: "authoritative_source", weight: 0.95 },
      { id: "fc-src-2", dimension: "Source Quality", keywords: ["blog", "social media", "tweet", "reddit", "anonymous", "unverified"], conclusion: "low_quality_source", weight: 0.9 },
      { id: "fc-evid-1", dimension: "Evidence", keywords: ["study shows", "according to", "data indicates", "research finds", "evidence suggests"], conclusion: "evidence_cited", weight: 0.85 },
      { id: "fc-cons-1", dimension: "Consensus", keywords: ["scientific consensus", "widely accepted", "majority of experts", "mainstream", "established"], conclusion: "consensus_check", weight: 0.9 },
      { id: "fc-cert-1", dimension: "Certainty Level", keywords: ["proven", "definitely", "always", "never", "100%", "guaranteed"], conclusion: "overclaiming_flag", weight: 0.85 },
      { id: "fc-cert-2", dimension: "Certainty Level", keywords: ["may", "might", "suggests", "indicates", "could", "preliminary"], conclusion: "appropriately_hedged", weight: 0.7 },
      { id: "fc-rec-1", dimension: "Recency", keywords: ["2024", "2025", "2026", "recent", "latest", "new study"], conclusion: "recency_check", weight: 0.75 },
      { id: "fc-coi-1", dimension: "Conflict of Interest", keywords: ["funded by", "sponsored by", "industry", "manufacturer", "conflict of interest"], conclusion: "conflict_of_interest_flag", weight: 0.9 },
    ]),
  },

  // ── W1: Web Page Extractor ────────────────────────────────────────────────
  {
    packageId: "web-page-extractor",
    version: "1.0.0",
    displayName: "Web Page Content Extractor",
    description:
      "Extracts and structures web page content (tables, lists, articles, prices, contacts) using Playwright/Browser-use patterns. Handles pagination, auth, and dynamic content.",
    readme: `# Web Page Content Extractor

Production-ready web extraction patterns powered by browser automation.

## Inspired By

- [Browser-use](https://github.com/browser-use/browser-use) — AI-native browser automation
- [Playwright MCP](https://github.com/microsoft/playwright-mcp) — official Playwright MCP server

## Content Types

| Type | Strategy | Output |
|------|---------|--------|
| Articles | Readability extraction | Clean markdown |
| Tables | Row/column parsing | CSV/JSON |
| Products | Schema.org + custom | Structured JSON |
| Contacts | NER + heuristics | vCard format |
| PDFs | Text layer extraction | Plain text |

## Extraction Dimensions

- **Content Type**: Identifies the dominant content pattern
- **Pagination**: Detects next-page, infinite scroll, load-more
- **Auth Requirements**: Flags login walls, cookie requirements
- **Rate Limiting**: Recommends delays and retry strategies
- **Compliance**: robots.txt and ToS awareness`,
    authorName: "Community Automation",
    category: "automation" as const,
    tags: ["web-scraping", "data-extraction", "playwright", "browser-use", "automation"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/browser-use/browser-use",
    homepageUrl: null,
    rules: makeRules([
      { id: "wx-type-1", dimension: "Content Type", keywords: ["article", "blog", "news", "post", "story"], conclusion: "content_article", weight: 0.85 },
      { id: "wx-type-2", dimension: "Content Type", keywords: ["table", "grid", "spreadsheet", "comparison", "pricing table"], conclusion: "content_table", weight: 0.9 },
      { id: "wx-type-3", dimension: "Content Type", keywords: ["product", "price", "add to cart", "shop", "buy", "sku"], conclusion: "content_product", weight: 0.9 },
      { id: "wx-type-4", dimension: "Content Type", keywords: ["contact", "email", "phone", "address", "team", "directory"], conclusion: "content_contact", weight: 0.85 },
      { id: "wx-pagi-1", dimension: "Pagination", keywords: ["next page", "load more", "infinite scroll", "pagination", "page 1 of"], conclusion: "pagination_detected", weight: 0.9 },
      { id: "wx-auth-1", dimension: "Authentication", keywords: ["login", "sign in", "log in", "cookie", "session", "paywall"], conclusion: "auth_required", weight: 0.95 },
      { id: "wx-rate-1", dimension: "Rate Limiting", keywords: ["rate limit", "too many requests", "throttle", "429", "captcha"], conclusion: "rate_limit_handling", weight: 0.9 },
      { id: "wx-comp-1", dimension: "Compliance", keywords: ["robots.txt", "terms of service", "scraping", "crawl", "disallow"], conclusion: "compliance_check", weight: 0.8 },
    ]),
  },

  // ── W2: E-commerce Price Monitor ──────────────────────────────────────────
  {
    packageId: "ecommerce-price-monitor",
    version: "1.0.0",
    displayName: "E-commerce Price Monitor",
    description:
      "Monitors product prices across e-commerce platforms, detects discounts, tracks historical trends, and triggers configurable alerts. Multi-platform support.",
    readme: `# E-commerce Price Monitor

Track prices, catch deals, and automate purchasing decisions.

## Inspired By

- [Camelcamelcamel](https://camelcamelcamel.com) — Amazon price tracker
- Open-source: [Playwright](https://playwright.dev) + custom scrapers

## Supported Platforms

Amazon, eBay, Shopify stores, Etsy, AliExpress, Best Buy, Walmart, Newegg

## Features

- **Multi-variant tracking**: Colors, sizes, bundles
- **Historical charting**: Price over time with lowest-ever highlight
- **Alert rules**: Drop below X, % discount, back-in-stock
- **Coupon detection**: Automatic coupon and deal stacking
- **Availability**: In-stock, limited quantity, pre-order

## Output Format

\`\`\`json
{
  "product": "...", "currentPrice": 49.99, "lowestEver": 39.99,
  "priceHistory": [...], "alert": "20% below average"
}
\`\`\``,
    authorName: "Community Automation",
    category: "automation" as const,
    tags: ["ecommerce", "price-tracking", "shopping", "automation", "comparison", "deals"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "pm-price-1", dimension: "Price Detection", keywords: ["$", "€", "£", "price", "cost", "msrp", "retail"], conclusion: "price_detected", weight: 0.95 },
      { id: "pm-disc-1", dimension: "Discount", keywords: ["sale", "discount", "off", "%", "deal", "coupon", "promo", "clearance"], conclusion: "discount_detected", weight: 0.9 },
      { id: "pm-prod-1", dimension: "Product Identity", keywords: ["sku", "asin", "model", "upc", "isbn", "barcode", "mpn"], conclusion: "product_identified", weight: 0.9 },
      { id: "pm-alert-1", dimension: "Alert Config", keywords: ["alert when", "notify", "drop below", "threshold", "trigger when"], conclusion: "alert_configured", weight: 0.85 },
      { id: "pm-hist-1", dimension: "History", keywords: ["historical", "price history", "trend", "lowest ever", "chart", "average price"], conclusion: "history_tracked", weight: 0.8 },
      { id: "pm-avail-1", dimension: "Availability", keywords: ["in stock", "out of stock", "limited", "low quantity", "back order", "pre-order"], conclusion: "availability_tracked", weight: 0.85 },
      { id: "pm-var-1", dimension: "Variants", keywords: ["color", "size", "model", "bundle", "variant", "option", "configuration"], conclusion: "variant_handling", weight: 0.75 },
    ]),
  },

  // ── W5: Website UX Auditor ────────────────────────────────────────────────
  {
    packageId: "website-ux-auditor",
    version: "1.0.0",
    displayName: "Website UX Auditor",
    description:
      "Audits websites for UX issues, accessibility violations, Core Web Vitals, navigation problems, and mobile responsiveness. Inspired by Google Lighthouse.",
    readme: `# Website UX Auditor

Comprehensive UX and accessibility audit based on industry standards.

## Inspired By

- [Google Lighthouse](https://github.com/GoogleChrome/lighthouse) — open-source web audit
- WCAG 2.1 accessibility guidelines
- Nielsen's 10 Usability Heuristics

## Audit Dimensions

| Dimension | Standard | What's checked |
|-----------|---------|----------------|
| Accessibility | WCAG 2.1 AA | Alt text, ARIA, contrast, keyboard nav |
| Performance | Core Web Vitals | LCP, CLS, FID/INP |
| Navigation | Nielsen's heuristics | Breadcrumbs, 404s, sitemap |
| Mobile | Google Mobile-Friendly | Responsive, touch targets |
| Content | Readability | Flesch score, broken links |
| Security | Mozilla Observatory | HTTPS, CSP headers |

## Scoring

Each dimension scored 0-100 with prioritized issue list and fix recommendations.`,
    authorName: "Community Automation",
    category: "automation" as const,
    tags: ["ux", "accessibility", "performance", "lighthouse", "web-vitals", "wcag"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/GoogleChrome/lighthouse",
    homepageUrl: null,
    rules: makeRules([
      { id: "ux-a11y-1", dimension: "Accessibility", keywords: ["alt text", "aria", "aria-label", "role", "tabindex", "keyboard", "screen reader"], conclusion: "accessibility_issue", weight: 0.95 },
      { id: "ux-a11y-2", dimension: "Accessibility", keywords: ["contrast", "color ratio", "wcag", "aa", "aaa"], conclusion: "contrast_issue", weight: 0.9 },
      { id: "ux-perf-1", dimension: "Performance", keywords: ["lcp", "cls", "fid", "inp", "core web vitals", "load time", "ttfb"], conclusion: "performance_metric", weight: 0.9 },
      { id: "ux-perf-2", dimension: "Performance", keywords: ["image size", "uncompressed", "render blocking", "javascript bundle", "css"], conclusion: "performance_optimization", weight: 0.85 },
      { id: "ux-nav-1", dimension: "Navigation", keywords: ["breadcrumb", "404", "broken link", "dead end", "back button", "sitemap"], conclusion: "navigation_issue", weight: 0.85 },
      { id: "ux-mob-1", dimension: "Mobile", keywords: ["responsive", "viewport", "touch target", "mobile", "tap area", "pinch"], conclusion: "mobile_issue", weight: 0.85 },
      { id: "ux-form-1", dimension: "Forms", keywords: ["label", "form validation", "error message", "autocomplete", "required", "input"], conclusion: "form_accessibility", weight: 0.8 },
      { id: "ux-sec-1", dimension: "Security Headers", keywords: ["https", "csp", "mixed content", "hsts", "x-frame-options"], conclusion: "security_header_check", weight: 0.75 },
    ]),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PRIORITY 3 — ⭐⭐ Remaining (13 skills)
  // ─────────────────────────────────────────────────────────────────────────

  // ── R2: Competitive Intelligence Researcher ───────────────────────────────
  {
    packageId: "competitive-intelligence",
    version: "1.0.0",
    displayName: "Competitive Intelligence Researcher",
    description:
      "Analyzes competitors across features, pricing, positioning, strengths, weaknesses, and market share. Produces structured battle cards and differentiation insights.",
    readme: `# Competitive Intelligence Researcher

Systematic framework for understanding your competitive landscape.

## Output: Battle Card

\`\`\`
Company: [Name]
Positioning: [1-line tagline analysis]
Pricing: [tier structure + price points]
Strengths: [top 3-5]
Weaknesses: [top 3-5]
Target Segment: [ICP description]
Key Differentiators vs Us: [...]
Win/Loss Signals: [...]
\`\`\`

## Evaluation Dimensions

- **Features**: Capability comparison matrix
- **Pricing**: Model, tiers, value perception
- **Positioning**: Messaging, target audience, channel mix
- **Moat**: Network effects, switching costs, IP, data
- **Market Signals**: Funding, hiring, partnerships, press`,
    authorName: "Community Research",
    category: "research" as const,
    tags: ["competitive-analysis", "market-research", "strategy", "business-intelligence", "gtm"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "ci-feat-1", dimension: "Features", keywords: ["feature", "capability", "function", "supports", "integrates", "comparison"], conclusion: "feature_analysis", weight: 0.85 },
      { id: "ci-price-1", dimension: "Pricing", keywords: ["pricing", "plan", "tier", "freemium", "enterprise", "per seat", "per month"], conclusion: "pricing_model_analyzed", weight: 0.9 },
      { id: "ci-pos-1", dimension: "Positioning", keywords: ["tagline", "mission", "positioning", "target", "icp", "customer segment"], conclusion: "positioning_identified", weight: 0.85 },
      { id: "ci-moat-1", dimension: "Moat", keywords: ["moat", "network effect", "switching cost", "lock-in", "patent", "proprietary"], conclusion: "moat_assessed", weight: 0.9 },
      { id: "ci-sw-1", dimension: "Weaknesses", keywords: ["weakness", "gap", "complaint", "review", "downside", "limitation", "missing"], conclusion: "weakness_identified", weight: 0.85 },
      { id: "ci-sig-1", dimension: "Market Signals", keywords: ["funding", "raised", "acquisition", "partnership", "hiring", "expansion", "layoffs"], conclusion: "market_signal_detected", weight: 0.8 },
    ]),
  },

  // ── W3: Social Media Profile Analyzer ────────────────────────────────────
  {
    packageId: "social-media-analyzer",
    version: "1.0.0",
    displayName: "Social Media Profile Analyzer",
    description:
      "Analyzes social media profiles and content strategies for engagement rates, audience quality, posting patterns, niche authority, and growth trajectory.",
    readme: `# Social Media Profile Analyzer

Data-driven evaluation of social media presence and content strategy.

## Supported Platforms

Twitter/X, LinkedIn, Instagram, TikTok, YouTube, Threads, Bluesky

## Metrics Evaluated

| Metric | Formula | Benchmark |
|--------|---------|-----------|
| Engagement Rate | (likes+comments+shares)/followers | >3% good, >6% excellent |
| Posting Frequency | posts per week | Platform-dependent |
| Audience Quality | Real vs bot ratio estimate | >80% real |
| Content Mix | Educational/Promotional/Personal | 70/20/10 rule |
| Growth Velocity | Follower growth rate % | |

## Evaluation Dimensions

- **Engagement**: Interaction rates vs platform norms
- **Content Strategy**: Value delivery, consistency, variety
- **Niche Authority**: Topic focus, expertise signals
- **Audience Quality**: Engagement authenticity
- **Growth**: Trajectory and velocity`,
    authorName: "Community Data",
    category: "data" as const,
    tags: ["social-media", "influencer", "analytics", "marketing", "audience", "content-strategy"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "sm-eng-1", dimension: "Engagement", keywords: ["engagement rate", "likes", "comments", "shares", "saves", "views"], conclusion: "engagement_calculated", weight: 0.95 },
      { id: "sm-eng-2", dimension: "Engagement", keywords: ["low engagement", "bot", "fake", "purchased", "spam comments"], conclusion: "authenticity_flag", weight: 0.9 },
      { id: "sm-cont-1", dimension: "Content Strategy", keywords: ["educational", "tutorial", "how to", "tips", "insights", "thread"], conclusion: "value_content_present", weight: 0.85 },
      { id: "sm-cont-2", dimension: "Content Strategy", keywords: ["promotional", "ad", "sponsored", "buy now", "discount", "affiliate"], conclusion: "promotional_ratio_check", weight: 0.8 },
      { id: "sm-nich-1", dimension: "Niche Authority", keywords: ["expert", "authority", "known for", "specialized", "niche", "focused"], conclusion: "niche_authority", weight: 0.8 },
      { id: "sm-freq-1", dimension: "Posting Frequency", keywords: ["posts per", "frequency", "consistent", "daily", "weekly", "schedule"], conclusion: "posting_frequency_assessed", weight: 0.75 },
      { id: "sm-grow-1", dimension: "Growth", keywords: ["growing", "viral", "trending", "gained", "followers", "growth"], conclusion: "growth_trajectory", weight: 0.8 },
    ]),
  },

  // ── C1: SQL Query Optimizer ────────────────────────────────────────────────
  {
    packageId: "sql-query-optimizer",
    version: "1.0.0",
    displayName: "SQL Query Optimizer",
    description:
      "Analyzes SQL queries for performance issues: N+1 problems, missing indexes, subquery inefficiencies, and join strategies. Provides rewritten optimized queries.",
    readme: `# SQL Query Optimizer

Expert SQL performance analysis and rewriting for PostgreSQL, MySQL, and SQLite.

## Inspired By

- [pganalyze](https://pganalyze.com) — Postgres monitoring (open explain plans)
- [USE THE INDEX, LUKE](https://use-the-index-luke.com) — SQL indexing guide

## Anti-Patterns Detected

| Pattern | Impact | Fix |
|---------|--------|-----|
| N+1 queries | Very High | JOIN or batch fetch |
| Missing index | High | CREATE INDEX recommendation |
| SELECT * | Medium | Explicit column list |
| Correlated subquery | High | Rewrite as JOIN/CTE |
| OFFSET pagination | High | Cursor-based pagination |
| Missing LIMIT | Medium | Add LIMIT clause |
| Non-SARGable predicate | High | Rewrite for index use |

## Output

Original query → EXPLAIN ANALYZE recommendation → optimized query + index DDL`,
    authorName: "Community Dev",
    category: "development" as const,
    tags: ["sql", "database", "performance", "optimization", "postgresql", "query-tuning"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "sq-n1-1", dimension: "N+1 Detection", keywords: ["loop", "for each", "per row", "n+1", "orm", "lazy load"], conclusion: "n_plus_one_risk", weight: 1.0 },
      { id: "sq-idx-1", dimension: "Missing Index", keywords: ["where", "join on", "order by", "group by", "filter"], conclusion: "index_candidate", weight: 0.9 },
      { id: "sq-sel-1", dimension: "SELECT *", keywords: ["select *", "select all"], conclusion: "select_star_antipattern", weight: 0.8 },
      { id: "sq-sub-1", dimension: "Subquery", keywords: ["subquery", "nested select", "select in select", "correlated"], conclusion: "subquery_optimization", weight: 0.85 },
      { id: "sq-pag-1", dimension: "Pagination", keywords: ["offset", "limit offset", "page", "skip"], conclusion: "offset_pagination_issue", weight: 0.8 },
      { id: "sq-sarg-1", dimension: "SARGable", keywords: ["function(column", "lower(", "upper(", "cast(", "date("], conclusion: "non_sargable_predicate", weight: 0.9 },
      { id: "sq-null-1", dimension: "NULL Handling", keywords: ["is null", "is not null", "coalesce", "nullif"], conclusion: "null_handling_check", weight: 0.7 },
      { id: "sq-txn-1", dimension: "Transaction", keywords: ["transaction", "commit", "rollback", "lock", "deadlock", "for update"], conclusion: "transaction_pattern_check", weight: 0.75 },
    ]),
  },

  // ── C2: Docker Security Auditor ───────────────────────────────────────────
  {
    packageId: "docker-security-auditor",
    version: "1.0.0",
    displayName: "Docker & Container Security Auditor",
    description:
      "Audits Dockerfiles and docker-compose configurations for security vulnerabilities, best practice violations, and supply chain risks. Based on Hadolint and Trivy rules.",
    readme: `# Docker & Container Security Auditor

Security-first review of container configurations.

## Inspired By

- [Hadolint](https://github.com/hadolint/hadolint) — Dockerfile linter (Apache 2.0)
- [Trivy](https://github.com/aquasecurity/trivy) — container vulnerability scanner (Apache 2.0)
- [Docker CIS Benchmark](https://www.cisecurity.org/benchmark/docker)

## Critical Issues Detected

| Issue | Severity | Rule |
|-------|---------|------|
| Running as root | Critical | USER instruction missing |
| Secrets in ENV/ARG | Critical | Secret management violation |
| Unpinned base image | High | FROM ubuntu:latest |
| COPY . . (everything) | High | Over-broad file inclusion |
| No HEALTHCHECK | Medium | Container observability |
| Exposed sensitive port | High | EXPOSE 22, 3306 without justification |
| ADD vs COPY | Low | Use COPY for local files |

## Output

Severity-ranked finding list with Dockerfile line references and fix suggestions.`,
    authorName: "Community Security",
    category: "security" as const,
    tags: ["docker", "security", "containers", "devops", "hadolint", "trivy", "devsecops"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/hadolint/hadolint",
    homepageUrl: null,
    rules: makeRules([
      { id: "dk-root-1", dimension: "Privilege", keywords: ["user root", "run as root", "no user", "uid 0"], conclusion: "root_user_risk", weight: 1.0 },
      { id: "dk-sec-1", dimension: "Secrets", keywords: ["env password", "env secret", "env api_key", "arg token", "arg password"], conclusion: "secret_in_image", weight: 1.0 },
      { id: "dk-pin-1", dimension: "Image Pinning", keywords: ["latest", ":stable", "FROM ubuntu", "FROM node", "FROM python"], conclusion: "unpinned_base_image", weight: 0.9 },
      { id: "dk-copy-1", dimension: "File Inclusion", keywords: ["copy . .", "copy ./ /", "add . ."], conclusion: "overbroad_copy", weight: 0.85 },
      { id: "dk-hlt-1", dimension: "Healthcheck", keywords: ["healthcheck", "health check"], conclusion: "healthcheck_missing", weight: 0.75 },
      { id: "dk-port-1", dimension: "Port Exposure", keywords: ["expose 22", "expose 3306", "expose 5432", "expose 27017"], conclusion: "sensitive_port_exposed", weight: 0.9 },
      { id: "dk-add-1", dimension: "Dockerfile Instructions", keywords: ["add http", "add ftp", "add s3"], conclusion: "add_vs_copy_recommendation", weight: 0.7 },
      { id: "dk-layer-1", dimension: "Layer Optimization", keywords: ["run apt-get", "run yum", "run apk", "npm install"], conclusion: "layer_caching_optimization", weight: 0.65 },
    ]),
  },

  // ── C5: Algorithm Complexity Analyzer ─────────────────────────────────────
  {
    packageId: "algorithm-complexity-analyzer",
    version: "1.0.0",
    displayName: "Algorithm Complexity Analyzer",
    description:
      "Analyzes code snippets for time and space complexity (Big-O notation). Identifies optimization opportunities and explains complexity trade-offs.",
    readme: `# Algorithm Complexity Analyzer

Automatic Big-O analysis with optimization recommendations.

## Complexity Classes Detected

| Complexity | Example | Verdict |
|-----------|---------|---------|
| O(1) | Hash lookup, array index | Excellent |
| O(log n) | Binary search | Very Good |
| O(n) | Linear scan | Good |
| O(n log n) | Merge sort | Acceptable |
| O(n²) | Nested loops | Caution |
| O(2ⁿ) | Recursive Fibonacci | Avoid |
| O(n!) | Permutation brute force | Critical |

## Analysis Output

\`\`\`
Time Complexity: O(n²) — Nested loop on lines 5-12
Space Complexity: O(n) — Result array grows linearly
Bottleneck: Inner loop iterates n times per outer iteration
Optimization: Use a hash map to reduce to O(n)
\`\`\``,
    authorName: "Community Dev",
    category: "development" as const,
    tags: ["algorithms", "complexity", "big-o", "performance", "computer-science", "optimization"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "ac-n2-1", dimension: "Quadratic", keywords: ["for loop", "nested loop", "for i for j", "double loop", "n squared"], conclusion: "o_n_squared", weight: 0.95 },
      { id: "ac-n3-1", dimension: "Cubic", keywords: ["triple loop", "three nested", "n cubed"], conclusion: "o_n_cubed", weight: 0.98 },
      { id: "ac-log-1", dimension: "Logarithmic", keywords: ["binary search", "divide and conquer", "mid", "log n", "halve"], conclusion: "o_log_n", weight: 0.9 },
      { id: "ac-hash-1", dimension: "Constant", keywords: ["hashmap", "dictionary", "set lookup", "hash table", "o(1)"], conclusion: "o_constant", weight: 0.85 },
      { id: "ac-rec-1", dimension: "Recursion", keywords: ["recursive", "recursion", "fibonacci", "factorial", "backtrack"], conclusion: "recursion_complexity_check", weight: 0.9 },
      { id: "ac-sort-1", dimension: "Sorting", keywords: ["sort", "sorted", "order by", "quicksort", "mergesort", "heapsort"], conclusion: "o_n_log_n", weight: 0.85 },
      { id: "ac-mem-1", dimension: "Space Complexity", keywords: ["array", "list", "buffer", "copy", "clone", "cache", "memo"], conclusion: "space_complexity_check", weight: 0.8 },
    ]),
  },

  // ── C6: Test Case Generator ────────────────────────────────────────────────
  {
    packageId: "test-case-generator",
    version: "1.0.0",
    displayName: "Test Case Generator",
    description:
      "Generates comprehensive test cases using boundary value analysis, equivalence partitioning, and property-based testing strategies. Framework-agnostic (Jest, Vitest, pytest, Go testing).",
    readme: `# Test Case Generator

Systematic test case generation using proven QA methodologies.

## Testing Strategies

| Strategy | When to use | Example |
|---------|------------|---------|
| Boundary Value | Ranges, limits | age: -1, 0, 1, 17, 18, 19, 99, 100, 101 |
| Equivalence Class | Valid/invalid groups | valid email, invalid email, empty |
| Error Guessing | Common bugs | null, undefined, empty string, 0, NaN |
| Property-Based | Invariants | output length always ≤ input length |
| Happy Path | Normal flow | typical valid input |
| Edge Cases | Extremes | max int, empty array, unicode |

## Inspired By

- [Hypothesis](https://hypothesis.readthedocs.io) — Python property-based testing
- [fast-check](https://github.com/dubzzz/fast-check) — TypeScript PBT library`,
    authorName: "Community Dev",
    category: "development" as const,
    tags: ["testing", "tdd", "unit-tests", "boundary-testing", "qa", "test-generation"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/dubzzz/fast-check",
    homepageUrl: null,
    rules: makeRules([
      { id: "tc-bva-1", dimension: "Boundary Values", keywords: ["min", "max", "minimum", "maximum", "range", "limit", "threshold"], conclusion: "boundary_test_needed", weight: 0.95 },
      { id: "tc-null-1", dimension: "Null/Edge Cases", keywords: ["null", "undefined", "empty", "none", "0", "nan", "infinity"], conclusion: "null_edge_case", weight: 0.9 },
      { id: "tc-err-1", dimension: "Error Cases", keywords: ["invalid", "error", "exception", "throw", "fail", "reject", "bad input"], conclusion: "error_case_needed", weight: 0.9 },
      { id: "tc-happy-1", dimension: "Happy Path", keywords: ["valid", "success", "expected", "normal", "typical", "standard"], conclusion: "happy_path_test", weight: 0.8 },
      { id: "tc-async-1", dimension: "Async", keywords: ["async", "await", "promise", "callback", "timeout", "concurrent"], conclusion: "async_test_patterns", weight: 0.85 },
      { id: "tc-mock-1", dimension: "Mocking", keywords: ["mock", "stub", "spy", "fake", "dependency", "external service"], conclusion: "mock_strategy", weight: 0.8 },
      { id: "tc-prop-1", dimension: "Property-Based", keywords: ["invariant", "property", "forall", "arbitrary", "generator"], conclusion: "property_based_test", weight: 0.75 },
    ]),
  },

  // ── C7: React Component Reviewer ──────────────────────────────────────────
  {
    packageId: "react-component-reviewer",
    version: "1.0.0",
    displayName: "React Component Reviewer",
    description:
      "Reviews React components for hooks rule violations, performance anti-patterns, accessibility issues, and state management best practices. React 18+ and Server Components aware.",
    readme: `# React Component Reviewer

Production-grade React code review for modern React (v18+).

## Review Dimensions

| Dimension | Examples |
|-----------|---------|
| Hooks Rules | Conditional hooks, wrong dependency arrays |
| Performance | Missing memo/useCallback, unnecessary re-renders |
| Accessibility | Missing ARIA, non-semantic HTML, keyboard nav |
| State Management | Prop drilling, over-lifting, derived state |
| Server Components | Client/server boundary violations |
| Error Boundaries | Missing error handling |

## Common Issues Detected

- useEffect with missing or incorrect dependencies
- Creating functions/objects in render (causes re-renders)
- Missing \`key\` props in lists
- Using index as \`key\` in dynamic lists
- Direct state mutation
- Missing \`loading\` and \`error\` states for async ops`,
    authorName: "Community Dev",
    category: "development" as const,
    tags: ["react", "frontend", "hooks", "performance", "accessibility", "typescript"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "rc-hook-1", dimension: "Hooks Rules", keywords: ["if (", "usestate", "useeffect", "conditional", "loop"], conclusion: "conditional_hook_violation", weight: 1.0 },
      { id: "rc-dep-1", dimension: "Dependencies", keywords: ["useeffect", "usecallback", "usememo", "[]", "dependency"], conclusion: "dependency_array_check", weight: 0.95 },
      { id: "rc-perf-1", dimension: "Performance", keywords: ["usememo", "usecallback", "react.memo", "unnecessary render", "rerender"], conclusion: "memoization_opportunity", weight: 0.85 },
      { id: "rc-key-1", dimension: "List Keys", keywords: ["map(", ".map(", "key=", "index as key", "key={index}"], conclusion: "key_prop_check", weight: 0.9 },
      { id: "rc-a11y-1", dimension: "Accessibility", keywords: ["aria", "role", "alt", "tabindex", "label", "button", "input"], conclusion: "accessibility_check", weight: 0.9 },
      { id: "rc-state-1", dimension: "State Management", keywords: ["prop drilling", "context", "useState", "derived state", "usereducer"], conclusion: "state_pattern_check", weight: 0.8 },
      { id: "rc-err-1", dimension: "Error Handling", keywords: ["error boundary", "try catch", "error state", "loading state", "suspense"], conclusion: "error_boundary_check", weight: 0.85 },
    ]),
  },

  // ── O2: Email Triage & Draft ───────────────────────────────────────────────
  {
    packageId: "email-triage-drafter",
    version: "1.0.0",
    displayName: "Email Triage & Smart Drafter",
    description:
      "Classifies incoming emails by urgency, required action, and topic. Generates appropriately-toned draft replies with optimal length and structure.",
    readme: `# Email Triage & Smart Drafter

Two-phase email intelligence: Triage → Draft.

## Phase 1: Triage

\`\`\`
Priority:  🔴 Urgent / 🟡 Normal / 🟢 Low
Action:    Reply needed / FYI only / Action item / Archive
Deadline:  [extracted date or "none"]
Topic:     [category]
\`\`\`

## Phase 2: Draft

Generates a reply matching:
- **Tone**: Formal / Professional / Casual (auto-detected from original)
- **Length**: Concise (<100w) / Standard (100-250w) / Detailed (>250w)
- **Format**: Bullets for action items, prose for relationship emails

## Inspired By

Email AI assistants: SaneBox, Superhuman — open inbox patterns`,
    authorName: "Community Productivity",
    category: "productivity" as const,
    tags: ["email", "productivity", "communication", "drafting", "triage", "inbox-zero"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "em-urg-1", dimension: "Urgency", keywords: ["urgent", "asap", "immediately", "critical", "emergency", "deadline today"], conclusion: "high_priority", weight: 1.0 },
      { id: "em-urg-2", dimension: "Urgency", keywords: ["when you get a chance", "no rush", "fyi", "whenever possible"], conclusion: "low_priority", weight: 0.85 },
      { id: "em-act-1", dimension: "Action Required", keywords: ["please", "can you", "could you", "action required", "need you to", "waiting for"], conclusion: "action_needed", weight: 0.9 },
      { id: "em-tone-1", dimension: "Tone", keywords: ["dear", "sincerely", "regards", "formal", "to whom it may concern"], conclusion: "formal_tone", weight: 0.85 },
      { id: "em-tone-2", dimension: "Tone", keywords: ["hey", "hi there", "cheers", "thanks!", "awesome", "!"], conclusion: "casual_tone", weight: 0.8 },
      { id: "em-len-1", dimension: "Reply Length", keywords: ["quick question", "yes or no", "confirm", "brief update"], conclusion: "short_reply_appropriate", weight: 0.8 },
      { id: "em-len-2", dimension: "Reply Length", keywords: ["detailed explanation", "elaborate", "thorough", "comprehensive review"], conclusion: "long_reply_appropriate", weight: 0.75 },
    ]),
  },

  // ── O4: Project Risk Assessor ──────────────────────────────────────────────
  {
    packageId: "project-risk-assessor",
    version: "1.0.0",
    displayName: "Project Risk Assessor",
    description:
      "Identifies, classifies, and prioritizes project risks across timeline, budget, technical, people, and external dimensions. Based on PMBOK risk management framework.",
    readme: `# Project Risk Assessor

Structured risk identification and mitigation planning based on PMI/PMBOK standards.

## Risk Matrix

\`\`\`
         │ Low Impact │ Med Impact │ High Impact
─────────┼────────────┼────────────┼────────────
High Prob│  Monitor   │  Mitigate  │  Avoid/Transfer
Med Prob │  Accept    │  Monitor   │  Mitigate
Low Prob │  Accept    │  Accept    │  Monitor
\`\`\`

## Risk Categories (PMBOK)

- **Technical**: Technology complexity, integration, innovation risk
- **Timeline**: Dependencies, critical path, buffer adequacy
- **Budget**: Estimation accuracy, scope creep, resource costs
- **People**: Key person dependency, skills gap, turnover
- **External**: Regulatory, market, vendor, third-party

## Output

Risk register with: ID, category, description, probability (1-5), impact (1-5), score, owner, mitigation strategy`,
    authorName: "Community Productivity",
    category: "productivity" as const,
    tags: ["project-management", "risk", "pmbok", "planning", "enterprise", "pmi"],
    maturity: "stable" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "pr-tech-1", dimension: "Technical Risk", keywords: ["new technology", "unproven", "integration", "complexity", "technical debt", "prototype"], conclusion: "technical_risk_high", weight: 0.9 },
      { id: "pr-time-1", dimension: "Timeline Risk", keywords: ["tight deadline", "dependency", "critical path", "no buffer", "parallel tracks"], conclusion: "timeline_risk", weight: 0.9 },
      { id: "pr-budg-1", dimension: "Budget Risk", keywords: ["over budget", "cost overrun", "scope creep", "estimate", "contingency"], conclusion: "budget_risk", weight: 0.85 },
      { id: "pr-peop-1", dimension: "People Risk", keywords: ["key person", "single point of failure", "turnover", "skills gap", "vendor dependency"], conclusion: "people_risk", weight: 0.9 },
      { id: "pr-ext-1", dimension: "External Risk", keywords: ["regulatory", "compliance", "market change", "third party", "vendor", "api dependency"], conclusion: "external_risk", weight: 0.8 },
      { id: "pr-mit-1", dimension: "Mitigation", keywords: ["mitigation", "contingency", "backup plan", "fallback", "risk owner", "monitoring"], conclusion: "mitigation_strategy_present", weight: 0.85 },
    ]),
  },

  // ── O5: Resume & LinkedIn Optimizer ───────────────────────────────────────
  {
    packageId: "resume-optimizer",
    version: "1.0.0",
    displayName: "Resume & LinkedIn Optimizer",
    description:
      "Optimizes resumes and LinkedIn profiles for ATS systems, keyword matching against job descriptions, STAR impact statements, and recruiter readability.",
    readme: `# Resume & LinkedIn Optimizer

Beat the ATS and impress human reviewers.

## Two Modes

### Mode 1: JD Match Analysis
Paste your resume + job description → keyword gap analysis + rewrite suggestions.

### Mode 2: General Optimization
Submit resume only → ATS formatting, impact quantification, structure review.

## What's Evaluated

| Dimension | What it checks |
|-----------|---------------|
| ATS Compatibility | Formatting, file type, special characters, tables |
| Keyword Density | JD keyword coverage, missing skills |
| Impact Statements | Quantified achievements (%, $, x faster) |
| STAR Format | Situation, Task, Action, Result structure |
| Skills Section | Tech stack completeness, recency |
| LinkedIn Completeness | All-Star profile checklist |`,
    authorName: "Community Productivity",
    category: "productivity" as const,
    tags: ["resume", "linkedin", "career", "job-search", "ats", "job-hunting"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "rv-ats-1", dimension: "ATS Compatibility", keywords: ["table", "image", "header", "footer", "text box", "column", "special character"], conclusion: "ats_formatting_risk", weight: 0.9 },
      { id: "rv-kw-1", dimension: "Keywords", keywords: ["skill", "technology", "tool", "framework", "certification", "language"], conclusion: "keyword_coverage_check", weight: 0.9 },
      { id: "rv-imp-1", dimension: "Impact", keywords: ["%", "increased", "reduced", "improved", "grew", "saved", "$", "x faster", "million"], conclusion: "quantified_achievement", weight: 0.95 },
      { id: "rv-star-1", dimension: "STAR Format", keywords: ["result", "outcome", "achieved", "delivered", "led", "implemented", "designed"], conclusion: "star_structure_check", weight: 0.85 },
      { id: "rv-gap-1", dimension: "Gap Analysis", keywords: ["missing", "gap", "not mentioned", "required", "years of experience"], conclusion: "skill_gap_identified", weight: 0.85 },
      { id: "rv-li-1", dimension: "LinkedIn", keywords: ["summary", "headline", "about", "featured", "recommendations", "skills endorsements"], conclusion: "linkedin_completeness", weight: 0.75 },
    ]),
  },

  // ── CR2: Brand Voice Analyzer ─────────────────────────────────────────────
  {
    packageId: "brand-voice-analyzer",
    version: "1.0.0",
    displayName: "Brand Voice Analyzer",
    description:
      "Analyzes brand copy to extract voice, tone, and personality traits. Generates a Brand Voice & Tone guide that AI agents can use for consistent content creation.",
    readme: `# Brand Voice Analyzer

Extract your brand's DNA and encode it for consistent AI-generated content.

## What It Produces

\`\`\`yaml
brand_voice:
  personality: [3-5 adjectives, e.g., "bold, witty, approachable"]
  tone_spectrum:
    formal_casual: 30/70          # 0=formal, 100=casual
    serious_playful: 40/60
    authoritative_empathetic: 60/40
  vocabulary:
    use: ["innovative", "together", "future"]
    avoid: ["leverage", "synergy", "utilize"]
  sentence_style: "Short punchy sentences. No jargon."
  examples:
    - before: "We provide solutions..."
      after: "We fix the thing that's been slowing you down."
\`\`\`

## Dimensions

- **Personality Traits**: Core character adjectives
- **Tone Spectrum**: Where on each scale the brand sits
- **Vocabulary**: Power words vs words to avoid
- **Sentence Style**: Length, complexity, structure`,
    authorName: "Community Creative",
    category: "communication" as const,
    tags: ["branding", "copywriting", "tone-of-voice", "marketing", "content-strategy", "ai-content"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "bv-pers-1", dimension: "Personality", keywords: ["bold", "playful", "professional", "friendly", "authoritative", "innovative", "approachable"], conclusion: "personality_trait_detected", weight: 0.85 },
      { id: "bv-tone-1", dimension: "Formal/Casual", keywords: ["dear", "sincerely", "hereby", "please note", "we are pleased"], conclusion: "formal_tone_signal", weight: 0.85 },
      { id: "bv-tone-2", dimension: "Formal/Casual", keywords: ["hey", "awesome", "cool", "just", "really", "let's", "you've got"], conclusion: "casual_tone_signal", weight: 0.85 },
      { id: "bv-jarg-1", dimension: "Jargon", keywords: ["leverage", "synergy", "paradigm", "utilize", "holistic", "bandwidth", "circle back"], conclusion: "jargon_detected", weight: 0.8 },
      { id: "bv-sent-1", dimension: "Sentence Style", keywords: ["long sentence", "complex", "comma", "clause", "however", "furthermore", "additionally"], conclusion: "complex_sentence_style", weight: 0.75 },
      { id: "bv-cta-1", dimension: "CTA Style", keywords: ["try now", "get started", "join us", "sign up free", "learn more"], conclusion: "cta_style_analyzed", weight: 0.75 },
    ]),
  },

  // ── CR4: SEO Article Outliner ──────────────────────────────────────────────
  {
    packageId: "seo-article-outliner",
    version: "1.0.0",
    displayName: "SEO Article Outliner",
    description:
      "Generates SEO-optimized article outlines with keyword strategy, heading structure, search intent alignment, E-E-A-T signals, and internal linking opportunities.",
    readme: `# SEO Article Outliner

Create content that ranks. Every outline is built around search intent and SERP analysis.

## Output Structure

\`\`\`
Target Keyword: [primary] | LSI: [related terms]
Search Intent: Informational / Commercial / Transactional / Navigational
Word Count Target: [based on SERP analysis]

H1: [Title optimized for CTR + keyword]
  H2: Introduction — hook + promise
  H2: [Core section 1]
    H3: [Sub-point]
  H2: [Core section 2]
  H2: FAQ (People Also Ask)
  H2: Conclusion + CTA

Internal Links: [suggested anchor text → target pages]
E-E-A-T Signals: [expert quotes, data citations needed]
Schema: [Article / FAQ / HowTo]
\`\`\`

## Based On

Google E-E-A-T guidelines, Surfer SEO methodology (replicated openly)`,
    authorName: "Community Creative",
    category: "productivity" as const,
    tags: ["seo", "content-marketing", "blogging", "keyword-research", "serp", "e-e-a-t"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "seo-kw-1", dimension: "Keyword Strategy", keywords: ["primary keyword", "target keyword", "search volume", "keyword density", "lsi", "related terms"], conclusion: "keyword_strategy_present", weight: 0.95 },
      { id: "seo-int-1", dimension: "Search Intent", keywords: ["informational", "commercial", "transactional", "navigational", "how to", "best", "buy"], conclusion: "intent_matched", weight: 0.9 },
      { id: "seo-head-1", dimension: "Heading Structure", keywords: ["h1", "h2", "h3", "heading", "subheading", "section"], conclusion: "heading_hierarchy_check", weight: 0.85 },
      { id: "seo-eat-1", dimension: "E-E-A-T", keywords: ["author", "expert", "experience", "authoritative", "trustworthy", "credentials", "citation"], conclusion: "eeat_signals", weight: 0.85 },
      { id: "seo-faq-1", dimension: "FAQ / PAA", keywords: ["faq", "people also ask", "question", "frequently asked", "common question"], conclusion: "faq_section_recommended", weight: 0.8 },
      { id: "seo-int-2", dimension: "Internal Links", keywords: ["internal link", "pillar page", "cluster", "anchor text", "related article"], conclusion: "internal_linking_strategy", weight: 0.8 },
      { id: "seo-sch-1", dimension: "Schema Markup", keywords: ["schema", "structured data", "json-ld", "article", "howto", "faqpage"], conclusion: "schema_markup_recommended", weight: 0.75 },
    ]),
  },

  // ── CR5: Pitch Deck Story Critic ──────────────────────────────────────────
  {
    packageId: "pitch-deck-critic",
    version: "1.0.0",
    displayName: "Pitch Deck Story Critic",
    description:
      "Evaluates startup pitch decks against Sequoia, YC, and top VC firm frameworks. Checks narrative flow, problem-solution fit, market sizing, traction, and the ask.",
    readme: `# Pitch Deck Story Critic

Your pitch gets 3 minutes. Make every slide count.

## Frameworks Applied

- **Sequoia Capital** — 10-slide structure
- **YC Demo Day** — Concise problem/solution/traction/ask
- **Guy Kawasaki** — 10/20/30 rule

## Ideal Deck Structure

| Slide | Purpose | Common Mistakes |
|-------|---------|-----------------|
| 1. Title | Who you are | Too vague |
| 2. Problem | Pain, market gap | No customer evidence |
| 3. Solution | Your answer | Feature list, not outcome |
| 4. Why Now | Timing thesis | Missing market tailwind |
| 5. Market | TAM/SAM/SOM | Naive top-down sizing |
| 6. Traction | Proof points | Vanity metrics |
| 7. Team | Domain expertise | No relevant background |
| 8. Business Model | Unit economics | No path to profitability |
| 9. Competition | Positioning | "No competitors" red flag |
| 10. Ask | Use of funds | Round size doesn't match plan |

## Evaluation Output

Per-slide score (1-5) + overall narrative score + top 3 improvements`,
    authorName: "Community Creative",
    category: "communication" as const,
    tags: ["startup", "pitch", "fundraising", "storytelling", "vc", "deck", "yc"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: null,
    homepageUrl: null,
    rules: makeRules([
      { id: "pd-prob-1", dimension: "Problem Clarity", keywords: ["problem", "pain point", "challenge", "gap", "frustration", "inefficiency"], conclusion: "problem_clearly_stated", weight: 0.95 },
      { id: "pd-prob-2", dimension: "Problem Evidence", keywords: ["customer", "user research", "interview", "survey", "quote", "evidence"], conclusion: "problem_evidence_present", weight: 0.9 },
      { id: "pd-mkt-1", dimension: "Market Size", keywords: ["tam", "sam", "som", "market size", "billion", "opportunity"], conclusion: "market_sized", weight: 0.9 },
      { id: "pd-mkt-2", dimension: "Market Sizing Method", keywords: ["bottom-up", "top-down", "addressable", "segment"], conclusion: "sizing_methodology_check", weight: 0.85 },
      { id: "pd-trac-1", dimension: "Traction", keywords: ["mrr", "arr", "users", "customers", "growth rate", "retention", "nps", "pilot"], conclusion: "traction_demonstrated", weight: 0.95 },
      { id: "pd-team-1", dimension: "Team", keywords: ["founder", "cto", "ceo", "experience", "background", "previous", "expert"], conclusion: "team_credibility", weight: 0.85 },
      { id: "pd-comp-1", dimension: "Competition", keywords: ["competitor", "alternative", "differentiation", "vs", "moat", "unfair advantage"], conclusion: "competitive_landscape", weight: 0.85 },
      { id: "pd-ask-1", dimension: "The Ask", keywords: ["raise", "seeking", "funding round", "use of funds", "runway", "milestones"], conclusion: "ask_clarity", weight: 0.9 },
      { id: "pd-now-1", dimension: "Why Now", keywords: ["timing", "tailwind", "trend", "regulation change", "technology shift", "market moment"], conclusion: "why_now_present", weight: 0.8 },
    ]),
  },

] as const;

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("Error: DATABASE_URL environment variable is required");
    process.exit(1);
  }
  const SEED_AUTHOR_ID = process.env.SEED_AUTHOR_ID || "usr_seed_author";

  console.log("Connecting to database...");
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });
  const packageDAL = new SkillPackageDAL(db);
  const ruleDAL = new SkillRuleDAL(db);

  console.log(
    `Seeding ${COMMUNITY_SKILLS.length} community skills with author: ${SEED_AUTHOR_ID}\n`,
  );
  console.log("Priority order:");
  console.log("  Priority 1 (⭐  immediately implementable): skills 1-8");
  console.log("  Priority 2 (⭐⭐ open-source validated):      skills 9-13");
  console.log("  Priority 3 (⭐⭐ remaining):                  skills 14-26\n");

  let created = 0;
  let skipped = 0;

  for (const [index, pkg] of COMMUNITY_SKILLS.entries()) {
    const existing = await packageDAL.getByPackageId(pkg.packageId);
    if (existing) {
      console.log(`  skip (${index + 1}/${COMMUNITY_SKILLS.length}): ${pkg.packageId}`);
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

    await ruleDAL.create({
      id: `rule_${now}_${Math.random().toString(36).slice(2, 8)}`,
      packageId: id,
      path: ".yigyaps/rules.json",
      content: pkg.rules,
      createdAt: now,
    });

    created++;
    console.log(`  + (${index + 1}/${COMMUNITY_SKILLS.length}) ${pkg.displayName}`);
  }

  await pool.end();
  console.log(`\nSeed complete: ${created} created, ${skipped} skipped.`);
}

// Only run when executed directly — not when imported by tests
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
