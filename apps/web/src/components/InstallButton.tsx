/**
 * Install Button Component
 *
 * Handles skill installation with tier checking, payment, and state management.
 *
 * License: Apache 2.0
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { YigYapsRegistryClient } from '@yigyaps/client';
import type { SkillPackage } from '@yigyaps/types';
import { TIER_RANK, getTierName, canAccessTier } from '../utils/tierHelpers';

interface InstallButtonProps {
  skill: SkillPackage;
  onInstallSuccess?: () => void;
}

type InstallStatus = 'idle' | 'checking_tier' | 'installing' | 'success' | 'error';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export function InstallButton({ skill, onInstallSuccess }: InstallButtonProps) {
  const { user, token, login } = useAuth();
  const [status, setStatus] = useState<InstallStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Check if user is not logged in
  if (!user) {
    return (
      <button className="btn btn-primary btn-large" onClick={login}>
        Sign In to Install
      </button>
    );
  }

  // Check if user's tier is sufficient
  const tierLocked = !canAccessTier(user.tier, skill.requiredTier);

  const handleInstall = async () => {
    setError(null);
    setStatus('checking_tier');

    // Frontend tier check
    if (tierLocked) {
      setStatus('error');
      setError(`Requires ${getTierName(skill.requiredTier)} tier or higher`);
      return;
    }

    setStatus('installing');

    try {
      const client = new YigYapsRegistryClient({
        baseUrl,
        apiKey: token || undefined,
      });

      // Call install API
      await client.install({
        packageId: skill.packageId,
        yigbotId: user.id, // Use userId as agentId for web installs
        userTier: user.tier,
        configuration: {},
      });

      // Success
      setStatus('success');
      onInstallSuccess?.();

      // Auto-reset to idle after 2 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    } catch (err: any) {
      console.error('Installation failed:', err);
      setStatus('error');

      // Extract user-friendly error message
      const errorMessage = err.message || 'Installation failed';

      // Parse specific error cases
      if (errorMessage.includes('tier')) {
        setError(`Requires ${getTierName(skill.requiredTier)} tier or higher`);
      } else if (errorMessage.includes('sold out') || errorMessage.includes('edition limit')) {
        setError('This limited edition is sold out');
      } else if (errorMessage.includes('already installed')) {
        setError('Already installed');
      } else {
        setError(errorMessage);
      }
    }
  };

  // Render button based on status
  const renderButton = () => {
    // Tier locked state
    if (tierLocked && status === 'idle') {
      return (
        <button className="btn btn-primary btn-large install-btn-locked" disabled>
          Requires {getTierName(skill.requiredTier)}
        </button>
      );
    }

    // Status-based rendering
    switch (status) {
      case 'checking_tier':
      case 'installing':
        return (
          <button className="btn btn-primary btn-large install-btn-loading" disabled>
            <span className="spinner" />
            Installing...
          </button>
        );

      case 'success':
        return (
          <button className="btn btn-primary btn-large install-btn-success" disabled>
            Installed
          </button>
        );

      case 'error':
        return (
          <button className="btn btn-primary btn-large install-btn-error" onClick={handleInstall}>
            Retry
          </button>
        );

      case 'idle':
      default:
        const priceLabel = skill.priceUsd > 0 ? `Install - $${skill.priceUsd}` : 'Install Free';
        return (
          <button className="btn btn-primary btn-large" onClick={handleInstall}>
            {priceLabel}
          </button>
        );
    }
  };

  return (
    <div className="install-button-container">
      {renderButton()}
      {error && status === 'error' && (
        <div className="install-error-message">{error}</div>
      )}
    </div>
  );
}
