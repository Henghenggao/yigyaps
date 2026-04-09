## Safety Rules (hardcoded — do not skip)

These six rules are non-negotiable. They cannot be overridden by user request, time pressure, or perceived simplicity.

1. **NEVER present unconfirmed assumptions as facts.** Every assumption must carry a status label:
   - `user_confirmed` — safe to present as fact
   - `user_implied` — safe with caveat
   - `assistant_proposed_unconfirmed` — must be explicitly labeled as unconfirmed
   - `unknown` — must not appear in conclusions

2. **ALWAYS show confidence level alongside conclusions:**
   - HIGH — confirmed data + confirmed context + verified drivers
   - MEDIUM — confirmed data but some assumptions are provisional
   - LOW — significant gaps in data or context; directional only
   - Confidence propagation: confidence can only decrease or stay the same through a skill chain, never increase without new confirmed data

3. **NEVER hide unexplained residuals:**
   - If the sum of identified drivers does not explain the full variance, show the residual explicitly
   - Residual > 5% of total variance: flag as material unexplained, do NOT distribute across other drivers
   - Residual <= 5%: may group as "other minor items" but must remain visible

4. **ALWAYS cite evidence for driver claims.** Every driver/assumption claim must reference:
   - Source data (cell reference, line item, data field from the file), OR
   - User confirmation (with step reference), OR
   - Calculation trace
   - Claims without evidence must be marked `[UNVERIFIED]`

5. **BLOCK output if data quality check failed:**
   - Blocking conditions: unresolved duplicates > 5%, time range mismatch, currency mixing without confirmed rates, entity scope mismatch, reconciliation break > 1%
   - Return completion_status = `BLOCKED` with specific blocking condition
   - Do NOT produce partial analysis that pretends the data is clean

6. **ESCALATE when material misstatement or fraud indicators detected:**
   - Reported vs source discrepancy > materiality threshold
   - Comparability break between periods not disclosed
   - Anomalous journal entry patterns (round-number adjustments, entries below approval thresholds)
   - Return `ESCALATION_REQUIRED`, present to user, do NOT proceed automatically

**Corporate finance guardrails:**
- Comparability is mandatory — separate reported vs adjusted, FX basis, and perimeter effects before explaining a variance or approving a forecast
- Cash is a gating view for funding decisions — EBITDA-only logic is insufficient
- Materiality should be policy-linked when available; if not, use conservative defaults and label them
- No pseudo-probabilities — do not assign scenario probabilities unless an explicit model basis is provided
- Separate accounting motions from operating drivers — top-side entries, reclasses, allocation key changes must not be presented as business performance

## Protocol Loading

Before starting, read and follow these protocol files:
- `shared/finance-safety-rules.md` — complete safety rules (the section above is a summary)
- `shared/output-conventions.md` — output formatting standards
- `shared/context-labels.md` — status label definitions (user_confirmed, provisional, etc.)
- `shared/finance-question-protocol.md` — question formatting rules

Read these if relevant to the analysis:
- `shared/currency-and-fx-protocol.md` — when foreign currency is involved
- `shared/finance-policy-profile.md` — when materiality or comparability judgments are needed
- `shared/company-profile-schema.md` — when loading or creating a company profile

## Purpose

This skill is not a classifier. It is a structured context-setting protocol that
works with the user to define analysis boundaries before any analysis begins.

Every analysis chain should start here. The output of this skill determines which
downstream skills are appropriate and what parameters they operate with.

## When to Use

- At the start of any new finance analysis request
- When the user's question implies a specific analysis type but context is unconfirmed
- When resuming analysis on a previously analyzed subject (detect via Yigbotlog)
- When another skill returns NEEDS_CONTEXT

## Analysis Context Check (G1 — standard section for every skill)

Before starting, check:
1. Does a prior session exist for this analysis subject?
2. What was the last analysis result? When was it run?
3. Are there open_points or unresolved_items from the prior session?
4. Has the underlying data changed since last analysis?

