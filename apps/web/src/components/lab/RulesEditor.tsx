interface RulesEditorProps {
  rules: string;
  isDirty: boolean;
  isSaving: boolean;
  onRulesChange: (value: string) => void;
  onSave: () => void;
  onDiscard: () => void;
}

export function RulesEditor({
  rules,
  isDirty,
  isSaving,
  onRulesChange,
  onSave,
  onDiscard,
}: RulesEditorProps) {
  return (
    <div
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <span style={{ fontWeight: 600 }}>Rules Editor</span>
          {isDirty && (
            <span
              style={{
                marginLeft: "0.5rem",
                fontSize: "0.75rem",
                color: "#e67e22",
              }}
            >
              ● unsaved changes
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-muted)",
          }}
        >
          {rules.length.toLocaleString()} chars
        </span>
      </div>

      <textarea
        value={rules}
        onChange={(e) => onRulesChange(e.target.value)}
        placeholder="Your skill's plaintext rules will appear here…"
        style={{
          width: "100%",
          minHeight: "460px",
          padding: "1rem 1.25rem",
          background: "transparent",
          color: "var(--color-text)",
          border: "none",
          resize: "vertical",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.82rem",
          lineHeight: 1.6,
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      <div
        style={{
          padding: "1rem 1.25rem",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
        }}
      >
        <button
          className="btn btn-primary"
          style={{
            opacity: isDirty && !isSaving ? 1 : 0.5,
            cursor: isDirty && !isSaving ? "pointer" : "not-allowed",
          }}
          disabled={!isDirty || isSaving}
          onClick={onSave}
        >
          {isSaving ? "Encrypting…" : "Evolve & Save Rules"}
        </button>
        {isDirty && (
          <button
            className="btn btn-outline"
            style={{ fontSize: "0.85rem" }}
            onClick={onDiscard}
          >
            Discard
          </button>
        )}
        <span
          style={{
            fontSize: "0.72rem",
            color: "var(--color-text-muted)",
            marginLeft: "auto",
          }}
        >
          Saved rules are AES-256-GCM encrypted
        </span>
      </div>
    </div>
  );
}
