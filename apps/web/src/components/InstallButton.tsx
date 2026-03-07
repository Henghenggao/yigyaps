/**
 * Install Button Component
 *
 * Handles skill installation with tier checking, payment, and state management.
 *
 * License: Apache 2.0
 */

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { API_URL } from "../lib/api";
import type { SkillPackage } from "@yigyaps/types";
import { getTierName, canAccessTier } from "../utils/tierHelpers";

interface InstallButtonProps {
  skill: SkillPackage;
  onInstallSuccess?: () => void;
}

type InstallStatus =
  | "idle"
  | "checking_tier"
  | "installing"
  | "success"
  | "error";

export function InstallButton({ skill, onInstallSuccess }: InstallButtonProps) {
  const { user, openAuthModal } = useAuth();
  const [status, setStatus] = useState<InstallStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Check if user is not logged in
  if (!user) {
    return (
      <button className="btn btn-primary btn-large" onClick={openAuthModal}>
        Sign In to Install
      </button>
    );
  }

  // Check if user's tier is sufficient
  const tierLocked = !canAccessTier(user.tier, skill.requiredTier);

  const handleInstall = async () => {
    setStatus("checking_tier");
    setError(null);

    try {
      setStatus("installing");
      const res = await fetch(`${API_URL}/v1/installations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId: skill.packageId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Install failed (${res.status})`);
      }

      setStatus("success");
      onInstallSuccess?.();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Installation failed");
      setStatus("error");
    }
  };

  // Render button based on status
  const renderButton = () => {
    // Tier locked state
    if (tierLocked && status === "idle") {
      return (
        <button
          className="btn btn-primary btn-large install-btn-locked"
          disabled
        >
          Requires {getTierName(skill.requiredTier)}
        </button>
      );
    }

    // Status-based rendering
    switch (status) {
      case "checking_tier":
      case "installing":
        return (
          <button
            className="btn btn-primary btn-large install-btn-loading"
            disabled
          >
            <span className="spinner" />
            Installing...
          </button>
        );

      case "success":
        return (
          <button
            className="btn btn-primary btn-large install-btn-success"
            disabled
          >
            Installed
          </button>
        );

      case "error":
        return (
          <button
            className="btn btn-primary btn-large install-btn-error"
            onClick={handleInstall}
          >
            Retry
          </button>
        );

      case "idle":
      default: {
        const priceLabel =
          skill.priceUsd > 0 ? `Install - $${skill.priceUsd}` : "Install Free";
        return (
          <button className="btn btn-primary btn-large" onClick={handleInstall}>
            {priceLabel}
          </button>
        );
      }
    }
  };

  return (
    <div className="install-button-container">
      {renderButton()}
      {error && status === "error" && (
        <div className="install-error-message">{error}</div>
      )}
    </div>
  );
}
