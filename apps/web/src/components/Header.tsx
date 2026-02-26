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
      <Link to="/" className="logo" style={{ textDecoration: "none" }}>
        Yig<span>Yaps</span>
      </Link>
      <nav className="nav-links">
        <Link to="/">Marketplace</Link>
        <Link to="/publish">Publish Skill</Link>
        <a href="#creators">Creators</a>
        <a href="#docs">Docs</a>
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
