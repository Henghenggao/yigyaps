import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { fetchApi } from "../lib/api";
import { sanitizeUrl } from "../utils/sanitizeUrl";
import { Win98Window } from "../components/Win98Window";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
  expiresAt: number | null;
}

export function SettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState<"api-keys" | "profile" | "payout">("api-keys");
  const [payoutStatus, setPayoutStatus] = useState<{
    connected: boolean;
    stripeAccountId: string | null;
    details_submitted: boolean | null;
    payouts_enabled: boolean | null;
  } | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "payout") return;
    setPayoutLoading(true);
    fetchApi<typeof payoutStatus>("/v1/stripe/connect/status")
      .then((data) => setPayoutStatus(data))
      .catch(() => addToast({ message: "Failed to load payout status", type: "error" }))
      .finally(() => setPayoutLoading(false));
  }, [tab, addToast]);

  useEffect(() => {
    if (tab !== "api-keys") return;
    setLoading(true);
    fetchApi<{ apiKeys: ApiKey[] }>("/v1/auth/api-keys")
      .then((data) => setApiKeys(data.apiKeys ?? []))
      .catch(() => addToast({ message: "Failed to load API keys", type: "error" }))
      .finally(() => setLoading(false));
  }, [tab, addToast]);

  const handleGenerate = async () => {
    if (!newKeyName.trim()) {
      addToast({ message: "Please enter a name for this key", type: "warning" });
      return;
    }
    setGenerating(true);
    try {
      const data = await fetchApi<ApiKey & { key: string }>(
        "/v1/auth/api-keys",
        {
          method: "POST",
          body: JSON.stringify({
            name: newKeyName.trim(),
            accepted_anti_training_terms: true,
          }),
        },
      );
      setGeneratedKey(data.key);
      setApiKeys((prev) => [{
        id: data.id,
        name: data.name,
        keyPrefix: data.keyPrefix,
        scopes: data.scopes,
        createdAt: data.createdAt,
        lastUsedAt: null,
        revokedAt: null,
        expiresAt: data.expiresAt,
      }, ...prev]);
      setNewKeyName("");
      setShowNewKeyForm(false);
    } catch {
      addToast({ message: "Failed to generate API key", type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (key: ApiKey) => {
    if (!window.confirm(`Revoke key "${key.name}"? This cannot be undone.`)) return;
    setRevoking(key.id);
    try {
      await fetchApi(`/v1/auth/api-keys/${key.id}`, { method: "DELETE" });
      setApiKeys((prev) => prev.filter((k) => k.id !== key.id));
      addToast({ message: `Key "${key.name}" revoked`, type: "success" });
    } catch {
      addToast({ message: "Failed to revoke key", type: "error" });
    } finally {
      setRevoking(null);
    }
  };

  const formatDate = (ts: number | null) =>
    ts ? new Date(ts).toLocaleDateString() : "Never";

  const safeAvatar = user ? sanitizeUrl(user.avatarUrl) : null;

  return (
    <Win98Window
      title="⚙ Settings — Yig Yaps"
      icon="⚙"
      tabs={[
        { label: "API Keys", active: tab === "api-keys", onClick: () => setTab("api-keys") },
        { label: "Payout", active: tab === "payout", onClick: () => setTab("payout") },
        { label: "Profile", active: tab === "profile", onClick: () => setTab("profile") },
      ]}
    >
      {tab === "api-keys" && (
        <fieldset className="settings-groupbox">
          <legend className="settings-legend">API Keys</legend>

          {/* Generated key banner */}
          {generatedKey && (
            <div
              style={{
                background: "#1e3a2f",
                border: "1px solid #2ecc71",
                borderRadius: "4px",
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "#2ecc71" }}>
                Your new API key — copy it now, it won&apos;t be shown again
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: "4px", padding: "0.5rem 0.75rem" }}>
                <code style={{ flex: 1, wordBreak: "break-all", fontSize: "0.85rem", color: "rgba(255,255,255,0.9)", fontFamily: "monospace" }}>
                  {generatedKey}
                </code>
                <button className="w98-btn" onClick={handleCopy} style={{ flexShrink: 0 }}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#2ecc71", marginTop: "0.5rem" }}>
                Use with CLI: <code>yigyaps login</code> — paste this key when prompted
              </div>
              <button
                className="w98-btn"
                style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}
                onClick={() => setGeneratedKey(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="settings-row" style={{ marginBottom: "1rem" }}>
            <span className="settings-label">
              API keys allow the CLI and external tools to authenticate on your behalf.
              To use the CLI: <code>yigyaps login</code>
            </span>
            <button
              className="w98-btn w98-btn--default"
              onClick={() => setShowNewKeyForm(!showNewKeyForm)}
            >
              + Generate New Key
            </button>
          </div>

          {showNewKeyForm && (
            <fieldset className="settings-groupbox" style={{ marginBottom: "1rem" }}>
              <legend className="settings-legend">New Key</legend>
              <div className="settings-row">
                <label className="settings-label">
                  Key name (e.g. "My Laptop", "CI Pipeline")
                </label>
                <input
                  className="w98-input"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="My development key"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  style={{ flex: 1 }}
                />
                <button
                  className="w98-btn w98-btn--default"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? "Generating..." : "Generate"}
                </button>
                <button
                  className="w98-btn"
                  onClick={() => setShowNewKeyForm(false)}
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          )}

          {loading ? (
            <div style={{ color: "var(--color-text-muted)", padding: "0.5rem 0" }}>
              Loading keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="empty-state">
              No API keys yet. Generate one to use the CLI.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="settings-row"
                  style={{
                    border: "1px solid var(--color-border)",
                    padding: "0.75rem",
                    opacity: key.revokedAt ? 0.5 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{key.name}</div>
                    <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                      {key.keyPrefix}••••••••
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                      Created {formatDate(key.createdAt)} · Last used{" "}
                      {formatDate(key.lastUsedAt)}
                      {key.revokedAt ? " · REVOKED" : ""}
                    </div>
                  </div>
                  {!key.revokedAt && (
                    <button
                      className="w98-btn"
                      style={{ fontSize: "0.8rem", color: "#e74c3c" }}
                      disabled={revoking === key.id}
                      onClick={() => handleRevoke(key)}
                    >
                      {revoking === key.id ? "Revoking..." : "Revoke"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </fieldset>
      )}

      {tab === "payout" && (
        <fieldset className="settings-groupbox">
          <legend className="settings-legend">Payout Settings</legend>
          <p className="settings-label" style={{ marginBottom: "1rem" }}>
            Connect your Stripe account to receive your 70% creator royalties.
            Stripe handles all payouts — funds arrive T+2 business days.
          </p>

          {payoutLoading ? (
            <div style={{ color: "var(--color-text-muted)" }}>Loading…</div>
          ) : (
            <div style={{ border: "1px solid var(--color-border)", padding: "1.25rem" }}>
              {payoutStatus?.connected ? (
                <>
                  <div className="settings-row" style={{ marginBottom: "1rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>Stripe account connected</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                        {payoutStatus.stripeAccountId}
                      </div>
                    </div>
                  </div>
                  <div className="settings-row" style={{ marginBottom: "1rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        fontSize: "0.8rem",
                        background: payoutStatus.details_submitted ? "#1e3a2f" : "#3a1e1e",
                        color: payoutStatus.details_submitted ? "#2ecc71" : "#e74c3c",
                        border: `1px solid ${payoutStatus.details_submitted ? "#2ecc71" : "#e74c3c"}`,
                      }}
                    >
                      {payoutStatus.details_submitted ? "Details submitted" : "Details pending"}
                    </span>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        fontSize: "0.8rem",
                        background: payoutStatus.payouts_enabled ? "#1e3a2f" : "#3a1e1e",
                        color: payoutStatus.payouts_enabled ? "#2ecc71" : "#e74c3c",
                        border: `1px solid ${payoutStatus.payouts_enabled ? "#2ecc71" : "#e74c3c"}`,
                      }}
                    >
                      {payoutStatus.payouts_enabled ? "Payouts enabled" : "Payouts not yet enabled"}
                    </span>
                  </div>
                  {!payoutStatus.payouts_enabled && (
                    <a href="/v1/stripe/connect/onboard" className="w98-btn">
                      Complete Stripe onboarding →
                    </a>
                  )}
                </>
              ) : (
                <>
                  <p style={{ marginBottom: "1rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                    You haven't connected a Stripe account yet. Connect now to receive payouts when users subscribe to your skills.
                  </p>
                  <a href="/v1/stripe/connect/onboard" className="w98-btn w98-btn--default">
                    Connect with Stripe →
                  </a>
                </>
              )}
            </div>
          )}

          <div style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid var(--color-border)", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            <strong>Revenue split:</strong> 70% to you · 30% platform fee.
            Stripe settles T+2 business days. Monthly aggregation via Stripe Connect Standard.
          </div>
        </fieldset>
      )}

      {tab === "profile" && user && (
        <fieldset className="settings-groupbox">
          <legend className="settings-legend">Profile</legend>
          <div className="settings-row" style={{ marginBottom: "1.5rem", alignItems: "center" }}>
            {safeAvatar ? (
              <img
                src={safeAvatar}
                alt={user.displayName}
                style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.75rem",
                  fontWeight: 700,
                }}
              >
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{user.displayName}</div>
              {user.githubUsername && (
                <div style={{ color: "var(--color-text-muted)" }}>@{user.githubUsername}</div>
              )}
              {user.email && !user.githubUsername && (
                <div style={{ color: "var(--color-text-muted)" }}>{user.email}</div>
              )}
              <span
                style={{
                  display: "inline-block",
                  marginTop: "0.4rem",
                  padding: "0.2rem 0.5rem",
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {user.tier} tier
              </span>
            </div>
          </div>
          {user.githubUsername ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              Profile information is sourced from GitHub. Update your profile at{" "}
              <a href="https://github.com/settings/profile" target="_blank" rel="noopener noreferrer">
                github.com/settings/profile
              </a>
              .
            </p>
          ) : (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              Signed in with email. Profile settings coming soon.
            </p>
          )}
        </fieldset>
      )}
    </Win98Window>
  );
}
