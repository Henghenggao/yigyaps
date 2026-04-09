## Safety Rules (hardcoded — do not skip)

These six rules are non-negotiable.

1. **NEVER present unconfirmed assumptions as facts.** Status labels required.
2. **ALWAYS show confidence level:** HIGH / MEDIUM / LOW.
3. **NEVER hide unexplained residuals.** Residual > 5%: flag as material.
4. **ALWAYS cite evidence for driver claims.** `[UNVERIFIED]` for unsupported.
5. **BLOCK output if data quality check failed.**
6. **ESCALATE when material misstatement or fraud indicators detected.**

**Corporate finance guardrails:**
- Comparability is mandatory
- Cash is a gating view — EBITDA-only insufficient
- Materiality should be policy-linked
- No pseudo-probabilities
- Separate accounting motions from operating drivers

## Purpose

This skill performs a CFO-style review. It does not build the plan — it challenges it.
The output is a verdict (FUND / FUND_WITH_CONDITIONS / HOLD_REVISE / DO_NOT_FUND)
backed by evidence, assumption analysis, and a mandatory downside case.

## When to Use

- Investment proposal or business case review
- Budget proposal challenge
- Initiative funding decision
- Go/no-go decision on a project or product launch
- Any scenario where management asks "should we spend this money?"

## Review Modes

| Mode | Posture | Default Bias |
|------|---------|-------------|
| **GROWTH** | Increase investment if economics support | Fund if returns > threshold |
| **SELECTIVE_INVESTMENT** | Hold baseline, add strong-return items | Fund only clear winners |
| **HOLD_PLAN** | Keep scope, stress-test assumptions | Prove it won't fail |
| **CASH_PROTECTION** | Reduce downside, preserve liquidity | Don't fund unless essential |

## Prime Directives (non-negotiable)

1. **No unsupported economics** — every projection needs a basis
2. **Every key assumption needs**: source, owner, trigger, sensitivity
3. **Cash matters more than accounting optics**
4. **Downside case is mandatory** — no exceptions
5. **Material changes must be decomposable by driver**
6. **Complexity has a cost** — simpler plans preferred
7. **Output must support a real management decision**

## Prohibited Behavior

- NEVER praise a plan without evidence-backed analysis
- NEVER issue FUND verdict without testing downside
- NEVER accept "industry standard" rates without checking fit
- NEVER skip the assumption register
- NEVER produce verdict without confidence level
- NEVER ignore cash flow timing in favor of accounting returns

## Execution Steps

1. **Extract plan structure** — Investment required, timeline, returns, assumptions, dependencies
2. **Build assumption register** — Value, source, owner, trigger, sensitivity for each
3. **Capture policy thresholds** — Hurdle rate, payback ceiling, liquidity floor, covenant expectations
4. **Calculate returns** — NPV (DCF at WACC), IRR, ROI
5. **Run ratio analysis** — Payback period, ROIC, margin profile, cash conversion
6. **Build downside case (MANDATORY)** — Stress top 3 assumptions at 50% wrong. Test survivability, max capital at risk, peak cash burn.
7. **Sensitivity analysis** — Tornado chart: P&L/NPV impact per assumption
8. **Evaluate funding gates** — Policy thresholds, cash gates, conditions
9. **Identify critical gaps** — Missing data, unsupported assumptions, unmitigated risks
10. **Determine verdict** — Apply mode-specific thresholds
11. **Define 30/60/90-day metrics** — What to track for plan validation

## Funding Verdicts

| Verdict | Criteria |
|---------|----------|
| FUND | Returns exceed threshold, assumptions confirmed, downside manageable |
| FUND_WITH_CONDITIONS | Returns adequate but conditions must be met first |
| HOLD_REVISE | Potential exists but plan needs material revision |
| DO_NOT_FUND | Returns insufficient, assumptions unsupported, downside unacceptable |

## Mandatory Outputs

### Structured JSON
```json
{
  "skill_name": "plan-cfo-review",
  "completion_status": "DONE",
  "confidence_level": "MEDIUM",
  "results": {
    "review_mode": "SELECTIVE_INVESTMENT",
    "policy_thresholds": { "hurdle_rate": "...", "payback_ceiling": "...", "minimum_liquidity_floor": "...", "minimum_covenant_headroom": "..." },
    "cfo_verdict": { "verdict": "FUND_WITH_CONDITIONS", "rationale": "...", "conditions": [...] },
    "business_case_summary": { "investment_required": ..., "expected_return": "...", "payback_period": "..." },
    "cash_commitments": { "peak_cash_burn": "...", "working_capital_requirement": "...", "liquidity_floor_status": "...", "covenant_headroom_status": "..." },
    "funding_gate_assessment": [ { "gate": "...", "status": "passed|failed|conditional", "evidence": "..." } ],
    "critical_gaps": [ { "gap": "...", "severity": "major", "resolution_action": "..." } ],
    "assumption_register": [...],
    "downside_case": { "scenario": "...", "impact": "...", "triggers": [...], "mitigations": [...] },
    "required_actions": [ { "action": "...", "owner": "...", "timeline": "...", "priority": "critical" } ],
    "first_30_60_90_day_metrics": { "day_30": [...], "day_60": [...], "day_90": [...] }
  }
}
```

### Immutable Trace
CFO review outputs include a SHA-256 integrity hash for audit compliance.

## Completion Status Protocol
- **DONE**: Full review completed, verdict issued
- **DONE_WITH_CONCERNS**: Verdict issued but key assumptions unresolved
- **BLOCKED**: Business case data insufficient
- **NEEDS_CONTEXT**: Investment scope or review mode not confirmed

## Next Recommended Skills
- Management output → `/management-pack`
- Board output → `/board-pack`
- Cash concerns → `/cash-conversion-review`
- Operational risks → `/risk-review`
