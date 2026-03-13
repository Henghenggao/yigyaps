interface ConsentModalProps {
  isOpen: boolean;
  hasApiKey: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentModal({
  isOpen,
  hasApiKey,
  onAccept,
  onDecline,
}: ConsentModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "var(--color-card)",
          border: "1px solid #e67e22",
          borderRadius: "14px",
          padding: "2rem 2.5rem",
          maxWidth: "480px",
          width: "90%",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚠️</div>
        <h2
          style={{ fontSize: "1.2rem", margin: "0 0 1rem", color: "#e67e22" }}
        >
          Lab Preview — Data Notice
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: 1.7,
            marginBottom: "0.75rem",
          }}
        >
          This is a <strong>lab testing mode</strong>. When you click "Test",
          your skill's plaintext rules will be transmitted to{" "}
          <strong>api.anthropic.com</strong> as an LLM system prompt.
        </p>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: 1.7,
            marginBottom: "1.5rem",
          }}
        >
          {hasApiKey
            ? "You are using your own API key — the data agreement is between you and Anthropic."
            : "You are using the YigYaps platform key. This is for testing only and is not the production security model."}
        </p>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--color-text-muted)",
            marginBottom: "1.5rem",
            padding: "0.75rem",
            background: "rgba(230,126,34,0.08)",
            borderRadius: "6px",
            border: "1px solid rgba(230,126,34,0.2)",
          }}
        >
          Production agent invocations will use a TEE-isolated compute
          environment (Phase 3). The lab is for author tuning only.
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={onAccept}
          >
            I understand — proceed
          </button>
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={onDecline}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
