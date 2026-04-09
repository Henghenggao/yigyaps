# Yigfinance Shared Protocols Reference

## Finance Safety Rules (G6)
Six hard rules: no unconfirmed-as-fact, always show confidence, never hide residuals, always cite evidence, block on bad data, escalate on fraud indicators.

## Currency & FX Protocol
- Constant vs current FX basis
- Conversion rate documentation
- Budget rate vs average rate vs period-end rate

## Company Profile Schema (G9)
Company-level settings that affect data validation:
- identity.reporting_currency → cross-check with data currency
- business_model.cost_structure → validate against data dimensions
- business_model.revenue_recognition → check for matching data patterns

## Context Labels
Status definitions: user_confirmed, user_implied, assistant_proposed_unconfirmed, unknown.
