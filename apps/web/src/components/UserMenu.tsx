/**
 * User Menu Component
 *
 * Displays user avatar, name, and dropdown menu for authenticated users.
 *
 * License: Apache 2.0
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'transparent',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '0.5rem 0.75rem',
          color: '#e0e0e0',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00ff88'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
            }}
          />
        ) : (
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#00ff88',
            color: '#0a0a0a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 'bold',
          }}>
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span>{user.displayName}</span>
        <span style={{
          fontSize: '0.65rem',
          padding: '0.15rem 0.35rem',
          background: '#00ff8820',
          color: '#00ff88',
          borderRadius: '4px',
          textTransform: 'uppercase',
        }}>
          {user.tier}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              right: 0,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '0.5rem',
              minWidth: '200px',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ padding: '0.75rem', borderBottom: '1px solid #333' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {user.displayName}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#888' }}>
                @{user.githubUsername}
              </div>
            </div>

            <div style={{ padding: '0.25rem' }}>
              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  background: 'transparent',
                  border: 'none',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                My Packages
              </button>

              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  background: 'transparent',
                  border: 'none',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Settings
              </button>

              <div style={{ borderTop: '1px solid #333', margin: '0.25rem 0' }} />

              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  background: 'transparent',
                  border: 'none',
                  color: '#ff4444',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
