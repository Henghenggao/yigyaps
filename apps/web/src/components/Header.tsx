import { Link } from "react-router-dom";
import { UserMenu } from "./UserMenu";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3100";

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
      <Link to="/" className="logo">
        <img src="/logo.png" alt="" style={{ width: "32px", height: "32px" }} />
        Yig<span>Yaps</span>
        <span className="badge-alpha">Alpha</span>
      </Link>
      <nav className="nav-links">
        <Link to="/">Marketplace</Link>
        <Link to="/publish">Publish Skill</Link>
        <Link to="/?sortBy=rating">Top Creators</Link>
        <a href={`${API_URL}/docs`} target="_blank" rel="noopener noreferrer">
          API Docs
        </a>
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
        >
          Connect Agent
        </button>
        <a
          href="https://github.com/Henghenggao/yigyaps"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
          title="View on GitHub"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </a>
      </div>
    </header>
  );
}
