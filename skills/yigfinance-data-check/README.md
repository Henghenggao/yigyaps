# Yigfinance: Data Context Check

> The quality gatekeeper. Validates data fitness before any financial analysis begins.

## What it does

Data Context Check verifies your financial data is fit for analysis:

- **Data source identification** — confirms which files/tabs contain primary data
- **Period alignment** — validates actual vs comparison data cover the same periods
- **Currency consistency** — detects mixed currencies, confirms conversion rates
- **Entity scope** — ensures consolidated vs single entity matches analysis goal
- **Quality validation** — missing values, duplicates, outliers, cross-tab reconciliation
- **Mapping status** — chart of accounts mapping completeness
- **Reconciliation** — reported-to-managed bridge, top-side journals, restatements
- **Cash coverage** — confirms balance-sheet data availability for funding decisions

## Why it matters

Bad data in = bad analysis out. This skill blocks downstream analysis when critical data quality issues are found (Safety Rule 5). No partial analysis on dirty data.

## Readiness verdicts

| Verdict | Meaning |
|---------|---------|
| READY | All checks passed, proceed to analysis |
| READY_WITH_GAPS | Minor limitations documented, proceed with caution |
| NOT_READY | Critical issues found, analysis blocked |

## Skill chain position

```
Finance Context Setup → [Data Context Check] → Variance Review
                                              → Forecast Review
                                              → Plan CFO Review
```

## Part of Yigfinance

Repository: https://github.com/Henghenggao/Yigfinance | License: MIT
