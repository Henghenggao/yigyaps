/**
 * TemplateEditor — Structured knowledge input for skill creators
 *
 * Lets experts fill in domain-specific templates that are automatically
 * converted to the RuleEngine JSON format. Three template modes:
 *
 *   1. Free-form   — plain text / markdown (existing behaviour)
 *   2. Decision Tree — IF/THEN rules with weights
 *   3. Scoring Matrix — dimension × criteria grid
 *   4. Case Library  — example input → expected output pairs
 *
 * The component exposes the same `value / onChange` interface as
 * MarkdownEditor, so swapping them in PublishSkillPage is a one-liner.
 *
 * License: Apache 2.0
 */

import { useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";

// ── Rule type (must match packages/api/src/lib/rule-engine.ts) ───────────────

interface Rule {
  id: string;
  dimension: string;
  condition: { keywords?: string[] };
  conclusion: string;
  weight: number;
}

// ── Template data shapes ──────────────────────────────────────────────────────

interface DecisionRule {
  id: string;
  dimension: string;
  keywords: string; // comma-separated
  conclusion: string;
  weight: number;
}

interface ScoringDimension {
  id: string;
  name: string;
  weight: number;
  highLabel: string;  // score 8-10
  midLabel: string;   // score 5-7
  lowLabel: string;   // score 1-4
}

interface CaseEntry {
  id: string;
  scenario: string;
  expectedOutput: string;
  dimension: string;
}

// ── Converters: template data → Rule[] JSON string ───────────────────────────

function decisionRulesToJson(rows: DecisionRule[]): string {
  const rules: Rule[] = rows
    .filter((r) => r.dimension.trim() && r.conclusion.trim())
    .map((r) => ({
      id: r.id,
      dimension: r.dimension.trim(),
      condition: r.keywords.trim()
        ? { keywords: r.keywords.split(",").map((k) => k.trim()).filter(Boolean) }
        : {},
      conclusion: r.conclusion.trim(),
      weight: Math.max(0, Math.min(1, r.weight)),
    }));
  return JSON.stringify(rules, null, 2);
}

function scoringDimensionsToJson(dims: ScoringDimension[]): string {
  const rules: Rule[] = [];
  dims
    .filter((d) => d.name.trim())
    .forEach((d) => {
      // Three synthetic rules per dimension: high / mid / low signals
      rules.push({
        id: `${d.id}-high`,
        dimension: d.name.trim(),
        condition: { keywords: d.highLabel.split(",").map((k) => k.trim()).filter(Boolean) },
        conclusion: `high_${d.name.trim().replace(/\s+/g, "_").toLowerCase()}`,
        weight: d.weight,
      });
      rules.push({
        id: `${d.id}-mid`,
        dimension: d.name.trim(),
        condition: { keywords: d.midLabel.split(",").map((k) => k.trim()).filter(Boolean) },
        conclusion: `mid_${d.name.trim().replace(/\s+/g, "_").toLowerCase()}`,
        weight: d.weight * 0.6,
      });
      rules.push({
        id: `${d.id}-low`,
        dimension: d.name.trim(),
        condition: {},
        conclusion: `low_${d.name.trim().replace(/\s+/g, "_").toLowerCase()}`,
        weight: d.weight * 0.2,
      });
    });
  return JSON.stringify(rules, null, 2);
}

function caseEntriesToJson(cases: CaseEntry[]): string {
  const rules: Rule[] = cases
    .filter((c) => c.scenario.trim() && c.expectedOutput.trim())
    .map((c) => ({
      id: c.id,
      dimension: c.dimension.trim() || "general",
      condition: {
        keywords: c.scenario
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 5),
      },
      conclusion: c.expectedOutput.slice(0, 80).replace(/\s+/g, "_").toLowerCase(),
      weight: 0.7,
    }));
  return JSON.stringify(rules, null, 2);
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

let _seq = 0;
const uid = () => `r${Date.now().toString(36)}_${++_seq}_${Math.random().toString(36).slice(2, 6)}`;

const inputStyle: React.CSSProperties = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "6px",
  color: "var(--color-text)",
  padding: "0.4rem 0.6rem",
  fontSize: "0.875rem",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--color-text-muted)",
  marginBottom: "0.25rem",
  display: "block",
};

