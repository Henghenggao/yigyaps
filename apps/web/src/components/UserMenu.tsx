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
