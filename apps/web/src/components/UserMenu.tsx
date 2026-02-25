import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="user-menu-wrapper">
      <button
        className="user-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="user-avatar-img"
          />
        ) : (
          <div className="user-avatar-fallback">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span>{user.displayName}</span>
        <span className="user-tier-badge">
          {user.tier}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="user-menu-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="user-menu-dropdown">
            <div className="user-menu-header">
              <div className="user-menu-username">
                {user.displayName}
              </div>
              <div className="user-menu-handle">
                @{user.githubUsername}
              </div>
            </div>

            <div className="user-menu-body">
              <button className="user-menu-item">
                My Packages
              </button>

              <button className="user-menu-item">
                Settings
              </button>

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
