/* eslint-disable react-refresh/only-export-components */
/**
 * Authentication Context for YigYaps
 *
 * Manages GitHub OAuth login, JWT token storage, and user session.
 *
 * License: Apache 2.0
 */

import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { API_URL, fetchApi } from "../lib/api";


// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  githubUsername: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  tier: "free" | "pro" | "epic" | "legendary";
  role: "user" | "admin";
  bio?: string;
  websiteUrl?: string;
  isVerifiedCreator: boolean;
  totalPackages: number;
  totalEarningsUsd: string;
  createdAt: number;
  lastLoginAt: number;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  loginWithGoogle: () => void;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const initRef = useRef(false);

  // Initialize auth state (with guard against React Strict Mode double-mount)
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      try {
        const userData = await fetchApi("/v1/auth/me") as User;
        setUser(userData);
      } catch (err) {
        setUser(null);
        setError(err instanceof Error ? err.message : "Authentication failed");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Listen for auth expiration events (401 responses)
  useEffect(() => {
    const handleAuthExpired = () => {
      console.log("Auth expired, clearing user session");
      setUser(null);
      setError("Your session has expired. Please sign in again.");
    };

    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, []);

  // Fetch user profile securely with cookie
  const fetchUserProfile = async () => {
    try {
      const userData = await fetchApi("/v1/auth/me") as User;
      setUser(userData);
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  };


  // Initiate GitHub OAuth login
  const login = () => {
    window.location.href = `${API_URL}/v1/auth/github`;
  };

  // Initiate Google OAuth login
  const loginWithGoogle = () => {
    window.location.href = `${API_URL}/v1/auth/google`;
  };

  // Register with Email
  const registerWithEmail = async (email: string, password: string, displayName: string) => {
    await fetchApi("/v1/auth/email/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });
    // Refresh user info since cookies are set on registration
    await fetchUserProfile();
  };

  // Login with Email
  const loginWithEmail = async (email: string, password: string) => {
    await fetchApi("/v1/auth/email/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await fetchUserProfile();
  };

  // Forgot Password
  const forgotPassword = async (email: string) => {
    await fetchApi("/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  // Logout user
  const logout = async () => {
    try {
      await fetchApi("/v1/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setError(null);
    }
  };

  // Refresh user profile
  const refreshUser = async () => {
    await fetchUserProfile();
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    loginWithGoogle,
    registerWithEmail,
    loginWithEmail,
    forgotPassword,
    logout,
    refreshUser,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
