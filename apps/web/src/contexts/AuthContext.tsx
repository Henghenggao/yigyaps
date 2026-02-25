/**
 * Authentication Context for YigYaps
 *
 * Manages GitHub OAuth login, JWT token storage, and user session.
 *
 * License: Apache 2.0
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  githubUsername: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  tier: 'free' | 'pro' | 'epic' | 'legendary';
  role: 'user' | 'admin';
  bio?: string;
  websiteUrl?: string;
  isVerifiedCreator: boolean;
  totalPackages: number;
  totalEarningsUsd: string;
  createdAt: number;
  lastLoginAt: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100';

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('yigyaps_token');
        if (storedToken) {
          setToken(storedToken);
          await fetchUserProfile(storedToken);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        localStorage.removeItem('yigyaps_token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Fetch user profile with token
  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const userData = await response.json();
      setUser(userData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch user profile:', err);
      setError(err.message);
      // Clear invalid token
      localStorage.removeItem('yigyaps_token');
      setToken(null);
      setUser(null);
    }
  };

  // Initiate GitHub OAuth login
  const login = () => {
    window.location.href = `${API_URL}/v1/auth/github`;
  };

  // Logout user
  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('yigyaps_token');
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  // Refresh user profile
  const refreshUser = async () => {
    if (token) {
      await fetchUserProfile(token);
    }
  };

  // Handle token from OAuth callback
  const handleTokenFromCallback = (newToken: string) => {
    localStorage.setItem('yigyaps_token', newToken);
    setToken(newToken);
    fetchUserProfile(newToken);
  };

  // Expose token setter for OAuth callback
  (window as any).__yigyapsSetToken = handleTokenFromCallback;

  const value: AuthContextType = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
