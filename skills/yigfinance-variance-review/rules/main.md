## Safety Rules (hardcoded — do not skip)

These six rules are non-negotiable.

1. **NEVER present unconfirmed assumptions as facts.** Every assumption must carry a status label: user_confirmed, user_implied, assistant_proposed_unconfirmed, unknown.
2. **ALWAYS show confidence level alongside conclusions:** HIGH / MEDIUM / LOW. Confidence can only decrease through a chain.
3. **NEVER hide unexplained residuals.** Residual > 5%: flag as material. Do NOT distribute across drivers.
4. **ALWAYS cite evidence for driver claims.** Source data, user confirmation, or calculation trace. Claims without evidence: `[UNVERIFIED]`.
5. **BLOCK output if data quality check failed.** Return `BLOCKED` with specific condition.
6. **ESCALATE when material misstatement or fraud indicators detected.**

**Corporate finance guardrails:**
- Comparability is mandatory — separate reported vs adjusted, FX basis, perimeter effects
- Cash is a gating view for funding decisions
- Materiality should be policy-linked
- No pseudo-probabilities
- Separate accounting motions from operating drivers

## Purpose

Decompose the difference between actual performance and a comparison basis (budget, forecast, prior year) into identifiable, evidence-backed drivers.

This is NOT a summary writer. It is a structured decomposition engine. Every driver claim must be backed by evidence. Unexplained residuals must remain visible.

## When to Use

- Monthly or quarterly business review (actual vs budget)
- Re-forecast variance explanation (current vs prior forecast)
- Year-over-year performance analysis
- Any scenario where "what happened and why" is the question

## Company Profile Consumption

When company profile is available:
1. **enabled_modules** → Check if `pvm_analysis` enabled before price-volume-mix decomposition
2. **cost_structure.method** → standard_cost: price/efficiency/volume variances; actual_cost: direct cost drivers
3. **comparison_policy** → Default comparison basis (user can override)
4. **kpi_definitions** → Override default metric calculations
5. **materiality** → Filter driver significance

When NOT available: Use generic analysis paths, output tagged `DEGRADED_NO_ARTIFACT`.

## Required Inputs

- Confirmed analysis context (from upstream or independent confirmation)
- Data quality check passed
- Actual data (P&L or specific financial data)
- Comparison data (budget, forecast, or prior year — same structure)

## Prohibited Behavior

- NEVER present unconfirmed drivers as facts
- NEVER hide unexplained residuals by distributing across known drivers
- NEVER claim a driver without citing evidence
- NEVER skip the variance bridge structure
- NEVER force-fit all variance into a neat story
- NEVER use "rounding" to eliminate residuals > 1%
- NEVER treat reclasses or top-side journals as operational drivers without labeling

## Interaction Rules

### Comparison Basis Confirmation
```
Context: Running variance analysis for {analysis_subject}, {period}.
Why asking: The comparison basis determines the meaning of every variance.
Options:
  A) Actual vs Budget [confirmed]
  B) Actual vs Prior Forecast [confirmed]
  C) Actual vs Prior Year [confirmed]
  D) Actual vs multiple bases [confirmed — separate bridges]
```

### Driver Confirmation (when decomposition is ambiguous)
```
Context: Revenue variance of +$1.2M identified. Two possible driver patterns.
Why asking: The split changes the management narrative materially.
Options:
  A) Split is: 60% new customer / 40% existing expansion [confirmed]
  B) Split is different — specify [confirmed]
  C) Not sure — mark as provisional [provisional]
```

## Execution Steps

1. **Load data** — Open actual and comparison data files, parse into tables
2. **Calculate total variance** — For each line item: actual - comparison (absolute + percentage)
3. **Build variance bridge** — Rank by magnitude, group into categories, compute % of total. Bridge must sum to total exactly.
4. **Decompose drivers** — For each material driver: identify sub-drivers (price/volume/mix for revenue; rate/efficiency for costs). Link to evidence. Assign confidence.
5. **Classify drivers** — Structural (persists), timing (reverses), or one-off. Based on evidence.
6. **Separate accounting vs operating movements** — Pull reclasses, top-side journals, policy shifts. Show whether movement is operational, accounting/policy, or mixed.
7. **Check residuals** — Sum of explained vs total. If > 5%: flag material unexplained.
8. **Determine management implications** — Structural: strategic response. Timing: monitor.
9. **Write outputs** — JSON + markdown

## Mandatory Outputs

### Structured JSON
```json
{
  "skill_name": "variance-review",
  "completion_status": "DONE",
  "confidence_level": "MEDIUM",
  "results": {
    "variance_bridge": {
      "total_variance": { "amount": 1200000, "currency": "EUR", "percentage": 8.5 },
      "drivers": [
        { "name": "...", "amount": 800000, "percentage_of_total": 66.7, "category": "structural", "evidence": "...", "confidence": "MEDIUM" }
      ],
      "unexplained_residual": { "amount": 150000, "percentage_of_total": 12.5 }
    },
    "explained_vs_unexplained": { "explained_pct": 87.5, "unexplained_pct": 12.5 },
    "adjustment_bridge": { "accounting_or_policy_movements": [...], "operational_view_commentary": "..." },
    "structural_vs_timing": { "structural": 1050000, "timing": 0 },
    "management_implications": [...]
  }
}
```

### Bridge Template (Human-Readable)
```markdown
## Variance Bridge: {subject} — {period}
**Basis:** Actual vs {comparison}
**Total Variance:** +EUR 1,200K (+8.5%)

| # | Driver | Amount | % of Total | Type | Evidence | Confidence |
|---|--------|--------|-----------|------|----------|------------|
| 1 | ... | ... | ... | ... | ... | ... |
| — | **Unexplained residual** | **...** | **...** | — | — | — |
| | **Total** | **...** | **100%** | | | |

### Management Implications
### Open Items
```

## Completion Status Protocol
- **DONE**: All major drivers identified, residual < 5%
- **DONE_WITH_CONCERNS**: Drivers identified but residual > 5% or some provisional
- **BLOCKED**: Data quality failed or comparison data unavailable
- **NEEDS_CONTEXT**: Subject or comparison basis not confirmed

## Next Recommended Skills
- Monthly review → `/management-pack`
- Forecast challenge → `/forecast-review`
- Risk drivers found → `/risk-review`
- Cash implications → `/cash-conversion-review`
