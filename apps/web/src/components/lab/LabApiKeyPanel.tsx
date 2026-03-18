interface LabApiKeyPanelProps {
  apiKey: string;
  keyDraft: string;
  onKeyDraftChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
}

export function LabApiKeyPanel({
  apiKey,
  keyDraft,
  onKeyDraftChange,
  onSave,
  onClear,
}: LabApiKeyPanelProps) {
  return (
    <div
      style={{
        marginBottom: "1.25rem",
        padding: "1rem 1.25rem",
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
      }}
    >
      <p
        style={{
          margin: "0 0 0.75rem",
          fontSize: "0.85rem",
          color: "var(--color-text-muted)",
          lineHeight: 1.6,
        }}
      >
        Enter your Anthropic API key. It is stored in{" "}
        <strong>sessionStorage only</strong> (cleared when you close this tab)
        and never saved to YigYaps servers. The data agreement for inference
        will be between you and Anthropic.
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="password"
          className="input"
          placeholder="sk-ant-..."
          value={keyDraft}
          onChange={(e) => onKeyDraftChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSave()}
          style={{ flex: 1, fontFamily: "monospace", fontSize: "0.85rem" }}
        />
        <button
          className="btn btn-primary"
          onClick={onSave}
          style={{ whiteSpace: "nowrap" }}
        >
          Save for session
        </button>
        {apiKey && (
          <button
            className="btn btn-outline"
            onClick={onClear}
            style={{
              whiteSpace: "nowrap",
              color: "#e74c3c",
              borderColor: "#e74c3c",
            }}
          >
            Clear
          </button>
        )}
      </div>
      {apiKey && (
        <p
          style={{
            margin: "0.5rem 0 0",
            fontSize: "0.78rem",
            color: "#2ecc71",
          }}
        >
          ✓ Expert key active — ends in ···{apiKey.slice(-4)}
        </p>
      )}
    </div>
  );
}
