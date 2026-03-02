import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { sanitizeUrl } from "../utils/sanitizeUrl";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  // Sanitize avatar URL to prevent XSS via javascript: protocol
  const safeAvatarUrl = sanitizeUrl(user.avatarUrl);

  return (
    <div className="user-menu-wrapper">
      <style>{`
        .user-menu-wrapper {
          position: relative;
        }
        .user-menu-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 0.4rem 0.75rem;
          cursor: pointer;
          font-size: 0.9rem;
          color: var(--color-text-main);
          transition: var(--transition);
        }
        .user-menu-btn:hover {
          border-color: var(--color-primary);
        }
        .user-avatar-img {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          display: block;
          flex-shrink: 0;
        }
        .user-avatar-fallback {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--color-accent-bg);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }
        .user-tier-badge {
          font-size: 0.65rem;
          text-transform: uppercase;
          background: var(--color-accent-bg);
          color: var(--color-primary);
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          font-weight: 700;
        }
        .user-menu-overlay {
          position: fixed;
          inset: 0;
          z-index: 99;
        }
        .user-menu-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          min-width: 200px;
          box-shadow: var(--shadow-hover);
          z-index: 100;
          overflow: hidden;
        }
        .user-menu-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--color-border);
        }
        .user-menu-username {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .user-menu-handle {
          font-size: 0.8rem;
          color: var(--color-text-sub);
          margin-top: 0.2rem;
        }
        .user-menu-body {
          padding: 0.5rem 0;
        }
        .user-menu-item {
          display: block;
          width: 100%;
          padding: 0.65rem 1.25rem;
          font-size: 0.9rem;
          color: var(--color-text-main);
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          transition: var(--transition);
        }
        .user-menu-item:hover {
          background: var(--color-bg);
          color: var(--color-primary);
        }
        .user-menu-divider {
          height: 1px;
          background: var(--color-border);
          margin: 0.4rem 0;
        }
        .user-menu-signout {
          color: #E55;
        }
        .user-menu-signout:hover {
          background: var(--color-bg);
          color: #C33;
        }
      `}</style>
      <button className="user-menu-btn" onClick={() => setIsOpen(!isOpen)}>
        {safeAvatarUrl ? (
          <img
            src={safeAvatarUrl}
            alt={user.displayName}
            className="user-avatar-img"
          />
        ) : (
          <div className="user-avatar-fallback">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span>{user.displayName}</span>
        <span className="user-tier-badge">{user.tier}</span>
      </button>

      {isOpen && (
        <>
          <div className="user-menu-overlay" onClick={() => setIsOpen(false)} />
          <div className="user-menu-dropdown">
            <div className="user-menu-header">
              <div className="user-menu-username">{user.displayName}</div>
              <div className="user-menu-handle">@{user.githubUsername}</div>
            </div>

            <div className="user-menu-body">
              <Link
                to="/my-packages"
                className="user-menu-item"
                onClick={() => setIsOpen(false)}
                style={{ textDecoration: "none", display: "block" }}
              >
                My Packages
              </Link>

              <Link
                to="/settings"
                className="user-menu-item"
                onClick={() => setIsOpen(false)}
                style={{ textDecoration: "none", display: "block" }}
              >
                Settings
              </Link>

              <div className="user-menu-divider" />

              <button
                className="user-menu-item user-menu-signout"
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
