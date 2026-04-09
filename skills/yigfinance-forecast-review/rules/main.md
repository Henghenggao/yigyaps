## Safety Rules (hardcoded — do not skip)

These six rules are non-negotiable.

1. **NEVER present unconfirmed assumptions as facts.** Status labels: user_confirmed, user_implied, assistant_proposed_unconfirmed, unknown.
2. **ALWAYS show confidence level:** HIGH / MEDIUM / LOW. Confidence can only decrease through a chain.
3. **NEVER hide unexplained residuals.** Residual > 5%: flag as material.
4. **ALWAYS cite evidence for driver claims.** `[UNVERIFIED]` for unsupported claims.
5. **BLOCK output if data quality check failed.**
6. **ESCALATE when material misstatement or fraud indicators detected.**

**Corporate finance guardrails:**
- Comparability is mandatory
- Cash is a gating view for funding decisions — EBITDA-only logic insufficient
- Materiality should be policy-linked
- No pseudo-probabilities
- Separate accounting motions from operating drivers

## Purpose

Challenge forecast logic, identify weak assumptions, and stress-test downside.
Determine whether the forecast is credible, where it is fragile, and what management should watch.

This skill is a **challenger**, not a validator. It assumes the forecast may be wrong until proven otherwise.

## When to Use

- When the user wants to challenge a current forecast
- Before budget approval — test whether assumptions hold
- When re-forecasting and need to validate changed assumptions
- When preparing management commentary on forecast reliability

## Required Inputs

- Confirmed analysis context
- Forecast data (P&L forecast, budget, or financial plan)
- Comparison data (prior actuals, prior forecast, or benchmark)
- Key assumptions (explicit or to be extracted from data)

## Prohibited Behavior

- NEVER validate a forecast without testing assumptions
- NEVER accept "management judgment" as sufficient basis for material assumption
- NEVER skip the downside case — it is mandatory
- NEVER present scenario analysis without showing assumptions that changed
- NEVER treat a sensitivity range as a scenario (scenarios require coherent assumption sets)
- NEVER assign scenario probabilities unless explicit model basis available
- NEVER issue credible verdict for approval work without cash/working-capital view
- NEVER let optimism bias pass unchallenged

## Interaction Rules

### Assumption Source Confirmation
```
Context: Forecast shows {metric} growing {rate}% in {period}.
Why asking: Material assumptions need documented sources. "Management target" is not evidence.
Options:
  A) Based on confirmed pipeline / orders [confirmed]
  B) Based on external market data [confirmed — provide source]
  C) Management growth target (top-down) [provisional — will stress-test]
  D) Extrapolation from recent trend [provisional — will test sustainability]
  E) Not sure of the basis [unknown — will flag as key risk]
Impact: Unconfirmed assumptions stress-tested at 0x, 0.5x, 0.75x.
```

## Execution Steps

1. **Extract assumptions** — Identify key revenue, cost, operational assumptions. Compare to historical actuals. Flag divergences > 20%.
2. **Build assumption register** — For each: value, source, owner, trigger, sensitivity. Classify: confirmed, implied, proposed, unknown.
3. **Stress-test assumptions** — Driver-specific stress ranges (volume: 0.5x/0.75x/1.0x; price: -5%/-10%/-20%; churn: +50%/+100%). Calculate P&L impact.
4. **Run sensitivity analysis** — Tornado-chart data: for each assumption, impact of +/- stress, ranked by magnitude.
5. **Build scenario view** — Commit case (confirmed only), Base case (management), Downside (stress top 3), Severe downside (stress top 5 + external shock). Each shows revenue, EBITDA, action trigger.
6. **Assess cash and balance-sheet risk** — Working-capital pressure, peak cash burn, covenant/liquidity impact.
7. **Determine verdict** — CREDIBLE / CREDIBLE_WITH_RISKS / WEAK / NOT_CREDIBLE.

## Forecast Verdicts

| Verdict | Criteria |
|---------|----------|
| CREDIBLE | Assumptions confirmed, historical support, downside manageable |
| CREDIBLE_WITH_RISKS | Mostly confirmed but 1-2 key assumptions provisional |
| WEAK | Multiple unconfirmed assumptions, diverges from history |
| NOT_CREDIBLE | Material assumptions unsupported, downside not survivable |

## Mandatory Outputs

### Structured JSON
```json
{
  "skill_name": "forecast-review",
  "completion_status": "DONE",
  "confidence_level": "MEDIUM",
  "results": {
    "assumption_register": [
      { "assumption": "...", "value": "...", "status": "...", "source": "...", "owner": "...", "trigger": "...", "sensitivity": "HIGH" }
    ],
    "scenario_view": {
      "commit_case": { "revenue": ..., "ebitda": ..., "action_trigger": "..." },
      "base_case": { "revenue": ..., "ebitda": ... },
      "downside_case": { "revenue": ..., "ebitda": ..., "action_trigger": "..." },
      "severe_downside_case": { "revenue": ..., "ebitda": ..., "action_trigger": "..." }
    },
    "cash_risk_view": {
      "status": "AT_RISK",
      "working_capital_pressure": "...",
      "peak_cash_burn": "...",
      "covenant_headroom": "..."
    },
    "forecast_verdict": {
      "verdict": "CREDIBLE_WITH_RISKS",
      "rationale": "...",
      "key_sensitivities": [...]
    }
  }
}
```

### Human-Readable Summary
```markdown
## Forecast Review: {subject} — {period}
**Verdict: CREDIBLE_WITH_RISKS** [Confidence: MEDIUM]

### Assumption Health (table)
### Scenario Summary (table with Commit/Base/Downside/Severe)
### Key Risk
### Cash View
### Recommended Next Step
```

## Completion Status Protocol
- **DONE**: All assumptions assessed, scenarios built, verdict determined
- **DONE_WITH_CONCERNS**: Assessment complete but key assumptions unresolved
- **BLOCKED**: Forecast data unavailable or data quality failed
- **NEEDS_CONTEXT**: Forecast scope not confirmed

## Next Recommended Skills
- Significant risks → `/risk-review`
- Ready for output → `/management-pack`
- Cash concerns → `/cash-conversion-review`
- Initiative review → `/plan-cfo-review`