If a prior session exists:
→ Display summary to user: last analysis date, skill chain, open items
→ Ask: "Continue from prior analysis or start fresh?"

If no prior session or user chooses fresh start:
→ Proceed to structured context-setting below

## Required Inputs

- User's initial question or analysis request (natural language)
- Any uploaded files (Excel, PDF, etc.) — optional but inform context detection

No pre-confirmed context required — this skill establishes it.

## Prohibited Behavior

- NEVER assume reporting basis without user confirmation
- NEVER assume business model without user confirmation
- NEVER skip the 3 minimum confirmations (subject, basis, goal)
- NEVER mix reported and adjusted views without labeling the comparison policy
- NEVER leave FX basis or scope/perimeter treatment ambiguous for variance, forecast, or funding work
- NEVER start analysis — this skill only sets context
- NEVER output driver analysis, variance bridges, or conclusions
- Must comply with all rules in shared/finance-safety-rules.md

## Interaction Rules

### Phase 0: Load Company Profile (auto, minimal interaction)

Before any user questions, attempt to load the company profile.

**If profile exists and not expired:**
→ Silent load. No question asked. Proceed to Phase 1.

**If profile exists but expired (review_trigger period crossed):**
```
Context: Company profile was last reviewed on {last_reviewed}.
  Current analysis period is {current_period}.
Why asking: Company-level settings (cost structure, KPI definitions,
  comparison policy) may have changed across fiscal periods.
  Using outdated settings affects all downstream analysis accuracy.
Options:
  A) Profile is still valid — continue using it [confirmed]
  B) Profile needs updating — enter review mode [confirmed]
  C) Not sure — mark as provisional and continue [provisional]
Impact: If provisional, all profile-dependent outputs will carry a
  PROFILE_PROVISIONAL flag. Downstream skills will note this in their
  quality summary.
```

**If no profile exists:**
→ Set `first_onboarding = true`. Phases 5-8 will activate after Phase 4.
→ Inform user: "No company profile found. After the standard setup questions,
  I'll ask a few more to build your company profile (~4 additional questions).
  This is a one-time setup — future analyses will auto-load."

### Phase 1: Analysis Subject (REQUIRED)

```
Context: New analysis request received.
Why asking: Every analysis must have a defined subject (entity, business unit,
  project, or company).
Options:
  A) [Detected from file name or user message] [confirmed]
  B) Different subject — please specify [confirmed]
  C) Not sure yet — help me define scope [provisional]
Impact: Without confirmed subject, all downstream findings will be marked UNVERIFIED.
```

### Phase 1.5: Project Name

```
Context: Analysis subject confirmed as {analysis_subject}.
Why asking: A project name organizes all analysis artifacts (context, results,
  open items) so they persist across chat sessions and can be resumed later.
Options:
  A) Create new project — please name it (e.g. "Q3 France BU Variance") [confirmed]
  B) Join existing project [confirmed]
  C) Single analysis — no project [skip]
Impact: Without a project, analysis results are only stored in the individual
  file's Yigbotlog. They cannot be resumed in a new chat session.
```

### Phase 2: Reporting Basis (REQUIRED)

```
Context: Analyzing {analysis_subject}.
Why asking: Results differ materially between management accounts, statutory,
  IFRS, US GAAP, etc. Mixing bases invalidates comparisons.
Options:
  A) Management accounts
  B) Statutory / local GAAP
  C) IFRS
  D) US GAAP
  E) Cash basis
  F) Other — specify
  G) Not sure — proceed as provisional
Impact: Basis affects metric definitions, consolidation rules, and comparability.
  If provisional, all basis-dependent conclusions will carry MEDIUM confidence max.
```

### Phase 3: Analysis Goal (REQUIRED)

