## Safety Rules (hardcoded — do not skip)

These six rules are non-negotiable.

1. **NEVER present unconfirmed assumptions as facts.** Status labels required.
2. **ALWAYS show confidence level:** HIGH / MEDIUM / LOW. Confidence propagation: minimum of upstream levels.
3. **NEVER hide unexplained residuals.** Must surface upstream residuals.
4. **ALWAYS cite evidence.** Upstream evidence required for all claims.
5. **BLOCK output if data quality check failed.**
6. **ESCALATE when material misstatement or fraud indicators detected.**

**Corporate finance guardrails:**
- Comparability is mandatory
- Cash is a gating view for funding decisions
- Materiality should be policy-linked
- No pseudo-probabilities
- Separate accounting motions from operating drivers

## Purpose

Convert completed analysis into a concise management-ready summary.
This skill does not analyze — it **synthesizes and frames** existing analysis for management decision-making.

Every management pack must answer: "What happened, why, what are the risks, and what should we do?"

## When to Use

- After variance-review, forecast-review, or plan-cfo-review completes
- When the user asks for a management summary or exec report
- When analysis results need to be presented to leadership
- As the final skill in most analysis chains

## Required Inputs

- Confirmed analysis context (from upstream chain)
- At least one completed upstream analysis
- Upstream analysis_trace records (for quality aggregation)

## Prohibited Behavior

- NEVER invent findings not present in upstream analysis
- NEVER upgrade confidence beyond what upstream supports
- NEVER hide upstream concerns or open items
- NEVER produce commentary without citing upstream evidence
- NEVER present clean narrative if upstream has material open items
- NEVER omit cash/working-capital view when upstream is forecast/funding oriented
- NEVER skip the Analysis Quality Summary (G2)

## Interaction Rules

### Output Format Confirmation
```
Context: Ready to produce management pack for {analysis_subject}.
Why asking: Format affects structure and detail level.
Options:
  A) Executive summary (1-2 pages, key messages + actions)
  B) Detailed management pack (3-5 pages, full analysis summary)
  C) Both formats
```

### Audience Confirmation
```
Context: Producing management pack for {analysis_subject}.
Options:
  A) CFO / Finance leadership (more financial detail)
  B) CEO / General management (strategic framing)
  C) Business unit leadership (operational focus)
  D) Board (suggest /board-pack instead)
```

## Execution Steps

1. **Gather upstream results** — Read all upstream skill outputs: variance-review, forecast-review, cfo-review, open-items, context
2. **Aggregate quality signals** — Collect confidence levels, merge open items, determine data quality. Build Analysis Quality Summary (G2).
3. **Extract key messages** — Maximum 5-7 messages, each supported by upstream evidence. Order by: impact → confidence → actionability.
4. **Identify top risks** — Pull from upstream risk assessments. Rank by impact × likelihood.
5. **Define required actions** — Priority: critical / high / medium / low. Include owner and deadline.
6. **Identify decision points** — What decisions needed, options, recommendations.
7. **Produce output** — Management pack with quality summary.

## Analysis Quality Summary (G2 — REQUIRED)

```markdown
## Analysis Quality Dashboard

| Dimension | Status | Detail |
|-----------|--------|--------|
| Context | Confirmed | All minimum fields confirmed |
| Data Quality | Passed | All quality checks passed |
| Evidence Coverage | 85% | 2 drivers without direct evidence |
| Unexplained Residual | 12.5% | EUR 150K undecomposed |
| Confidence | MEDIUM | Revenue split is provisional |
| Safety Rules | All passed | |
| Open Items | 3 | Revenue split, FX, pipeline data |

**Verdict: READY_WITH_CAVEATS**
```

## Mandatory Outputs

### Structured JSON
```json
{
  "skill_name": "management-pack",
  "completion_status": "DONE",
  "confidence_level": "MEDIUM",
  "results": {
    "key_messages": ["..."],
    "top_risks": [ { "risk": "...", "impact": "HIGH", "likelihood": "MEDIUM", "mitigation": "..." } ],
    "required_actions": [ { "action": "...", "owner": "...", "deadline": "...", "priority": "high" } ],
    "cash_and_working_capital": { "status": "WATCH", "headline": "...", "management_view": "..." },
    "decision_points": [ { "decision": "...", "options": [...], "recommendation": "...", "deadline": "..." } ]
  },
  "analysis_quality_summary": { ... }
}
```

### Human-Readable Management Pack
```markdown
# Management Pack: {subject} — {period}

[Analysis Quality Dashboard]

## Key Messages
1. ...

## Top Risks
| Risk | Impact | Likelihood | Mitigation |

## Required Actions
| Action | Owner | Deadline | Priority |

## Cash / Working Capital View
| Status | Headline | Management View |

## Decisions Required
| Decision | Recommendation | Deadline |
```

## Completion Status Protocol
- **DONE**: Pack produced with quality summary, all upstream complete
- **DONE_WITH_CONCERNS**: Pack produced but upstream has material concerns
- **BLOCKED**: Insufficient upstream analysis
- **NEEDS_CONTEXT**: Subject or audience not confirmed

## Next Recommended Skills
- Board-level output → `/board-pack`
- Process improvement → `/retro`
- Usually this is the final skill in the chain
