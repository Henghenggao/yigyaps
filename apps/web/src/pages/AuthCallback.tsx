/**
 * OAuth Callback Page
 *
 * Handles the GitHub OAuth redirect and extracts the JWT token.
 *
 * License: Apache 2.0
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Win98Dialog } from "../components/Win98Dialog";

export function AuthCallback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [message, setMessage] = useState("Completing sign in...");
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const error = params.get("error");

        if (error) {
          setStatus("error");
          setMessage(`Authentication failed: ${error}`);
          setTimeout(() => navigate("/"), 3000);
          return;
        }

        setStatus("success");
        setMessage("Sign in successful! Redirecting...");
        await refreshUser();
        setTimeout(() => navigate("/"), 1000);
      } catch (err: unknown) {
        console.error("OAuth callback error:", err);
        setStatus("error");
        if (err instanceof Error) {
          setMessage(`Error: ${err.message}`);
        } else {
          setMessage("Error: An unknown error occurred");
        }
        setTimeout(() => navigate("/"), 3000);
      }
    };

    handleCallback();
  }, [navigate, refreshUser]);

  if (status === "error") {
    return (
      <Win98Dialog
        title="Sign In Error — Yig Yaps"
        icon="∴"
        footer={
          <button className="w98-btn w98-btn--default" onClick={() => navigate('/')}>OK</button>
        }
      >
        <div style={{ fontFamily: 'var(--yig-font-w98)', fontSize: 11, color: 'var(--yig-cinnabar)', padding: '8px 0' }}>
          {message || 'Authentication failed. Please try again.'}
        </div>
      </Win98Dialog>
    );
  }

  return (
    <Win98Dialog title="Signing In — Yig Yaps" icon="∴">
      <div style={{ fontFamily: 'var(--yig-font-w98)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
        <span className="spinner" /> Authenticating...
      </div>
    </Win98Dialog>
  );
}
