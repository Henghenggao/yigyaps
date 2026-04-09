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

3. **NEVER hide unexplained residuals:**
   - Residual > 5% of total variance: flag as material unexplained
   - Residual <= 5%: may group as "other minor items" but must remain visible

4. **ALWAYS cite evidence for driver claims.** Claims without evidence must be marked `[UNVERIFIED]`

5. **BLOCK output if data quality check failed:**
   - Blocking conditions: unresolved duplicates > 5%, time range mismatch, currency mixing, entity scope mismatch, reconciliation break > 1%
   - Return completion_status = `BLOCKED`

6. **ESCALATE when material misstatement or fraud indicators detected**

**Corporate finance guardrails:**
- Comparability is mandatory
- Cash is a gating view for funding decisions
- Materiality should be policy-linked
- No pseudo-probabilities
- Separate accounting motions from operating drivers

## Purpose

Verify what numbers mean, what version is in scope, and where the data risks are.
This is the gatekeeper between context setup and analytical execution.
A clean data context check means downstream skills can trust the data.
A failed check blocks analysis (Safety Rule 5).

## When to Use

- After `/finance-context-setup` confirms the analysis context
- Before any analytical skill (variance-review, forecast-review, etc.)
- When data source or scope changes mid-analysis
- When a prior skill flagged data quality concerns

## Required Inputs

- Confirmed analysis context (from `/finance-context-setup` or independent confirmation)
- Data file(s) to check (Excel, CSV, or reference to data source)
- Analysis goal (determines which data dimensions matter)

## Prohibited Behavior

- NEVER skip data quality checks because the file "looks clean"
- NEVER assume currency, entity scope, or time range from file names alone
- NEVER proceed to analysis if a critical quality check fails (Safety Rule 5)
- NEVER ignore period mismatches between actual and comparison data
- NEVER treat top-side journals as business drivers without labeling
- NEVER mark forecast/funding data READY unless cash/balance-sheet coverage confirmed
- NEVER auto-fix data issues without user confirmation

## Interaction Rules

### Data Source Confirmation
```
Context: Checking data for {analysis_subject} {analysis_goal}.
Why asking: Need to confirm which file/tab contains the primary data.
Options:
  A) {detected_file} / {detected_tab} [confirmed]
  B) Different source — specify [confirmed]
Impact: Wrong source = wrong analysis.
```

### Period/Currency Confirmation (if not auto-detected)
```
Context: Data appears to cover {detected_period} in {detected_currency}.
Why asking: Period mismatch between actual and comparison data invalidates variance.
Options:
  A) Correct as detected [confirmed]
  B) Different period — specify [confirmed]
  C) Not sure — flag for review [provisional]
Impact: Period mismatch will block variance analysis (Safety Rule 5).
```

## Execution Steps

1. **Identify data sources** — Open data file(s), identify sheets and structure
2. **Check data dimensions** — Time range, currency, entity scope, data version
3. **Validate data quality** — Missing values, duplicates, outliers, consistency, cross-tab reconciliation
4. **Check mapping status** — Chart of accounts mapping, unmapped items, basis matching
5. **Check adjustment and reconciliation status** — Reported-to-managed bridge, top-side journals, restatements
6. **Company Profile Conflict Detection** — Compare data structure against profile declarations
7. **Assess cash/balance-sheet coverage** — For forecast/funding work
8. **Assess readiness** — Apply readiness criteria, determine if analysis can proceed

## Readiness Criteria

### READY
- All required data sources available
- Periods aligned, currency consistent
- No critical quality issues
- Mapping complete, reconciliation understood

### READY_WITH_GAPS
- Data available but with known limitations
- Minor mapping gaps (< 5%), single period estimated
- Non-critical quality warnings

### NOT_READY (triggers BLOCKED)
- Unresolved duplicates > 5%
- Time range mismatch
- Currency mixing without rates
- Entity scope mismatch
- Reconciliation break > 1%
- Forecast/funding without cash/working-capital coverage

## Mandatory Outputs

### Structured JSON
```json
{
  "skill_name": "data-context-check",
  "completion_status": "DONE",
  "confidence_level": "HIGH",
  "results": {
    "data_sources": [...],
    "version_scope": "...",
    "reconciliation_status": {...},
    "adjustment_register": [...],
    "mapping_status": {...},
    "cash_balance_sheet_coverage": {...},
    "known_gaps": [...],
    "blocker_flags": [],
    "readiness_status": "READY"
  }
}
```

### Human-Readable Summary
```markdown
## Data Context Check Complete
**Readiness: READY**
### Data Sources (table)
### Data Quality (checklist)
### Reconciliation / Adjustments
### Known Gaps
### Recommended Next Step → /variance-review
```

## Completion Status Protocol
- **DONE**: Data is READY, all checks passed
- **DONE_WITH_CONCERNS**: Data is READY_WITH_GAPS
- **BLOCKED**: Data is NOT_READY (Safety Rule 5)
- **NEEDS_CONTEXT**: Missing analysis context

## Next Recommended Skills
- Variance explanation → `/variance-review`
- Forecast challenge → `/forecast-review`
- Investment review → `/plan-cfo-review`
