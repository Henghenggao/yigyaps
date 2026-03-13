import { Link } from "react-router-dom";

interface LabPageHeaderProps {
  packageId: string | undefined;
}

export function LabPageHeader({ packageId }: LabPageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "1rem",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.25rem",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Evolution Lab</h1>
          <span
            style={{
              fontSize: "0.65rem",
              padding: "0.15rem 0.5rem",
              background: "rgba(99,102,241,0.15)",
              border: "1px solid var(--color-primary)",
              borderRadius: "4px",
              color: "var(--color-primary)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Beta
          </span>
        </div>
        <p
          style={{
            color: "var(--color-text-muted)",
            margin: 0,
            fontSize: "0.875rem",
          }}
        >
          Skill:{" "}
          <Link
            to={`/skill/${packageId}`}
            style={{ color: "var(--color-primary)" }}
          >
            {packageId}
          </Link>
        </p>
      </div>
      <Link
        to="/my-packages"
        className="btn btn-outline"
        style={{ fontSize: "0.85rem" }}
      >
        ← My Skills
      </Link>
    </div>
  );
}
