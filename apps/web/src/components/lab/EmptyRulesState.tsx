import { Link } from "react-router-dom";

interface EmptyRulesStateProps {
  isLoading: boolean;
  packageId: string | undefined;
}

export function EmptyRulesState({ isLoading, packageId: _packageId }: EmptyRulesStateProps) {
  if (isLoading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "4rem",
          color: "var(--color-text-muted)",
        }}
      >
        Decrypting skill rules…
      </div>
    );
  }

  return (
    <div
      style={{
        textAlign: "center",
        padding: "4rem 2rem",
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
      }}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
      <h2 style={{ margin: "0 0 0.75rem" }}>No knowledge uploaded yet</h2>
      <p
        style={{
          color: "var(--color-text-muted)",
          marginBottom: "1.5rem",
        }}
      >
        Publish this skill with encrypted rules first via the Publish wizard.
      </p>
      <Link to="/publish" className="btn btn-primary">
        Go to Publish
      </Link>
    </div>
  );
}
