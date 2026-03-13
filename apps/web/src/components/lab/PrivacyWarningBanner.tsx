interface PrivacyWarningBannerProps {
  hasApiKey: boolean;
  onToggleApiKey: () => void;
}

export function PrivacyWarningBanner({
  hasApiKey,
  onToggleApiKey,
}: PrivacyWarningBannerProps) {
  return (
    <div
      style={{
        marginBottom: "1.25rem",
        padding: "0.85rem 1.25rem",
        background: "rgba(230,126,34,0.08)",
        border: "1px solid rgba(230,126,34,0.35)",
        borderRadius: "8px",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
      }}
    >
      <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "1px" }}>
        ⚠️
      </span>
      <div style={{ flex: 1, fontSize: "0.85rem", lineHeight: 1.6 }}>
        <strong style={{ color: "#e67e22" }}>Lab Preview Mode</strong>
        {" — "}
        Inference sends your plaintext rules to an external LLM provider
        (Anthropic). This is a <em>testing-only</em> environment. Production
        agent invocations will use a TEE-isolated proxy.{" "}
        <button
          style={{
            background: "none",
            border: "none",
            color: "var(--color-primary)",
            cursor: "pointer",
            padding: 0,
            fontSize: "0.85rem",
            textDecoration: "underline",
          }}
          onClick={onToggleApiKey}
        >
          {hasApiKey
            ? "✓ Using your own API key"
            : "Use your own Anthropic key to control data handling →"}
        </button>
      </div>
    </div>
  );
}