// ── Sub-editors ───────────────────────────────────────────────────────────────

function DecisionTreeEditor({ onChange }: { onChange: (json: string) => void }) {
  const [rows, setRows] = useState<DecisionRule[]>([
    { id: uid(), dimension: "market_fit", keywords: "B2B, enterprise", conclusion: "strong_market", weight: 0.8 },
  ]);

  const update = (updated: DecisionRule[]) => {
    setRows(updated);
    onChange(decisionRulesToJson(updated));
  };

  const addRow = () =>
    update([...rows, { id: uid(), dimension: "", keywords: "", conclusion: "", weight: 0.5 }]);

  const removeRow = (id: string) => update(rows.filter((r) => r.id !== id));

  const setField = <K extends keyof DecisionRule>(id: string, key: K, val: DecisionRule[K]) =>
    update(rows.map((r) => (r.id === id ? { ...r, [key]: val } : r)));

  return (
    <div>
      <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
        Each row = one IF/THEN rule. <strong>Keywords</strong> are comma-separated triggers in the
        user query. Leave keywords blank to always fire the rule.
      </p>

      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 2fr 1.5fr 0.6fr 32px",
          gap: "0.5rem",
          marginBottom: "0.25rem",
        }}
      >
        {["Dimension", "Trigger Keywords", "Conclusion Token", "Weight", ""].map((h) => (
          <span key={h} style={labelStyle}>{h}</span>
        ))}
      </div>

      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 2fr 1.5fr 0.6fr 32px",
            gap: "0.5rem",
            marginBottom: "0.5rem",
            alignItems: "center",
          }}
        >
          <input
            style={inputStyle}
            value={row.dimension}
            placeholder="e.g. market_fit"
            aria-label={`Dimension for rule ${row.id}`}
            onChange={(e) => setField(row.id, "dimension", e.target.value)}
          />
          <input
            style={inputStyle}
            value={row.keywords}
            placeholder="B2B, enterprise, SaaS"
            aria-label={`Keywords for rule ${row.id}`}
            onChange={(e) => setField(row.id, "keywords", e.target.value)}
          />
          <input
            style={inputStyle}
            value={row.conclusion}
            placeholder="e.g. strong_market"
            aria-label={`Conclusion for rule ${row.id}`}
            onChange={(e) => setField(row.id, "conclusion", e.target.value)}
          />
          <input
            type="number"
            style={inputStyle}
            value={row.weight}
            min={0}
            max={1}
            step={0.1}
            aria-label={`Weight for rule ${row.id}`}
            onChange={(e) => setField(row.id, "weight", parseFloat(e.target.value) || 0)}
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            title="Remove rule"
            aria-label="Remove rule"
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ×
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="btn btn-outline btn-sm"
        style={{ marginTop: "0.5rem" }}
      >
        + Add Rule
      </button>
    </div>
  );
}

