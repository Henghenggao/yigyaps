#!/usr/bin/env tsx
/**
 * YigYaps 3-Star Skills Seed Script
 *
 * 8 high-complexity (⭐⭐⭐) skills requiring deep domain expertise,
 * multi-step reasoning, or orchestration of multiple sub-systems:
 *
 *   From original approved list (3):
 *     1. market-research-generator      — Deep Research
 *     2. patent-landscape-analyzer      — Deep Research
 *     3. form-automation-specialist     — Web Automation
 *
 *   New high-value additions (5):
 *     4. multi-agent-orchestrator       — AI/ML agent coordination
 *     5. rag-pipeline-auditor           — RAG quality evaluation
 *     6. llm-prompt-security-auditor    — Prompt injection & jailbreak defense
 *     7. kubernetes-security-auditor    — K8s CIS benchmark
 *     8. data-lakehouse-architect       — dbt/Airflow/Great Expectations
 *
 * Usage: DATABASE_URL=... SEED_AUTHOR_ID=usr_xxx tsx scripts/seed-3star-skills.ts
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
// ⭐⭐⭐ Three-Star Skills
// ─────────────────────────────────────────────────────────────────────────────

export const THREE_STAR_SKILLS = [

  // ══════════════════════════════════════════════════════════════════════════
  // R3: Market Research Report Generator
  // Ref: GPT-Researcher + AutoGPT + LangChain agents
  // ══════════════════════════════════════════════════════════════════════════
  {
    packageId: "market-research-generator",
    version: "1.0.0",
    displayName: "Market Research Report Generator",
    description:
      "Generates comprehensive market research reports with industry analysis, TAM/SAM/SOM sizing, competitive landscape, growth drivers, and strategic recommendations. Orchestrates multi-source research pipelines.",
    readme: `# Market Research Report Generator

Enterprise-grade market research powered by structured research orchestration.

## Inspired By

- [GPT-Researcher](https://github.com/assafelovic/gpt-researcher) — autonomous deep research
- [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) — multi-step agent tasks
- McKinsey/BCG report structure standards

## Report Structure

\`\`\`
1. Executive Summary (1 page)
2. Market Definition & Scope
   - Boundaries, geography, time horizon
3. Market Sizing
   - TAM: Total Addressable Market
   - SAM: Serviceable Addressable Market
   - SOM: Serviceable Obtainable Market
   - Methodology: Bottom-up vs Top-down
4. Competitive Landscape
   - Market map (players × segments)
   - Market share estimates
   - Strategic groups
5. Growth Drivers & Inhibitors
   - PESTLE analysis
   - Porter's Five Forces
6. Customer Segmentation
   - Personas, buying behavior, decision journey
7. Technology Trends
   - Innovation vectors, disruption signals
8. Strategic Recommendations
   - Entry strategies, white spaces, M&A targets
\`\`\`

## Complexity Factors

This is a ⭐⭐⭐ skill because it requires:
- Multi-source data synthesis (industry reports, news, SEC filings, patents)
- Quantitative modeling (market sizing formulas)
- Competitive intelligence frameworks
- Strategic analysis (Porter, PESTLE, BCG matrix)
- Citation quality validation
- Contradiction resolution across sources`,
    authorName: "Community Research",
    category: "research" as const,
    tags: ["market-research", "strategy", "tam-sam-som", "competitive-analysis", "industry-analysis", "gpt-researcher"],
    maturity: "beta" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/assafelovic/gpt-researcher",
    homepageUrl: null,
    rules: makeRules([
      // Market Definition
      { id: "mr-def-1", dimension: "Market Definition", keywords: ["market boundary", "scope", "geography", "segment", "industry", "sector", "vertical"], conclusion: "market_boundary_defined", weight: 0.9 },
      { id: "mr-def-2", dimension: "Market Definition", keywords: ["2024", "2025", "2026", "2027", "2028", "2030", "forecast period", "horizon"], conclusion: "time_horizon_set", weight: 0.8 },
      // TAM/SAM/SOM
      { id: "mr-tam-1", dimension: "Market Sizing", keywords: ["tam", "total addressable market", "addressable"], conclusion: "tam_sizing_required", weight: 0.95 },
      { id: "mr-sam-1", dimension: "Market Sizing", keywords: ["sam", "serviceable addressable", "serviceable market"], conclusion: "sam_sizing_required", weight: 0.9 },
      { id: "mr-som-1", dimension: "Market Sizing", keywords: ["som", "serviceable obtainable", "obtainable market", "realistic share"], conclusion: "som_sizing_required", weight: 0.9 },
      { id: "mr-meth-1", dimension: "Sizing Methodology", keywords: ["bottom-up", "top-down", "triangulation", "cagr", "growth rate", "compound annual"], conclusion: "sizing_methodology_present", weight: 0.85 },
      // Competitive Landscape
      { id: "mr-comp-1", dimension: "Competitive Landscape", keywords: ["competitor", "market share", "player", "incumbent", "challenger", "niche"], conclusion: "competitive_map_needed", weight: 0.9 },
      { id: "mr-comp-2", dimension: "Competitive Landscape", keywords: ["porter", "five forces", "barriers", "supplier power", "buyer power", "substitutes"], conclusion: "porters_five_forces", weight: 0.85 },
      { id: "mr-comp-3", dimension: "Competitive Landscape", keywords: ["strategic group", "positioning map", "magic quadrant", "wave", "matrix"], conclusion: "strategic_grouping", weight: 0.8 },
      // Growth Analysis
      { id: "mr-grow-1", dimension: "Growth Drivers", keywords: ["driver", "catalyst", "tailwind", "accelerator", "regulation", "trend"], conclusion: "growth_drivers_identified", weight: 0.85 },
      { id: "mr-grow-2", dimension: "Growth Drivers", keywords: ["inhibitor", "barrier", "headwind", "challenge", "constraint", "risk"], conclusion: "growth_inhibitors_identified", weight: 0.85 },
      { id: "mr-pestle-1", dimension: "PESTLE", keywords: ["political", "economic", "social", "technological", "legal", "environmental", "pestle", "pest"], conclusion: "pestle_analysis", weight: 0.8 },
      // Customer Analysis
      { id: "mr-cust-1", dimension: "Customer", keywords: ["customer segment", "persona", "icp", "buyer", "end user", "decision maker"], conclusion: "customer_segmentation", weight: 0.8 },
      { id: "mr-cust-2", dimension: "Customer", keywords: ["willingness to pay", "wtp", "price sensitivity", "budget", "procurement"], conclusion: "buying_behavior_analysis", weight: 0.75 },
      // Data Sources
      { id: "mr-data-1", dimension: "Data Quality", keywords: ["primary research", "survey", "interview", "secondary", "industry report", "sec filing", "patent"], conclusion: "multi_source_research", weight: 0.9 },
      { id: "mr-data-2", dimension: "Data Quality", keywords: ["citation", "source", "according to", "gartner", "forrester", "idc", "statista", "euromonitor"], conclusion: "authoritative_sources", weight: 0.85 },
      // Strategic Output
      { id: "mr-strat-1", dimension: "Strategy", keywords: ["recommendation", "opportunity", "white space", "entry strategy", "m&a", "partnership"], conclusion: "strategic_recommendation", weight: 0.85 },
    ]),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // R5: Patent Landscape Analyzer
  // Ref: Google Patents, Lens.org, EPO open data
  // ══════════════════════════════════════════════════════════════════════════
  {
    packageId: "patent-landscape-analyzer",
    version: "1.0.0",
    displayName: "Patent Landscape Analyzer",
    description:
      "Analyzes patent landscapes to identify technology white spaces, key players, filing trends, and freedom-to-operate risks. Uses IPC/CPC classification and citation network analysis.",
    readme: `# Patent Landscape Analyzer

Systematic patent intelligence for R&D strategy and IP risk management.

## Inspired By

- [Lens.org](https://lens.org) — open patent search (CC0 data)
- [Google Patents](https://patents.google.com) — public patent search
- [EPO Open Patent Services](https://www.epo.org/searching-for-patents/technical/espacenet.html)
- [USPTO PatentsView](https://patentsview.org) — open innovation data

## Analysis Pipeline

\`\`\`
1. Search Strategy Design
   → IPC/CPC codes + keyword combinations + assignee filters

2. Landscape Mapping
   → Filing volume by year (trends)
   → Geographic distribution (US/EP/CN/JP/KR)
   → Top assignees (market share by filing count)
   → Inventor networks

3. Technology Clustering
   → Sub-domain identification
   → Claim language analysis
   → Technology evolution timeline

4. White Space Detection
   → Claim matrix: technology × application area
   → Under-claimed zones = opportunity areas

5. Citation Analysis
   → Forward citations (who built on this?)
   → Backward citations (prior art foundation)
   → Key blocking patents

6. Freedom to Operate (FTO)
   → Active vs expired patent identification
   → Claim scope mapping
   → Geographic coverage gaps

7. Strategic Output
   → Technology roadmap input
   → Filing recommendations
   → Licensing/M&A targets
\`\`\`

## Complexity Factors ⭐⭐⭐

- Requires IPC/CPC classification knowledge
- Multi-dimensional citation network traversal
- Claim language legal interpretation
- Geographic IP law differences
- Prior art assessment methodology`,
    authorName: "Community Research",
    category: "research" as const,
    tags: ["patents", "ip", "r&d-strategy", "freedom-to-operate", "ipc-cpc", "technology-intelligence"],
    maturity: "experimental" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/google/patent-landscape-tools",
    homepageUrl: "https://lens.org",
    rules: makeRules([
      // Search Strategy
      { id: "pa-ipc-1", dimension: "Classification", keywords: ["ipc", "cpc", "classification", "subclass", "group", "a61k", "g06f", "h04l"], conclusion: "ipc_classification_used", weight: 0.95 },
      { id: "pa-key-1", dimension: "Search Strategy", keywords: ["keyword", "boolean", "and", "or", "not", "near", "truncation", "wildcard"], conclusion: "keyword_strategy_defined", weight: 0.85 },
      { id: "pa-asn-1", dimension: "Search Strategy", keywords: ["assignee", "applicant", "owner", "company", "corporation", "university"], conclusion: "assignee_filter_applied", weight: 0.8 },
      // Landscape Mapping
      { id: "pa-trend-1", dimension: "Filing Trends", keywords: ["filing trend", "annual filing", "year over year", "growth rate", "cagr", "by year"], conclusion: "filing_trend_analyzed", weight: 0.9 },
      { id: "pa-geo-1", dimension: "Geography", keywords: ["us patent", "european", "epo", "wipo", "pct", "cn", "jp", "kr", "geographic"], conclusion: "geographic_distribution", weight: 0.85 },
      { id: "pa-play-1", dimension: "Key Players", keywords: ["top assignee", "market leader", "filing count", "portfolio size", "dominant player"], conclusion: "player_ranking", weight: 0.9 },
      // Technology Analysis
      { id: "pa-clus-1", dimension: "Technology Clustering", keywords: ["cluster", "sub-domain", "technology area", "claim language", "embodiment"], conclusion: "technology_clustering", weight: 0.85 },
      { id: "pa-evol-1", dimension: "Evolution", keywords: ["evolution", "generation", "v1", "v2", "prior art", "continuation", "improvement over"], conclusion: "technology_evolution", weight: 0.8 },
      // White Space
      { id: "pa-ws-1", dimension: "White Space", keywords: ["white space", "gap", "unclaimed", "opportunity", "unprotected", "open area"], conclusion: "white_space_identified", weight: 0.95 },
      { id: "pa-ws-2", dimension: "White Space", keywords: ["claim matrix", "coverage map", "application area", "use case matrix"], conclusion: "claim_matrix_analysis", weight: 0.9 },
      // Citation Analysis
      { id: "pa-fwd-1", dimension: "Forward Citations", keywords: ["forward citation", "cited by", "built upon", "subsequent", "continuation"], conclusion: "forward_citation_analysis", weight: 0.85 },
      { id: "pa-bwd-1", dimension: "Backward Citations", keywords: ["backward citation", "prior art", "references cited", "foundation", "blocking patent"], conclusion: "backward_citation_analysis", weight: 0.85 },
      // FTO Assessment
      { id: "pa-fto-1", dimension: "Freedom to Operate", keywords: ["freedom to operate", "fto", "infringement", "claim scope", "claim element"], conclusion: "fto_assessment", weight: 0.95 },
      { id: "pa-exp-1", dimension: "Patent Status", keywords: ["expiry", "expired", "active", "lapsed", "abandoned", "granted", "pending"], conclusion: "patent_status_check", weight: 0.9 },
      // Strategic Output
      { id: "pa-strat-1", dimension: "Strategy", keywords: ["filing strategy", "continuation", "design around", "licensing", "acquisition", "cross-license"], conclusion: "strategic_recommendation", weight: 0.85 },
    ]),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // W4: Form Automation Specialist
  // Ref: Playwright MCP, Browser-use, Selenium patterns
  // ══════════════════════════════════════════════════════════════════════════
  {
    packageId: "form-automation-specialist",
    version: "1.0.0",
    displayName: "Form Automation Specialist",
    description:
      "Intelligently detects, maps, and automates complex web forms including multi-step wizards, conditional fields, file uploads, and CAPTCHA routing. Handles session management and validation recovery.",
    readme: `# Form Automation Specialist

Production-grade form automation with intelligent field mapping and error recovery.

## Inspired By

- [Browser-use](https://github.com/browser-use/browser-use) — AI-native browser automation
- [Playwright MCP](https://github.com/microsoft/playwright-mcp) — official MCP server
- [Selenium IDE](https://www.selenium.dev/selenium-ide/) — record & playback patterns

## Form Types Handled

| Type | Complexity | Strategy |
|------|-----------|---------|
| Simple contact form | Low | Direct field mapping |
| Multi-step wizard | High | State machine traversal |
| Conditional (branching) | High | Decision tree evaluation |
| File upload | Medium | MIME type validation + chunking |
| Date/time pickers | Medium | Calendar interaction patterns |
| Rich text editors | High | ContentEditable handling |
| CAPTCHA-gated | Very High | Human routing or service API |
| OAuth flows | High | Token interception |
| Payment forms | High | PCI-safe field handling |

## Automation Pipeline

\`\`\`
1. Form Discovery
   → DOM analysis, ARIA roles, label associations
   → Hidden fields (honeypots), CSRF tokens

2. Field Mapping
   → Semantic label → data field matching
   → Type inference (text/email/tel/select/checkbox)

3. Validation Pre-check
   → Client-side rules extraction
   → Required field identification
   → Format constraints (regex, min/max)

4. Execution Strategy
   → Fill order (dependency-aware)
   → Trigger events (change, blur, input)
   → Dynamic field revelation

5. Error Recovery
   → Validation error parsing
   → Field correction loop
   → Partial state preservation

6. Submission & Confirmation
   → Response capture
   → Confirmation page detection
   → Receipt/reference extraction
\`\`\`

## ⭐⭐⭐ Complexity Factors

- DOM mutation observation (dynamic forms)
- Shadow DOM penetration
- iframe context switching
- Anti-bot detection awareness
- State machine for wizard flows
- CAPTCHA classification and routing`,
    authorName: "Community Automation",
    category: "automation" as const,
    tags: ["form-automation", "playwright", "browser-use", "web-automation", "rpa", "scraping"],
    maturity: "experimental" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/browser-use/browser-use",
    homepageUrl: null,
    rules: makeRules([
      // Form Detection
      { id: "fa-disc-1", dimension: "Form Discovery", keywords: ["form", "input", "textarea", "select", "checkbox", "radio", "submit", "button"], conclusion: "form_elements_detected", weight: 0.95 },
      { id: "fa-disc-2", dimension: "Form Discovery", keywords: ["label", "aria-label", "placeholder", "for=", "id=", "name="], conclusion: "field_labels_mapped", weight: 0.9 },
      { id: "fa-sec-1", dimension: "Security Fields", keywords: ["csrf", "token", "_token", "honeypot", "hidden", "nonce"], conclusion: "security_fields_detected", weight: 0.95 },
      // Field Type Handling
      { id: "fa-type-1", dimension: "Field Types", keywords: ["date picker", "calendar", "datepicker", "flatpickr", "datetimepicker"], conclusion: "date_picker_strategy", weight: 0.9 },
      { id: "fa-type-2", dimension: "Field Types", keywords: ["file upload", "drag drop", "dropzone", "file input", "attachment", "browse"], conclusion: "file_upload_strategy", weight: 0.9 },
      { id: "fa-type-3", dimension: "Field Types", keywords: ["rich text", "wysiwyg", "contenteditable", "quill", "tinymce", "ckeditor"], conclusion: "rich_text_strategy", weight: 0.85 },
      { id: "fa-type-4", dimension: "Field Types", keywords: ["autocomplete", "typeahead", "combobox", "suggest", "dropdown search"], conclusion: "autocomplete_strategy", weight: 0.85 },
      // Multi-Step Handling
      { id: "fa-step-1", dimension: "Multi-Step", keywords: ["step", "wizard", "progress", "next", "previous", "back", "page 1 of", "multi-step"], conclusion: "wizard_flow_detected", weight: 0.95 },
      { id: "fa-cond-1", dimension: "Conditional Logic", keywords: ["conditional", "depends on", "show if", "hide if", "branch", "dynamic field"], conclusion: "conditional_fields_detected", weight: 0.9 },
      // Validation
      { id: "fa-val-1", dimension: "Validation", keywords: ["required", "invalid", "error", "validation", "pattern", "min length", "max length", "format"], conclusion: "validation_rules_extracted", weight: 0.9 },
      { id: "fa-val-2", dimension: "Validation", keywords: ["client-side", "inline validation", "real-time", "on blur", "on change", "constraint"], conclusion: "realtime_validation_handling", weight: 0.85 },
      // CAPTCHA & Anti-bot
      { id: "fa-cap-1", dimension: "CAPTCHA", keywords: ["captcha", "recaptcha", "hcaptcha", "cloudflare", "turnstile", "challenge", "bot detection"], conclusion: "captcha_routing_needed", weight: 1.0 },
      { id: "fa-cap-2", dimension: "Anti-bot", keywords: ["fingerprint", "behavioral", "mouse movement", "headless detection", "user agent"], conclusion: "antibot_evasion_strategy", weight: 0.9 },
      // Error Recovery
      { id: "fa-err-1", dimension: "Error Recovery", keywords: ["retry", "error message", "validation failed", "incorrect", "please enter", "invalid format"], conclusion: "error_recovery_loop", weight: 0.9 },
      { id: "fa-sess-1", dimension: "Session Management", keywords: ["session", "cookie", "timeout", "expired", "re-login", "token refresh"], conclusion: "session_management", weight: 0.85 },
      // Confirmation
      { id: "fa-conf-1", dimension: "Confirmation", keywords: ["success", "thank you", "confirmation", "reference number", "receipt", "submitted"], conclusion: "confirmation_captured", weight: 0.85 },
    ]),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NEW: Multi-Agent Workflow Orchestrator
  // Ref: CrewAI, AutoGPT, LangGraph, Swarm
  // ══════════════════════════════════════════════════════════════════════════
  {
    packageId: "multi-agent-orchestrator",
    version: "1.0.0",
    displayName: "Multi-Agent Workflow Orchestrator",
    description:
      "Designs and evaluates multi-agent workflows: task decomposition, agent role assignment, inter-agent communication protocols, and failure recovery strategies. Based on CrewAI, LangGraph, and OpenAI Swarm patterns.",
    readme: `# Multi-Agent Workflow Orchestrator

Design intelligent multi-agent systems that reliably solve complex tasks.

## Inspired By

- [CrewAI](https://github.com/crewAIInc/crewAI) — role-based multi-agent orchestration
- [LangGraph](https://github.com/langchain-ai/langgraph) — stateful multi-actor applications
- [OpenAI Swarm](https://github.com/openai/swarm) — lightweight multi-agent framework
- [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) — autonomous agent system

## Orchestration Patterns

| Pattern | Use Case | Complexity |
|---------|---------|-----------|
| Sequential pipeline | Linear tasks | Low |
| Parallel fan-out | Independent subtasks | Medium |
| Hierarchical (manager + workers) | Complex decomposable tasks | High |
| Debate/critique (adversarial) | Quality assurance, validation | High |
| Memory-augmented loop | Long-horizon tasks | Very High |
| Human-in-the-loop | High-stakes decisions | Variable |

## Evaluation Dimensions

- **Task Decomposition**: Can the goal be broken into clear, bounded subtasks?
- **Agent Roles**: Are roles clearly defined with appropriate tools and scope?
- **Communication Protocol**: How do agents share context? (structured vs unstructured)
- **State Management**: How is shared state maintained across agent turns?
- **Failure Handling**: What happens when a sub-agent fails or loops?
- **Termination Conditions**: When does the workflow stop?
- **Observability**: Can a human understand and intervene in the workflow?

## ⭐⭐⭐ Complexity Factors

- Emergent behavior is hard to predict
- Inter-agent context propagation design
- Avoiding infinite loops and hallucination cascades
- Tool permission scoping per agent
- Cost and latency optimization across agent calls`,
    authorName: "Community AI",
    category: "ai-ml" as const,
    tags: ["multi-agent", "crewai", "langgraph", "orchestration", "autogpt", "agentic-ai", "swarm"],
    maturity: "experimental" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/crewAIInc/crewAI",
    homepageUrl: null,
    rules: makeRules([
      // Task Decomposition
      { id: "ma-dec-1", dimension: "Task Decomposition", keywords: ["subtask", "decompose", "break down", "sub-goal", "divide", "step", "phase"], conclusion: "task_decomposed", weight: 0.95 },
      { id: "ma-dec-2", dimension: "Task Decomposition", keywords: ["atomic", "bounded", "well-defined", "clear output", "verifiable"], conclusion: "subtask_bounded", weight: 0.9 },
      // Agent Roles
      { id: "ma-role-1", dimension: "Agent Roles", keywords: ["role", "agent", "specialist", "researcher", "writer", "reviewer", "executor", "planner"], conclusion: "roles_defined", weight: 0.9 },
      { id: "ma-role-2", dimension: "Agent Roles", keywords: ["tool", "capability", "permission", "scope", "access", "function call"], conclusion: "tools_scoped", weight: 0.85 },
      { id: "ma-role-3", dimension: "Agent Roles", keywords: ["manager", "orchestrator", "coordinator", "supervisor", "delegat"], conclusion: "hierarchical_pattern", weight: 0.85 },
      // Communication
      { id: "ma-comm-1", dimension: "Communication", keywords: ["context", "handoff", "message", "shared memory", "state", "pass result"], conclusion: "communication_protocol", weight: 0.9 },
      { id: "ma-comm-2", dimension: "Communication", keywords: ["structured output", "json schema", "pydantic", "typed", "format"], conclusion: "structured_communication", weight: 0.85 },
      // State Management
      { id: "ma-state-1", dimension: "State Management", keywords: ["state", "memory", "checkpoint", "persist", "intermediate result", "context window"], conclusion: "state_management_strategy", weight: 0.9 },
      { id: "ma-state-2", dimension: "State Management", keywords: ["vector store", "embedding", "retrieval", "rag", "long-term memory"], conclusion: "memory_augmentation", weight: 0.85 },
      // Failure Handling
      { id: "ma-fail-1", dimension: "Failure Handling", keywords: ["fallback", "retry", "timeout", "max iteration", "loop detection", "stuck"], conclusion: "failure_recovery_defined", weight: 0.95 },
      { id: "ma-fail-2", dimension: "Failure Handling", keywords: ["human in the loop", "hitl", "human approval", "escalate", "review"], conclusion: "human_escalation_path", weight: 0.9 },
      // Termination
      { id: "ma-term-1", dimension: "Termination", keywords: ["stop condition", "done", "success criteria", "max turns", "convergence", "goal reached"], conclusion: "termination_defined", weight: 0.9 },
      // Observability
      { id: "ma-obs-1", dimension: "Observability", keywords: ["trace", "log", "monitor", "langsmith", "weave", "observability", "debug"], conclusion: "observability_configured", weight: 0.8 },
      // Cost & Latency
      { id: "ma-cost-1", dimension: "Efficiency", keywords: ["cost", "token", "latency", "parallel", "batch", "cache", "optimize"], conclusion: "efficiency_considered", weight: 0.75 },
    ]),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NEW: RAG Pipeline Quality Auditor
  // Ref: LangChain, LlamaIndex, RAGAS, TruLens
  // ══════════════════════════════════════════════════════════════════════════
  {
    packageId: "rag-pipeline-auditor",
    version: "1.0.0",
    displayName: "RAG Pipeline Quality Auditor",
    description:
      "Evaluates Retrieval-Augmented Generation (RAG) pipelines across chunking strategy, embedding quality, retrieval accuracy, context relevance, and answer faithfulness. Based on RAGAS and TruLens frameworks.",
    readme: `# RAG Pipeline Quality Auditor

Systematic quality evaluation for production RAG systems.

## Inspired By

- [RAGAS](https://github.com/explodinggradients/ragas) — RAG evaluation framework
- [TruLens](https://github.com/truera/trulens) — LLM app evaluation
- [LlamaIndex](https://github.com/run-llama/llama_index) — RAG orchestration
- [LangChain](https://github.com/langchain-ai/langchain) — RAG chains

## Evaluation Dimensions

### Indexing Quality
| Sub-metric | What it measures |
|-----------|-----------------|
| Chunk size | Information completeness per chunk |
| Overlap strategy | Context preservation across boundaries |
| Metadata richness | Source attribution, recency, authority |
| Embedding model fit | Domain alignment of embedding model |

### Retrieval Quality
| Metric | Formula | Threshold |
|--------|---------|-----------|
| Context Precision | Relevant retrieved / Total retrieved | > 0.8 |
| Context Recall | Relevant retrieved / Total relevant | > 0.7 |
| MRR | Mean Reciprocal Rank | > 0.7 |
| NDCG | Normalized Discounted Cumulative Gain | > 0.75 |

### Generation Quality (Faithfulness)
| Metric | What it measures |
|--------|-----------------|
| Answer Faithfulness | Is answer grounded in retrieved context? |
| Answer Relevance | Does answer address the question? |
| Hallucination Rate | Claims not supported by context |
| Citation Accuracy | Are sources correctly attributed? |

## Pipeline Components Audited

\`\`\`
Document Loading → Chunking → Embedding → Vector Store
     → Query Processing → Retrieval → Re-ranking → Generation
\`\`\`

## ⭐⭐⭐ Complexity Factors

- Multi-metric evaluation requires ground truth data
- Embedding model selection is domain-specific
- Retrieval-generation tradeoffs are non-obvious
- Production drift detection requires baseline comparison`,
    authorName: "Community AI",
    category: "ai-ml" as const,
    tags: ["rag", "llm", "vector-database", "embeddings", "ragas", "langchain", "llamaindex", "evaluation"],
    maturity: "experimental" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/explodinggradients/ragas",
    homepageUrl: null,
    rules: makeRules([
      // Indexing
      { id: "rag-chunk-1", dimension: "Chunking Strategy", keywords: ["chunk size", "token", "overlap", "sliding window", "recursive", "semantic chunking"], conclusion: "chunking_strategy_evaluated", weight: 0.95 },
      { id: "rag-chunk-2", dimension: "Chunking Strategy", keywords: ["too small", "too large", "context loss", "incomplete thought", "boundary"], conclusion: "chunk_size_issue", weight: 0.9 },
      { id: "rag-meta-1", dimension: "Metadata", keywords: ["metadata", "source", "date", "author", "document type", "page number", "section"], conclusion: "metadata_richness", weight: 0.85 },
      // Embedding
      { id: "rag-emb-1", dimension: "Embedding Model", keywords: ["embedding model", "ada", "bge", "e5", "cohere", "openai", "sentence transformer", "domain"], conclusion: "embedding_model_selection", weight: 0.9 },
      { id: "rag-emb-2", dimension: "Embedding Model", keywords: ["dimension", "768", "1536", "3072", "cosine similarity", "dot product"], conclusion: "embedding_dimensionality", weight: 0.8 },
      // Retrieval Metrics
      { id: "rag-prec-1", dimension: "Retrieval Precision", keywords: ["precision", "context precision", "relevant retrieved", "noise", "irrelevant chunk"], conclusion: "retrieval_precision_check", weight: 0.95 },
      { id: "rag-rec-1", dimension: "Retrieval Recall", keywords: ["recall", "context recall", "missing", "not retrieved", "coverage"], conclusion: "retrieval_recall_check", weight: 0.95 },
      { id: "rag-rerank-1", dimension: "Re-ranking", keywords: ["rerank", "cross-encoder", "cohere rerank", "colbert", "bm25", "hybrid search"], conclusion: "reranking_strategy", weight: 0.85 },
      // Generation Quality
      { id: "rag-faith-1", dimension: "Faithfulness", keywords: ["faithfulness", "grounded", "hallucination", "not in context", "fabricated", "unsupported"], conclusion: "faithfulness_check", weight: 0.98 },
      { id: "rag-rel-1", dimension: "Answer Relevance", keywords: ["relevance", "on topic", "addresses question", "complete", "partial answer"], conclusion: "answer_relevance_check", weight: 0.9 },
      { id: "rag-cite-1", dimension: "Citations", keywords: ["citation", "source attribution", "reference", "page", "document name", "traceability"], conclusion: "citation_accuracy", weight: 0.85 },
      // Vector Store
      { id: "rag-vs-1", dimension: "Vector Store", keywords: ["vector store", "pinecone", "weaviate", "chroma", "qdrant", "pgvector", "faiss", "index"], conclusion: "vector_store_assessment", weight: 0.8 },
      { id: "rag-vs-2", dimension: "Vector Store", keywords: ["approximate nearest neighbor", "ann", "hnsw", "ivf", "latency", "throughput", "scaling"], conclusion: "vector_store_performance", weight: 0.8 },
      // Query Processing
      { id: "rag-qry-1", dimension: "Query Processing", keywords: ["query expansion", "hypothetical document", "hyde", "query rewrite", "sub-query"], conclusion: "query_enhancement", weight: 0.85 },
      // Evaluation
      { id: "rag-eval-1", dimension: "Evaluation Framework", keywords: ["ragas", "trulens", "deepeval", "benchmark", "ground truth", "test set", "eval"], conclusion: "evaluation_framework_present", weight: 0.9 },
    ]),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NEW: LLM Prompt Security Auditor
  // Ref: Garak, PromptFoo, Microsoft PyRIT, OWASP LLM Top 10
  // ══════════════════════════════════════════════════════════════════════════
  {
    packageId: "llm-prompt-security-auditor",
    version: "1.0.0",
    displayName: "LLM Prompt Security Auditor",
    description:
      "Audits LLM system prompts and applications for prompt injection vulnerabilities, jailbreak susceptibility, data exfiltration risks, and guardrail bypass patterns. Based on OWASP LLM Top 10.",
    readme: `# LLM Prompt Security Auditor

Security review for AI systems deployed in production.

## Inspired By

- [Garak](https://github.com/leondz/garak) — LLM vulnerability scanner (Apache 2.0)
- [PromptFoo](https://github.com/promptfoo/promptfoo) — LLM testing framework
- [Microsoft PyRIT](https://github.com/Azure/PyRIT) — Python Risk Identification Toolkit
- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)

## OWASP LLM Top 10 Coverage

| # | Vulnerability | Checks |
|---|--------------|--------|
| LLM01 | Prompt Injection | Direct + indirect injection vectors |
| LLM02 | Insecure Output Handling | XSS via LLM output, markdown injection |
| LLM03 | Training Data Poisoning | Bias detection signals |
| LLM04 | Model DoS | Token flooding, context exhaustion |
| LLM05 | Supply Chain | Third-party model/plugin risk |
| LLM06 | Sensitive Info Disclosure | PII leakage, system prompt extraction |
| LLM07 | Insecure Plugin Design | Tool call injection, parameter tampering |
| LLM08 | Excessive Agency | Overprivileged tool access |
| LLM09 | Overreliance | Missing human oversight mechanisms |
| LLM10 | Model Theft | API abuse, model extraction attacks |

## Audit Scope

\`\`\`
System Prompt Analysis:
  → Secret leakage risk (API keys, passwords in prompt)
  → Instruction override vulnerability
  → Role confusion susceptibility

User Input Handling:
  → Injection vector surface area
  → Input sanitization presence
  → Indirect injection via external data

Output Pipeline:
  → Downstream injection (SQL, HTML, code execution)
  → Sensitive data in structured outputs
  → Citation/attribution manipulation
\`\`\`

## ⭐⭐⭐ Complexity Factors

- Adversarial thinking required
- Attack vectors evolve rapidly
- False negative risk is high
- Context-dependent vulnerability assessment`,
    authorName: "Community Security",
    category: "security" as const,
    tags: ["llm-security", "prompt-injection", "owasp-llm", "garak", "promptfoo", "ai-safety", "red-teaming"],
    maturity: "experimental" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/leondz/garak",
    homepageUrl: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
    rules: makeRules([
      // LLM01: Prompt Injection
      { id: "ls-inj-1", dimension: "Prompt Injection", keywords: ["ignore previous", "ignore instructions", "disregard", "forget everything", "new instructions", "override"], conclusion: "direct_injection_vector", weight: 1.0 },
      { id: "ls-inj-2", dimension: "Prompt Injection", keywords: ["indirect injection", "external content", "url", "retrieved", "web content", "email body"], conclusion: "indirect_injection_risk", weight: 0.95 },
      { id: "ls-inj-3", dimension: "Prompt Injection", keywords: ["role play", "pretend", "act as", "you are now", "jailbreak", "dan", "developer mode"], conclusion: "jailbreak_pattern", weight: 0.95 },
      // LLM06: Sensitive Info Disclosure
      { id: "ls-leak-1", dimension: "Info Disclosure", keywords: ["system prompt", "repeat your instructions", "what is your prompt", "reveal", "show me your"], conclusion: "system_prompt_extraction", weight: 0.95 },
      { id: "ls-leak-2", dimension: "Info Disclosure", keywords: ["api key", "password", "secret", "credential", "token", "private"], conclusion: "secret_in_prompt_risk", weight: 1.0 },
      { id: "ls-pii-1", dimension: "PII Leakage", keywords: ["email", "phone", "ssn", "credit card", "address", "personal", "pii", "gdpr"], conclusion: "pii_leakage_risk", weight: 0.95 },
      // LLM02: Output Handling
      { id: "ls-out-1", dimension: "Output Injection", keywords: ["markdown", "html", "javascript", "script", "sql", "shell", "eval", "exec"], conclusion: "output_injection_risk", weight: 0.9 },
      { id: "ls-out-2", dimension: "Output Handling", keywords: ["unsanitized output", "raw llm output", "direct render", "dangerouslysetinnerhtml"], conclusion: "unsafe_output_handling", weight: 0.95 },
      // LLM08: Excessive Agency
      { id: "ls-agen-1", dimension: "Excessive Agency", keywords: ["delete", "drop", "rm -rf", "send email", "transfer", "purchase", "modify production"], conclusion: "high_impact_tool_access", weight: 0.95 },
      { id: "ls-agen-2", dimension: "Excessive Agency", keywords: ["no confirmation", "autonomous", "without approval", "automatically", "no human review"], conclusion: "insufficient_oversight", weight: 0.9 },
      // LLM07: Plugin Security
      { id: "ls-tool-1", dimension: "Tool Call Security", keywords: ["function call", "tool call", "plugin", "action", "parameter", "argument injection"], conclusion: "tool_parameter_injection", weight: 0.9 },
      { id: "ls-tool-2", dimension: "Tool Call Security", keywords: ["sql injection via tool", "command injection", "path traversal", "server-side"], conclusion: "tool_injection_chaining", weight: 0.95 },
      // LLM04: DoS
      { id: "ls-dos-1", dimension: "Model DoS", keywords: ["token flooding", "context exhaustion", "infinite loop", "recursive prompt", "max token"], conclusion: "resource_exhaustion_risk", weight: 0.85 },
      // Guardrails
      { id: "ls-guard-1", dimension: "Guardrails", keywords: ["guardrail", "moderation", "content filter", "safety layer", "llm guard", "nemo guardrails"], conclusion: "guardrail_presence_check", weight: 0.9 },
      { id: "ls-guard-2", dimension: "Guardrails", keywords: ["bypass", "circumvent", "workaround", "encoding trick", "base64", "unicode trick"], conclusion: "guardrail_bypass_risk", weight: 0.95 },
    ]),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NEW: Kubernetes Security Auditor
  // Ref: kube-bench, CIS Kubernetes Benchmark, Falco, OPA Gatekeeper
  // ══════════════════════════════════════════════════════════════════════════
  {
    packageId: "kubernetes-security-auditor",
    version: "1.0.0",
    displayName: "Kubernetes Cluster Security Auditor",
    description:
      "Audits Kubernetes configurations against CIS Benchmark, RBAC best practices, network policy gaps, secret management, and workload security. Based on kube-bench and Falco patterns.",
    readme: `# Kubernetes Cluster Security Auditor

Production Kubernetes security review against industry standards.

## Inspired By

- [kube-bench](https://github.com/aquasecurity/kube-bench) — CIS K8s benchmark (Apache 2.0)
- [Falco](https://github.com/falcosecurity/falco) — cloud-native runtime security
- [OPA Gatekeeper](https://github.com/open-policy-agent/gatekeeper) — policy enforcement
- [Trivy](https://github.com/aquasecurity/trivy) — K8s vulnerability scanning

## CIS Benchmark Coverage (v1.8)

| Section | Controls | Focus |
|---------|---------|-------|
| 1. Control Plane | 1.1-1.3 | API server, etcd, controller manager |
| 2. etcd | 2.1-2.7 | Encryption at rest, TLS, access control |
| 3. Control Plane Config | 3.1-3.2 | Audit logging, authentication |
| 4. Worker Nodes | 4.1-4.2 | Kubelet, node configuration |
| 5. Policies | 5.1-5.7 | RBAC, network, secrets, image provenance |

## RBAC Audit Dimensions

\`\`\`
ClusterRole Analysis:
  → Wildcard permissions (* verbs, * resources)
  → Dangerous permissions (exec, attach, port-forward)
  → Cluster-admin bindings (who has god mode?)
  → Service account token auto-mount

Network Policies:
  → Default-deny baseline present?
  → Namespace isolation
  → Ingress/egress control
  → Pod-to-pod communication matrix
\`\`\`

## Workload Security Checks

- **Pod Security Standards**: Restricted / Baseline / Privileged
- **Resource Limits**: CPU/memory limits on all containers
- **Read-only Root Filesystem**: Immutable container FS
- **Non-root Container**: runAsNonRoot: true
- **Privilege Escalation**: allowPrivilegeEscalation: false
- **Capabilities**: Drop ALL, add only what's needed
- **Host Namespaces**: hostPID/hostNetwork/hostIPC: false

## ⭐⭐⭐ Complexity Factors

- Multi-layer security surface (host → node → pod → container → app)
- RBAC graph analysis requires full cluster inventory
- Network policy effectiveness is topology-dependent
- Supply chain security spans registry → build → deploy`,
    authorName: "Community Security",
    category: "security" as const,
    tags: ["kubernetes", "k8s", "security", "cis-benchmark", "rbac", "kube-bench", "devsecops", "falco"],
    maturity: "experimental" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/aquasecurity/kube-bench",
    homepageUrl: null,
    rules: makeRules([
      // RBAC
      { id: "k8-rbac-1", dimension: "RBAC", keywords: ["cluster-admin", "wildcard", "* verbs", "* resources", "all permissions"], conclusion: "overprivileged_rbac", weight: 1.0 },
      { id: "k8-rbac-2", dimension: "RBAC", keywords: ["exec", "attach", "port-forward", "escalate", "impersonate", "bind"], conclusion: "dangerous_verb_permission", weight: 0.95 },
      { id: "k8-rbac-3", dimension: "RBAC", keywords: ["service account", "automount", "token", "default sa", "serviceaccountname"], conclusion: "service_account_risk", weight: 0.9 },
      // Network Policy
      { id: "k8-net-1", dimension: "Network Policy", keywords: ["default deny", "deny all", "ingress policy", "egress policy", "network policy"], conclusion: "network_policy_baseline", weight: 0.95 },
      { id: "k8-net-2", dimension: "Network Policy", keywords: ["no network policy", "allow all", "open egress", "unrestricted", "0.0.0.0"], conclusion: "missing_network_policy", weight: 0.95 },
      // Pod Security
      { id: "k8-pod-1", dimension: "Pod Security", keywords: ["privileged: true", "runasroot", "runasuser: 0", "allow privilege escalation"], conclusion: "privileged_container", weight: 1.0 },
      { id: "k8-pod-2", dimension: "Pod Security", keywords: ["readonly root filesystem", "read-only", "readonlyrootfilesystem"], conclusion: "mutable_filesystem_risk", weight: 0.9 },
      { id: "k8-pod-3", dimension: "Pod Security", keywords: ["capabilities", "drop all", "cap_sys_admin", "cap_net_admin", "securitycontext"], conclusion: "capabilities_audit", weight: 0.9 },
      { id: "k8-pod-4", dimension: "Pod Security", keywords: ["hostpid", "hostnetwork", "hostipc", "host namespace"], conclusion: "host_namespace_risk", weight: 0.95 },
      // Resource Management
      { id: "k8-res-1", dimension: "Resources", keywords: ["no limits", "cpu limit", "memory limit", "resources:", "requests:", "limits:"], conclusion: "resource_limits_check", weight: 0.85 },
      // Secrets
      { id: "k8-sec-1", dimension: "Secrets", keywords: ["secret", "env from secret", "volume secret", "etcd encryption", "sealed secret", "vault"], conclusion: "secret_management_check", weight: 0.9 },
      { id: "k8-sec-2", dimension: "Secrets", keywords: ["plaintext", "base64", "not encrypted", "env var password", "hardcoded"], conclusion: "secret_exposure_risk", weight: 1.0 },
      // Control Plane
      { id: "k8-cp-1", dimension: "Control Plane", keywords: ["api server", "audit log", "anonymous auth", "--anonymous-auth", "insecure port"], conclusion: "apiserver_hardening", weight: 0.95 },
      { id: "k8-etcd-1", dimension: "etcd", keywords: ["etcd", "encryption at rest", "etcd tls", "etcd cert", "peer tls"], conclusion: "etcd_security", weight: 0.9 },
      // Images
      { id: "k8-img-1", dimension: "Image Security", keywords: ["latest tag", "unscanned", "public registry", "no digest", "unsigned"], conclusion: "image_security_risk", weight: 0.9 },
      { id: "k8-img-2", dimension: "Image Security", keywords: ["cosign", "sigstore", "image signing", "sbom", "provenance"], conclusion: "supply_chain_security", weight: 0.85 },
    ]),
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NEW: Data Lakehouse Architect
  // Ref: dbt, Apache Airflow, Great Expectations, Delta Lake, Apache Iceberg
  // ══════════════════════════════════════════════════════════════════════════
  {
    packageId: "data-lakehouse-architect",
    version: "1.0.0",
    displayName: "Data Lakehouse Architect",
    description:
      "Designs and reviews modern data lakehouse architectures: medallion layers, data modeling, orchestration pipelines, quality checks, and lineage tracking. Based on dbt, Airflow, and Apache Iceberg patterns.",
    readme: `# Data Lakehouse Architect

Enterprise data architecture review for modern lakehouse stacks.

## Inspired By

- [dbt (data build tool)](https://github.com/dbt-labs/dbt-core) — analytics engineering (Apache 2.0)
- [Apache Airflow](https://github.com/apache/airflow) — workflow orchestration
- [Great Expectations](https://github.com/great-expectations/great_expectations) — data quality
- [Apache Iceberg](https://github.com/apache/iceberg) — open table format
- [Delta Lake](https://github.com/delta-io/delta) — ACID transactions on data lakes

## Medallion Architecture Review

\`\`\`
RAW (Bronze) → CLEANSED (Silver) → AGGREGATED (Gold) → SERVING
     ↓                ↓                    ↓               ↓
  Landing        Standardized           Business        Analytics
  as-is data     validated data         entities        ML features
\`\`\`

### Layer Quality Checks

| Layer | Key Concerns |
|-------|-------------|
| Bronze | Idempotent ingestion, schema evolution, partition strategy |
| Silver | Deduplication, null handling, type casting, SCD handling |
| Gold | Business logic correctness, aggregation accuracy, grain definition |
| Serving | Query performance, caching strategy, API contract |

## Evaluation Dimensions

- **Data Modeling**: Star schema vs. OBT vs. normalized, grain definition
- **Orchestration**: DAG design, dependency management, SLA monitoring
- **Data Quality**: Contract testing, anomaly detection, freshness SLAs
- **Schema Evolution**: Backward/forward compatibility, migration strategy
- **Lineage & Governance**: Column-level lineage, PII tagging, catalog integration
- **Performance**: Partitioning, clustering, file size optimization, Z-ordering
- **Cost Optimization**: Compute/storage separation, lifecycle policies, caching

## ⭐⭐⭐ Complexity Factors

- Multi-system coordination (ingest, transform, serve, monitor)
- Schema evolution across distributed consumers
- Data quality at scale requires statistical sampling
- SLA management across heterogeneous pipelines
- Governance overlaps with legal/compliance requirements`,
    authorName: "Community Data",
    category: "data" as const,
    tags: ["data-engineering", "dbt", "airflow", "lakehouse", "iceberg", "delta-lake", "etl", "data-quality"],
    maturity: "experimental" as const,
    license: "open-source" as const,
    priceUsd: "0",
    repositoryUrl: "https://github.com/dbt-labs/dbt-core",
    homepageUrl: null,
    rules: makeRules([
      // Medallion Architecture
      { id: "dl-med-1", dimension: "Medallion Layers", keywords: ["bronze", "silver", "gold", "raw", "cleansed", "aggregated", "medallion", "landing"], conclusion: "medallion_architecture_check", weight: 0.9 },
      { id: "dl-med-2", dimension: "Medallion Layers", keywords: ["idempotent", "incremental", "full refresh", "append only", "upsert", "merge"], conclusion: "ingestion_strategy", weight: 0.9 },
      // Data Modeling
      { id: "dl-model-1", dimension: "Data Modeling", keywords: ["star schema", "snowflake schema", "fact table", "dimension", "slowly changing", "scd"], conclusion: "data_model_pattern", weight: 0.9 },
      { id: "dl-model-2", dimension: "Data Modeling", keywords: ["grain", "granularity", "level of detail", "one row per", "primary key", "surrogate key"], conclusion: "grain_definition", weight: 0.85 },
      { id: "dl-model-3", dimension: "Data Modeling", keywords: ["obt", "one big table", "wide table", "denormalized", "flat"], conclusion: "obt_tradeoff_assessment", weight: 0.8 },
      // Orchestration
      { id: "dl-orch-1", dimension: "Orchestration", keywords: ["dag", "airflow", "prefect", "dagster", "mage", "dependency", "task"], conclusion: "orchestration_design", weight: 0.9 },
      { id: "dl-orch-2", dimension: "Orchestration", keywords: ["sla", "retry", "timeout", "alert", "backfill", "catchup", "schedule"], conclusion: "pipeline_reliability", weight: 0.85 },
      // Data Quality
      { id: "dl-qual-1", dimension: "Data Quality", keywords: ["data quality", "great expectations", "dbt test", "soda", "montecarlo", "anomaly", "expectation"], conclusion: "quality_framework_present", weight: 0.9 },
      { id: "dl-qual-2", dimension: "Data Quality", keywords: ["null check", "uniqueness", "referential integrity", "freshness", "row count", "distribution"], conclusion: "quality_dimensions_covered", weight: 0.85 },
      // Schema Evolution
      { id: "dl-sch-1", dimension: "Schema Evolution", keywords: ["schema evolution", "backward compatible", "forward compatible", "column add", "type change"], conclusion: "schema_evolution_strategy", weight: 0.9 },
      { id: "dl-sch-2", dimension: "Schema Evolution", keywords: ["iceberg", "delta lake", "hudi", "table format", "time travel", "snapshot"], conclusion: "open_table_format", weight: 0.85 },
      // Lineage & Governance
      { id: "dl-lin-1", dimension: "Lineage", keywords: ["lineage", "upstream", "downstream", "dependency", "impact analysis", "datahub", "openlineage"], conclusion: "lineage_tracking", weight: 0.85 },
      { id: "dl-gov-1", dimension: "Governance", keywords: ["pii", "sensitive data", "classification", "tag", "catalog", "data mesh", "data contract"], conclusion: "governance_framework", weight: 0.85 },
      // Performance
      { id: "dl-perf-1", dimension: "Performance", keywords: ["partition", "cluster", "z-order", "bloom filter", "compaction", "file size", "small files"], conclusion: "storage_optimization", weight: 0.85 },
      { id: "dl-cost-1", dimension: "Cost", keywords: ["cost", "compute", "storage", "lifecycle", "archive", "tiering", "spot", "reserved"], conclusion: "cost_optimization", weight: 0.8 },
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
    `Seeding ${THREE_STAR_SKILLS.length} ⭐⭐⭐ skills with author: ${SEED_AUTHOR_ID}\n`,
  );

  console.log("Skills in this batch:");
  console.log("  [Original list] 1. market-research-generator");
  console.log("  [Original list] 2. patent-landscape-analyzer");
  console.log("  [Original list] 3. form-automation-specialist");
  console.log("  [New]           4. multi-agent-orchestrator");
  console.log("  [New]           5. rag-pipeline-auditor");
  console.log("  [New]           6. llm-prompt-security-auditor");
  console.log("  [New]           7. kubernetes-security-auditor");
  console.log("  [New]           8. data-lakehouse-architect\n");

  let created = 0;
  let skipped = 0;

  for (const [index, pkg] of THREE_STAR_SKILLS.entries()) {
    const existing = await packageDAL.getByPackageId(pkg.packageId);
    if (existing) {
      console.log(`  skip (${index + 1}/${THREE_STAR_SKILLS.length}): ${pkg.packageId}`);
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
    console.log(`  + (${index + 1}/${THREE_STAR_SKILLS.length}) ${pkg.displayName}`);
  }

  await pool.end();
  console.log(`\nSeed complete: ${created} created, ${skipped} skipped.`);
  console.log("\nTotal YigYaps skill library:");
  console.log("  scripts/seed.ts                  →  10 original skills");
  console.log("  scripts/seed-community-skills.ts →  26 ⭐+⭐⭐ skills");
  console.log("  scripts/seed-3star-skills.ts     →   8 ⭐⭐⭐ skills");
  console.log("                                   ──────────────────────");
  console.log("                                      44 skills total");
}

// Only run when executed directly — not when imported by tests
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