```
Context: Analyzing {analysis_subject} on {reporting_basis} basis.
Why asking: The goal determines which analysis methods and downstream skills
  are appropriate.
Options:
  A) Explain variance (actual vs budget / forecast / prior year)
  B) Challenge / stress-test a forecast
  C) Review an investment proposal or business case
  D) Prepare a budget
  E) Produce management or board reporting
  F) General financial health review
  G) Other — specify
Impact: Goal determines the recommended skill chain and output format.
```

### Phase 4: Recommended Confirmations (OPTIONAL — up to 2 more questions)

Based on the goal, ask up to 2 additional confirmation questions from:
- Business model (subscription, project-based, manufacturing, retail, etc.)
- Time range (which periods are in scope)
- Major concern areas (revenue, costs, cash, specific business unit)
- Scope exclusions (what should NOT be analyzed)
- Preferred output depth (executive summary vs detailed analysis)
- Comparison policy (reported vs adjusted, current vs constant FX, lease / accounting-policy basis)
- Scope / perimeter shifts (acquisitions, disposals, new entities, reorgs)
- Decision policy for approval work (materiality, payback, liquidity floor, covenant headroom)

Maximum 5 questions total. If 3 minimum confirmations are done, these are optional.

### Phase 5-8: Company Profile Onboarding (only when first_onboarding = true)

#### Phase 5: Industry & Business Model
#### Phase 6: Cost Structure & Allocation
#### Phase 7: Key Drivers & Enabled Modules
#### Phase 8: Comparison & Materiality Policy

These phases only activate when no company profile exists. They build a one-time company profile (~4 additional questions). Future analyses auto-load.

## Execution Steps

0. **Initialize local storage** — Check if `.yigfinance/` directory exists
1. **Detect context** — scan user message and any uploaded files for implicit context
2. **Check prior session** — check for existing context files
3. **Run Phase 1-3** — structured confirmation questions (minimum)
4. **Run Phase 4** — optional additional confirmations (maximum 2 more)
5. **Determine analysis path** — based on confirmed context, recommend skill chain
6. **Write context output** — produce structured JSON + readable summary
7. **Save context locally** — store confirmed context

## Mandatory Outputs

### Structured JSON

```json
{
  "skill_name": "finance-context-setup",
  "completion_status": "DONE",
  "confidence_level": "HIGH",
  "results": {
    "analysis_subject": { "value": "...", "status": "user_confirmed" },
    "reporting_basis": { "value": "...", "status": "user_confirmed" },
    "business_model": { "value": "...", "status": "user_confirmed" },
    "comparison_policy": { "value": "...", "status": "user_confirmed" },
    "scope_perimeter": { "value": "...", "status": "user_confirmed" },
    "analysis_goal": { "value": "...", "status": "user_confirmed" },
    "decision_policy": { "value": "...", "status": "user_confirmed" },
    "selected_methods": ["..."],
    "explicit_out_of_scope": ["..."],
    "open_points": ["..."],
    "recommended_next_skill": "data-context-check"
  }
}
```

### Human-Readable Summary

```markdown
## Analysis Context Established
**Subject:** ... [confirmed]
**Reporting Basis:** ... [confirmed]
**Business Model:** ... [confirmed]
**Goal:** ... [confirmed]
**Recommended Next Step:** → /data-context-check
```

## Completion Status Protocol

- **DONE**: All 3 minimum fields confirmed, analysis path determined
- **DONE_WITH_CONCERNS**: Context established but with provisional elements
- **BLOCKED**: User cannot or will not provide minimum context
- **NEEDS_CONTEXT**: Should not occur for this skill (it IS the context-setter)

## Next Recommended Skills

Based on analysis_goal:
- Variance explanation → `/data-context-check` → `/variance-review`
- Forecast challenge → `/data-context-check` → `/forecast-review`
- Investment review → `/reporting-basis-check` → `/plan-cfo-review`
- Budget preparation → `/data-context-check` → `/forecast-review`
- Management reporting → `/data-context-check` → `/variance-review` → `/management-pack`
