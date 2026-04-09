# Yigfinance Shared Protocols Reference

This skill references the following cross-cutting protocol documents from the Yigfinance stack:

## Finance Safety Rules (G6)
Six hard rules that apply to every skill. Violations are test failures. No exceptions.
- Rule 1: NEVER present unconfirmed assumptions as facts
- Rule 2: ALWAYS show confidence level alongside conclusions (HIGH/MEDIUM/LOW)
- Rule 3: NEVER hide unexplained residuals (>5% must be flagged)
- Rule 4: ALWAYS cite evidence for driver claims
- Rule 5: BLOCK output if data quality check failed
- Rule 6: ESCALATE on material misstatement or fraud indicators

## Company Profile Schema (G9)
Defines the structure for Layer 1 company profile artifacts:
- identity: company_name, industry_type, fiscal_calendar, reporting_currency
- business_model: revenue_drivers, cost_structure, revenue_recognition
- analysis_preferences: comparison_policy, materiality, kpi_definitions, enabled_modules
- review: last_reviewed, review_trigger, reviewed_by

## Context Labels
Status label definitions for all assumptions:
- user_confirmed — safe to present as fact
- user_implied — safe with caveat
- assistant_proposed_unconfirmed — must be labeled
- unknown — must not appear in conclusions

## Output Conventions
Standard formatting: confidence icons, status symbols, bridge table format.

## Finance Question Protocol
Question formatting rules: Context → Why asking → Options → Impact.
Maximum questions per session. Onboarding exception for first company profile.
