import { Link } from "react-router-dom";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
  user: {
    id: string;
    displayName: string;
    githubUsername: string;
    avatarUrl?: string;
    tier: string;
  } | null;
  login: () => void;
}

export function Header({ user, login }: HeaderProps) {
  return (
    <header className="header">
      <Link to="/" className="logo" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        Yig<span>Yaps</span>
        <span
          style={{
            display: "inline-block",
            padding: "0.15rem 0.45rem",
            background: "rgba(var(--color-primary-rgb, 99,102,241), 0.15)",
            border: "1px solid var(--color-primary)",
            borderRadius: "4px",
            fontSize: "0.6rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-primary)",
            verticalAlign: "middle",
            lineHeight: 1.4,
          }}
        >
          Alpha
        </span>
      </Link>
      <nav className="nav-links">
        <Link to="/">Marketplace</Link>
        <Link to="/publish">Publish Skill</Link>
        <Link to="/?sortBy=rating">Top Creators</Link>
        <a href="/docs" target="_blank" rel="noopener noreferrer">API Docs</a>
      </nav>
      <div className="header-actions">
        {user ? (
          <UserMenu />
        ) : (
          <button className="btn btn-outline" onClick={login}>
            Sign In
          </button>
        )}
        <button
          className="btn btn-primary"
          disabled
          title="Coming soon - Connect your AI agent to access installed skills"
          style={{ opacity: 0.6, cursor: "not-allowed" }}
        >
          Connect Agent
        </button>
      </div>
    </header>
  );
}