function ScoringMatrixEditor({ onChange }: { onChange: (json: string) => void }) {
  const [dims, setDims] = useState<ScoringDimension[]>([
    { id: uid(), name: "Team Quality", weight: 0.8, highLabel: "experienced, founder, CEO", midLabel: "engineer, developer", lowLabel: "" },
    { id: uid(), name: "Market Size", weight: 0.7, highLabel: "billion, TAM, global", midLabel: "million, regional", lowLabel: "" },
  ]);

  const update = (updated: ScoringDimension[]) => {
    setDims(updated);
    onChange(scoringDimensionsToJson(updated));
  };

  const addDim = () =>
    update([...dims, { id: uid(), name: "", weight: 0.5, highLabel: "", midLabel: "", lowLabel: "" }]);

  const removeDim = (id: string) => update(dims.filter((d) => d.id !== id));

  const setField = <K extends keyof ScoringDimension>(id: string, key: K, val: ScoringDimension[K]) =>
    update(dims.map((d) => (d.id === id ? { ...d, [key]: val } : d)));

  return (
    <div>
      <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
        Define evaluation dimensions. For each level, enter comma-separated keywords that
        indicate a high / medium / low signal in the user's query.
      </p>

      {dims.map((d) => (
        <div
          key={d.id}
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "0.75rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 0.6fr 32px",
              gap: "0.5rem",
              marginBottom: "0.75rem",
              alignItems: "end",
            }}
          >
            <div>
              <label htmlFor={`dim-name-${d.id}`} style={labelStyle}>Dimension Name</label>
              <input
                id={`dim-name-${d.id}`}
                style={inputStyle}
                value={d.name}
                placeholder="e.g. Team Quality"
                onChange={(e) => setField(d.id, "name", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`dim-weight-${d.id}`} style={labelStyle}>Weight (0-1)</label>
              <input
                id={`dim-weight-${d.id}`}
                type="number"
                style={inputStyle}
                value={d.weight}
                min={0}
                max={1}
                step={0.1}
                onChange={(e) => setField(d.id, "weight", parseFloat(e.target.value) || 0)}
              />
            </div>
            <button
              type="button"
              onClick={() => removeDim(d.id)}
              aria-label="Remove dimension"
              title="Remove dimension"
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                fontSize: "1rem",
                paddingBottom: "0.5rem",
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            <div>
              <label htmlFor={`dim-high-${d.id}`} style={{ ...labelStyle, color: "#2ecc71" }}>High signal keywords (8-10)</label>
              <input
                id={`dim-high-${d.id}`}
                style={inputStyle}
                value={d.highLabel}
                placeholder="experienced, global, billion"
                onChange={(e) => setField(d.id, "highLabel", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`dim-mid-${d.id}`} style={{ ...labelStyle, color: "#f39c12" }}>Mid signal keywords (5-7)</label>
              <input
                id={`dim-mid-${d.id}`}
                style={inputStyle}
                value={d.midLabel}
                placeholder="some, regional, million"
                onChange={(e) => setField(d.id, "midLabel", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`dim-low-${d.id}`} style={{ ...labelStyle, color: "#e74c3c" }}>Low signal keywords (1-4)</label>
              <input
                id={`dim-low-${d.id}`}
                style={inputStyle}
                value={d.lowLabel}
                placeholder="no experience, local"
                onChange={(e) => setField(d.id, "lowLabel", e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addDim}
        className="btn btn-outline btn-sm"
        style={{ marginTop: "0.25rem" }}
      >
        + Add Dimension
      </button>
    </div>
  );
}

function CaseLibraryEditor({ onChange }: { onChange: (json: string) => void }) {
  const [cases, setCases] = useState<CaseEntry[]>([
    { id: uid(), scenario: "", expectedOutput: "", dimension: "general" },
  ]);

  const update = (updated: CaseEntry[]) => {
    setCases(updated);
    onChange(caseEntriesToJson(updated));
  };

  const addCase = () =>
    update([...cases, { id: uid(), scenario: "", expectedOutput: "", dimension: "general" }]);

  const removeCase = (id: string) => update(cases.filter((c) => c.id !== id));

  const setField = <K extends keyof CaseEntry>(id: string, key: K, val: CaseEntry[K]) =>
    update(cases.map((c) => (c.id === id ? { ...c, [key]: val } : c)));

  return (
    <div>
      <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
        Describe real scenarios you've handled and the ideal response. These become
        pattern-matching examples for the rule engine.
      </p>

      {cases.map((c, i) => (
        <div
          key={c.id}
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              Case #{i + 1}
            </span>
            <button
              type="button"
              onClick={() => removeCase(c.id)}
              aria-label="Remove case"
              title="Remove case"
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label htmlFor={`case-scenario-${c.id}`} style={labelStyle}>Scenario / Input</label>
              <textarea
                id={`case-scenario-${c.id}`}
                style={{ ...inputStyle, height: "80px", resize: "vertical" }}
                value={c.scenario}
                placeholder="Describe a situation or question this skill should handle..."
                onChange={(e) => setField(c.id, "scenario", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`case-output-${c.id}`} style={labelStyle}>Expected Output / Response Direction</label>
              <textarea
                id={`case-output-${c.id}`}
                style={{ ...inputStyle, height: "80px", resize: "vertical" }}
                value={c.expectedOutput}
                placeholder="What should the skill conclude or recommend?"
                onChange={(e) => setField(c.id, "expectedOutput", e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: "0.5rem" }}>
            <label htmlFor={`case-dim-${c.id}`} style={labelStyle}>Evaluation Dimension</label>
            <input
              id={`case-dim-${c.id}`}
              style={{ ...inputStyle, maxWidth: "240px" }}
              value={c.dimension}
              placeholder="e.g. investment_decision"
              onChange={(e) => setField(c.id, "dimension", e.target.value)}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addCase}
        className="btn btn-outline btn-sm"
      >
        + Add Case
      </button>
    </div>
  );
}

// ── Main TemplateEditor export ─────────────────────────────────────────────────

type TemplateMode = "freeform" | "decision-tree" | "scoring-matrix" | "case-library";

interface TemplateEditorProps {
  value: string;
  onChange: (v: string) => void;
}

const MODES: { key: TemplateMode; label: string; hint: string }[] = [
  { key: "freeform", label: "Free-form", hint: "Plain text or Markdown" },
  { key: "decision-tree", label: "Decision Tree", hint: "IF / THEN rules with weights" },
  { key: "scoring-matrix", label: "Scoring Matrix", hint: "Dimension × signal keywords" },
  { key: "case-library", label: "Case Library", hint: "Example scenarios → conclusions" },
];

export function TemplateEditor({ value, onChange }: TemplateEditorProps) {
  const [mode, setMode] = useState<TemplateMode>("freeform");
  const [previewJson, setPreviewJson] = useState("");

  const handleTemplateChange = (json: string) => {
    setPreviewJson(json);
    onChange(json);
  };

  return (
    <div>
      {/* Mode selector */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            title={m.hint}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "20px",
              border: "1px solid",
              borderColor:
                mode === m.key ? "var(--color-primary)" : "var(--color-border)",
              background:
                mode === m.key
                  ? "rgba(var(--color-primary-rgb, 99,102,241), 0.15)"
                  : "none",
              color: mode === m.key ? "var(--color-primary)" : "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: mode === m.key ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            {m.label}
          </button>
        ))}
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-muted)",
            alignSelf: "center",
            marginLeft: "auto",
          }}
        >
          {MODES.find((m) => m.key === mode)?.hint}
        </span>
      </div>

      {/* Mode content */}
      {mode === "freeform" && (
        <MarkdownEditor
          value={value}
          onChange={onChange}
          placeholder="Describe your skill's knowledge, rules, and decision logic in plain text or markdown..."
          maxLength={50_000}
          height="320px"
        />
      )}

      {mode === "decision-tree" && (
        <div>
          <DecisionTreeEditor onChange={handleTemplateChange} />
          {previewJson && (
            <details style={{ marginTop: "1rem" }}>
              <summary
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Preview generated rules JSON
              </summary>
              <pre
                style={{
                  marginTop: "0.5rem",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  padding: "0.75rem",
                  fontSize: "0.78rem",
                  overflowX: "auto",
                  color: "var(--color-text-muted)",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {previewJson}
              </pre>
            </details>
          )}
        </div>
      )}

      {mode === "scoring-matrix" && (
        <div>
          <ScoringMatrixEditor onChange={handleTemplateChange} />
          {previewJson && (
            <details style={{ marginTop: "1rem" }}>
              <summary
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Preview generated rules JSON
              </summary>
              <pre
                style={{
                  marginTop: "0.5rem",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  padding: "0.75rem",
                  fontSize: "0.78rem",
                  overflowX: "auto",
                  color: "var(--color-text-muted)",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {previewJson}
              </pre>
            </details>
          )}
        </div>
      )}

      {mode === "case-library" && (
        <div>
          <CaseLibraryEditor onChange={handleTemplateChange} />
          {previewJson && (
            <details style={{ marginTop: "1rem" }}>
              <summary
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Preview generated rules JSON
              </summary>
              <pre
                style={{
                  marginTop: "0.5rem",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  padding: "0.75rem",
                  fontSize: "0.78rem",
                  overflowX: "auto",
                  color: "var(--color-text-muted)",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {previewJson}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
