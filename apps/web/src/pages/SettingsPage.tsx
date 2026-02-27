import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Header } from "../components/Header";
import { fetchApi } from "../lib/api";
import { sanitizeUrl } from "../utils/sanitizeUrl";

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
  const { user, login } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState<"api-keys" | "profile">("api-keys");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "api-keys") return;
    setLoading(true);
    fetchApi<{ keys: ApiKey[] }>("/v1/auth/api-keys")
      .then((data) => setApiKeys(data.keys ?? []))
      .catch(() => addToast({ message: "Failed to load API keys", type: "error" }))
      .finally(() => setLoading(false));
  }, [tab]);

  const handleGenerate = async () => {
    if (!newKeyName.trim()) {
      addToast({ message: "Please enter a name for this key", type: "warning" });
      return;
    }
    setGenerating(true);
    try {
      const data = await fetchApi<{ key: string; apiKey: ApiKey }>(
        "/v1/auth/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: newKeyName.trim() }),
        },
      );
      setGeneratedKey(data.key);
      setApiKeys((prev) => [data.apiKey, ...prev]);
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
    <div className="app-container">
      <Header user={user} login={login} />

      <main className="main-content" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "1.5rem" }}>Settings</h1>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "0",
            borderBottom: "1px solid var(--color-border)",
            marginBottom: "2rem",
          }}
        >
          {(["api-keys", "profile"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "none",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent",
                padding: "0.75rem 1.25rem",
                cursor: "pointer",
                color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)",
                fontWeight: tab === t ? 600 : 400,
                fontSize: "0.95rem",
              }}
            >
              {t === "api-keys" ? "API Keys" : "Profile"}
            </button>
          ))}
        </div>

        {tab === "api-keys" && (
          <div>
            {/* Generated key banner */}
            {generatedKey && (
              <div
                style={{
                  background: "#1e3a2f",
                  border: "1px solid #2ecc71",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: "#2ecc71",
                  }}
                >
                  Your new API key — copy it now, it won&apos;t be shown again
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: "6px",
                    padding: "0.75rem",
                  }}
                >
                  <code style={{ flex: 1, wordBreak: "break-all", fontSize: "0.85rem" }}>
                    {generatedKey}
                  </code>
                  <button className="btn btn-outline" onClick={handleCopy} style={{ flexShrink: 0 }}>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div
                  style={{ fontSize: "0.8rem", color: "#2ecc71", marginTop: "0.75rem" }}
                >
                  Use with CLI: <code>yigyaps login</code> — paste this key when prompted
                </div>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    marginTop: "0.5rem",
                    padding: 0,
                  }}
                  onClick={() => setGeneratedKey(null)}
                >
                  Dismiss
                </button>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>API Keys</h2>
              <button
                className="btn btn-primary"
                onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                style={{ fontSize: "0.875rem" }}
              >
                + Generate New Key
              </button>
            </div>

            {showNewKeyForm && (
              <div
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-end",
                }}
              >
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem" }}>
                    Key name (e.g. "My Laptop", "CI Pipeline")
                  </label>
                  <input
                    className="publish-input"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="My development key"
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    style={{ width: "100%" }}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? "Generating..." : "Generate"}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setShowNewKeyForm(false)}
                >
                  Cancel
                </button>
              </div>
            )}

            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
              API keys allow the CLI and external tools to authenticate on your behalf.
              To use the CLI: <code>yigyaps login</code>
            </p>

            {loading ? (
              <div style={{ color: "var(--color-text-muted)", padding: "1rem 0" }}>
                Loading keys...
              </div>
            ) : apiKeys.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2.5rem",
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "10px",
                }}
              >
                <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                  No API keys yet. Generate one to use the CLI.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      padding: "1rem 1.25rem",
                      opacity: key.revokedAt ? 0.5 : 1,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{key.name}</div>
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          color: "var(--color-text-muted)",
                          marginTop: "0.2rem",
                        }}
                      >
                        {key.keyPrefix}••••••••
                      </div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--color-text-muted)",
                          marginTop: "0.2rem",
                        }}
                      >
                        Created {formatDate(key.createdAt)} · Last used{" "}
                        {formatDate(key.lastUsedAt)}
                        {key.revokedAt ? " · REVOKED" : ""}
                      </div>
                    </div>
                    {!key.revokedAt && (
                      <button
                        className="btn btn-outline"
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
          </div>
        )}

        {tab === "profile" && user && (
          <div
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "10px",
              padding: "2rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}
            >
              {safeAvatar ? (
                <img
                  src={safeAvatar}
                  alt={user.displayName}
                  style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2rem",
                    fontWeight: 700,
                  }}
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{user.displayName}</div>
                <div style={{ color: "var(--color-text-muted)" }}>@{user.githubUsername}</div>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "0.5rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "20px",
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
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              Profile information is sourced from GitHub. Update your profile at{" "}
              <a href="https://github.com/settings/profile" target="_blank" rel="noopener noreferrer">
                github.com/settings/profile
              </a>
              .
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
