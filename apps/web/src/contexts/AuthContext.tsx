/* eslint-disable react-refresh/only-export-components */
/**
 * Authentication Context for YigYaps
 *
 * Manages GitHub OAuth login, JWT token storage, and user session.
 *
 * License: Apache 2.0
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { fetchApi } from '../lib/api';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100';

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        await fetchUserProfile();
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Listen for auth expiration events (401 responses)
  useEffect(() => {
    const handleAuthExpired = () => {
      console.log('Auth expired, clearing user session');
      setUser(null);
      setError('Your session has expired. Please sign in again.');
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  // Fetch user profile securely with cookie
  const fetchUserProfile = async () => {
    try {
      const userData = await fetchApi<User>('/v1/auth/me');
      setUser(userData);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to fetch user profile:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      // Clear invalid state
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
      await fetchApi('/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setError(null);
    }
  };

  // Refresh user profile
  const refreshUser = async () => {
    await fetchUserProfile();
  };

  const value: AuthContextType = {
    user,
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
