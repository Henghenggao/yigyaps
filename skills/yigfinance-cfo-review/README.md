# Yigfinance: Plan CFO Review

> CFO-style pressure test for investment proposals, business cases, and budget requests.

## What it does

Plan CFO Review challenges plans the way a real CFO would:

- **No unsupported economics** — every projection needs evidence
- **Assumption register** — source, owner, trigger, sensitivity for every key assumption
- **Return analysis** — NPV, IRR, ROI, payback period, ROIC
- **Mandatory downside case** — stress top assumptions at 50% wrong
- **Sensitivity analysis** — tornado chart ranking by impact
- **Funding gate evaluation** — policy threshold pass/fail
- **Explicit verdict** — FUND / FUND_WITH_CONDITIONS / HOLD_REVISE / DO_NOT_FUND
- **30/60/90-day metrics** — what to track post-decision
- **Audit trail** — SHA-256 integrity hash for compliance

## Review modes

| Mode | When to use |
|------|-------------|
| GROWTH | Looking to invest if returns are strong |
| SELECTIVE_INVESTMENT | Adding selectively to a stable base |
| HOLD_PLAN | Validating existing commitments |
| CASH_PROTECTION | Preserving cash, cutting weak payback |

## Skill chain position

```
Finance Context Setup → [Plan CFO Review] → Management Pack
                                           → Board Pack
                                           → Risk Review
```

## Part of Yigfinance

Repository: https://github.com/Henghenggao/Yigfinance | License: MIT
