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
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="brand-logo">
          <div className="logo-icon">Y</div>
          <span className="brand-name">YigYaps</span>
          <span className="alpha-tag">Alpha</span>
        </Link>

        <nav className="site-nav">
          <Link to="/marketplace" className="nav-link">Marketplace</Link>
          <Link to="/publish" className="nav-link">Publish</Link>
          <a href={`${API_URL}/docs`} target="_blank" rel="noopener noreferrer" className="nav-link">
            Docs
          </a>
        </nav>

        <div className="header-actions">
          {user ? (
            <UserMenu />
          ) : (
            <button className="auth-btn" onClick={login}>
              Sign In
            </button>
          )}

          <a
            href="https://github.com/Henghenggao/yigyaps"
            target="_blank"
            rel="noopener noreferrer"
            className="github-button"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>

      <style>{`
        .site-header {
          padding: 1.25rem 0;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-surface);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
        }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
        }
        .logo-icon {
          width: 44px;
          height: 44px;
          background: var(--color-logo-bg);
          color: white;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-family: var(--font-serif);
          font-size: 1.6rem;
          position: relative;
        }
        .logo-icon::after {
          content: '';
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background: var(--color-dot);
          border-radius: 50%;
        }
        .brand-name {
          font-family: var(--font-serif);
          font-size: 1.85rem;
          font-weight: 700;
          color: var(--color-text-main);
          letter-spacing: -0.015em;
        }
        .alpha-tag {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
          padding: 0.3rem 0.7rem;
          border-radius: 2px;
          font-weight: 600;
          margin-left: 0.8rem;
          line-height: 1;
        }
        .site-nav {
          display: flex;
          gap: 3.5rem;
        }
        .nav-link {
          font-family: var(--font-sans);
          font-weight: 500;
          color: var(--color-text-sub);
          font-size: 1.05rem;
          transition: var(--transition);
        }
        .nav-link:hover {
          color: var(--color-primary);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .auth-btn {
          font-family: var(--font-sans);
          background: transparent;
          border: 1px solid var(--color-border);
          padding: 0.75rem 1.75rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          color: var(--color-text-main);
          transition: var(--transition);
        }
        .auth-btn:hover {
          background: var(--color-bg);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
        .github-button {
          color: var(--color-text-sub);
          transition: var(--transition);
          display: flex;
          align-items: center;
        }
        .github-button:hover {
          color: var(--color-text-main);
        }
      `}</style>
    </header>
  );
}
