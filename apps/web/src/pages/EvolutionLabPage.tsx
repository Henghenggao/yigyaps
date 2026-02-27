import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Header } from "../components/Header";
import { fetchApi } from "../lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  mode?: string;
}

// Session-scoped storage key — cleared when tab closes
const SESSION_KEY = "yigyaps_lab_api_key";

export function EvolutionLabPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const { user, login } = useAuth();
  const { addToast } = useToast();

  const [rules, setRules] = useState("");
  const [initialRules, setInitialRules] = useState("");
  const [loadingRules, setLoadingRules] = useState(true);
  const [rulesNotFound, setRulesNotFound] = useState(false);

  const [query, setQuery] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lab API Key — stored in sessionStorage only (lost when tab closes)
  const [labApiKey, setLabApiKey] = useState<string>(
    () => sessionStorage.getItem(SESSION_KEY) ?? "",
  );
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");

  // Consent gate — must accept once per session before first test
  const [consented, setConsented] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!packageId) return;
    fetchApi<{ plaintextRules: string }>(`/v1/security/knowledge/${packageId}`)
      .then((data) => {
        setRules(data.plaintextRules);
        setInitialRules(data.plaintextRules);
      })
      .catch((err) => {
        if (err.status === 404) setRulesNotFound(true);
        else addToast({ message: "Failed to load skill rules", type: "error" });
      })
      .finally(() => setLoadingRules(false));
  }, [packageId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const saveLabApiKey = () => {
    const trimmed = keyDraft.trim();
    if (trimmed) {
      sessionStorage.setItem(SESSION_KEY, trimmed);
      setLabApiKey(trimmed);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      setLabApiKey("");
    }
    setKeyDraft("");
    setShowKeyInput(false);
    addToast({ message: "API key saved for this session", type: "success" });
  };

  const clearLabApiKey = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setLabApiKey("");
    addToast({ message: "API key cleared", type: "success" });
  };

  const doTest = async (userMessage: string) => {
    setChat((prev) => [...prev, { role: "user", content: userMessage }]);
    setTesting(true);
    try {
      const body: Record<string, string> = { user_query: userMessage };
      if (labApiKey) body.lab_api_key = labApiKey;

      const data = await fetchApi<{
        conclusion: string;
        mode: string;
        privacy_notice: string;
      }>(`/v1/security/invoke/${packageId}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setChat((prev) => [
        ...prev,
        { role: "assistant", content: data.conclusion, mode: data.mode },
      ]);
    } catch {
      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: failed to invoke skill. Check console for details.",
          mode: "error",
        },
      ]);
    } finally {
      setTesting(false);
    }
  };

  const handleTest = () => {
    const userMessage = query.trim();
    if (!userMessage || testing) return;
    setQuery("");

    if (!consented) {
      setPendingQuery(userMessage);
      setShowConsentModal(true);
      return;
    }

    doTest(userMessage);
  };

  const handleConsentAccept = () => {
    setConsented(true);
    setShowConsentModal(false);
    if (pendingQuery) {
      doTest(pendingQuery);
      setPendingQuery(null);
    }
  };

  const handleEvolve = async () => {
    if (!rules.trim() || saving) return;
    if (rules === initialRules) {
      addToast({ message: "No changes to save", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await fetchApi(`/v1/security/knowledge/${packageId}`, {
        method: "POST",
        body: JSON.stringify({ plaintextRules: rules }),
      });
      setInitialRules(rules);
      addToast({
        message: "Rules evolved and re-encrypted successfully",
        type: "success",
      });
    } catch {
      addToast({ message: "Failed to save evolved rules", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const isDirty = rules !== initialRules;

  const modeLabel: Record<string, { text: string; color: string }> = {
    "lab-preview-expert-key": { text: "Lab · Your Key", color: "#2ecc71" },
    "lab-preview-platform-key": {
      text: "Lab · Platform Key",
      color: "#e67e22",
    },
    mock: { text: "Mock", color: "#95a5a6" },
  };

  return (
    <div className="app-container">
      <Header user={user} login={login} />

      {/* ── Consent Modal ── */}
      {showConsentModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "var(--color-card)",
              border: "1px solid #e67e22",
              borderRadius: "14px",
              padding: "2rem 2.5rem",
              maxWidth: "480px",
              width: "90%",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
              ⚠️
            </div>
            <h2
              style={{ fontSize: "1.2rem", margin: "0 0 1rem", color: "#e67e22" }}
            >
              Lab Preview — Data Notice
            </h2>
            <p
              style={{
                color: "var(--color-text-muted)",
                lineHeight: 1.7,
                marginBottom: "0.75rem",
              }}
            >
              This is a <strong>lab testing mode</strong>. When you click
              "Test", your skill's plaintext rules will be transmitted to{" "}
              <strong>api.anthropic.com</strong> as an LLM system prompt.
            </p>
            <p
              style={{
                color: "var(--color-text-muted)",
                lineHeight: 1.7,
                marginBottom: "1.5rem",
              }}
            >
              {labApiKey
                ? "You are using your own API key — the data agreement is between you and Anthropic."
                : "You are using the YigYaps platform key. This is for testing only and is not the production security model."}
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--color-text-muted)",
                marginBottom: "1.5rem",
                padding: "0.75rem",
                background: "rgba(230,126,34,0.08)",
                borderRadius: "6px",
                border: "1px solid rgba(230,126,34,0.2)",
              }}
            >
              Production agent invocations will use a TEE-isolated compute
              environment (Phase 3). The lab is for author tuning only.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleConsentAccept}
              >
                I understand — proceed
              </button>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowConsentModal(false);
                  setPendingQuery(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <main
        className="main-content"
        style={{ maxWidth: "1400px", margin: "0 auto" }}
      >
        {/* ── Page header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.25rem",
              }}
            >
              <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Evolution Lab</h1>
              <span
                style={{
                  fontSize: "0.65rem",
                  padding: "0.15rem 0.5rem",
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid var(--color-primary)",
                  borderRadius: "4px",
                  color: "var(--color-primary)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Beta
              </span>
            </div>
            <p
              style={{
                color: "var(--color-text-muted)",
                margin: 0,
                fontSize: "0.875rem",
              }}
            >
              Skill:{" "}
              <Link
                to={`/skill/${packageId}`}
                style={{ color: "var(--color-primary)" }}
              >
                {packageId}
              </Link>
            </p>
          </div>
          <Link
            to="/my-packages"
            className="btn btn-outline"
            style={{ fontSize: "0.85rem" }}
          >
            ← My Skills
          </Link>
        </div>

        {/* ── Privacy Warning Banner ── */}
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.85rem 1.25rem",
            background: "rgba(230,126,34,0.08)",
            border: "1px solid rgba(230,126,34,0.35)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "1px" }}>
            ⚠️
          </span>
          <div style={{ flex: 1, fontSize: "0.85rem", lineHeight: 1.6 }}>
            <strong style={{ color: "#e67e22" }}>Lab Preview Mode</strong>
            {" — "}
            Inference sends your plaintext rules to an external LLM provider (Anthropic).
            This is a <em>testing-only</em> environment. Production agent invocations
            will use a TEE-isolated proxy.{" "}
            <button
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                cursor: "pointer",
                padding: 0,
                fontSize: "0.85rem",
                textDecoration: "underline",
              }}
              onClick={() => setShowKeyInput((v) => !v)}
            >
              {labApiKey
                ? "✓ Using your own API key"
                : "Use your own Anthropic key to control data handling →"}
            </button>
          </div>
        </div>

        {/* ── API Key Settings Panel ── */}
        {showKeyInput && (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: "1rem 1.25rem",
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
            }}
          >
            <p
              style={{
                margin: "0 0 0.75rem",
                fontSize: "0.85rem",
                color: "var(--color-text-muted)",
                lineHeight: 1.6,
              }}
            >
              Enter your Anthropic API key. It is stored in{" "}
              <strong>sessionStorage only</strong> (cleared when you close this
              tab) and never saved to YigYaps servers. The data agreement for
              inference will be between you and Anthropic.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="password"
                className="input"
                placeholder="sk-ant-..."
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveLabApiKey()}
                style={{ flex: 1, fontFamily: "monospace", fontSize: "0.85rem" }}
              />
              <button
                className="btn btn-primary"
                onClick={saveLabApiKey}
                style={{ whiteSpace: "nowrap" }}
              >
                Save for session
              </button>
              {labApiKey && (
                <button
                  className="btn btn-outline"
                  onClick={clearLabApiKey}
                  style={{ whiteSpace: "nowrap", color: "#e74c3c", borderColor: "#e74c3c" }}
                >
                  Clear
                </button>
              )}
            </div>
            {labApiKey && (
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontSize: "0.78rem",
                  color: "#2ecc71",
                }}
              >
                ✓ Expert key active — ends in ···
                {labApiKey.slice(-4)}
              </p>
            )}
          </div>
        )}

        {loadingRules ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem",
              color: "var(--color-text-muted)",
            }}
          >
            Decrypting skill rules…
          </div>
        ) : rulesNotFound ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
            <h2 style={{ margin: "0 0 0.75rem" }}>No knowledge uploaded yet</h2>
            <p
              style={{
                color: "var(--color-text-muted)",
                marginBottom: "1.5rem",
              }}
            >
              Publish this skill with encrypted rules first via the Publish
              wizard.
            </p>
            <Link to="/publish" className="btn btn-primary">
              Go to Publish
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.25rem",
              alignItems: "start",
            }}
          >
            {/* ── Left: Rules Editor ── */}
            <div
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>Rules Editor</span>
                  {isDirty && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.75rem",
                        color: "#e67e22",
                      }}
                    >
                      ● unsaved changes
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {rules.length.toLocaleString()} chars
                </span>
              </div>

              <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Your skill's plaintext rules will appear here…"
                style={{
                  width: "100%",
                  minHeight: "460px",
                  padding: "1rem 1.25rem",
                  background: "transparent",
                  color: "var(--color-text)",
                  border: "none",
                  resize: "vertical",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.82rem",
                  lineHeight: 1.6,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderTop: "1px solid var(--color-border)",
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <button
                  className="btn btn-primary"
                  style={{
                    opacity: isDirty && !saving ? 1 : 0.5,
                    cursor: isDirty && !saving ? "pointer" : "not-allowed",
                  }}
                  disabled={!isDirty || saving}
                  onClick={handleEvolve}
                >
                  {saving ? "Encrypting…" : "Evolve & Save Rules"}
                </button>
                {isDirty && (
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: "0.85rem" }}
                    onClick={() => setRules(initialRules)}
                  >
                    Discard
                  </button>
                )}
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--color-text-muted)",
                    marginLeft: "auto",
                  }}
                >
                  Saved rules are AES-256-GCM encrypted
                </span>
              </div>
            </div>

            {/* ── Right: Chat / Test Panel ── */}
            <div
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                height: "580px",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontWeight: 600 }}>Test Inference</span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "4px",
                    background: labApiKey
                      ? "rgba(46,204,113,0.12)"
                      : "rgba(230,126,34,0.12)",
                    color: labApiKey ? "#2ecc71" : "#e67e22",
                    border: `1px solid ${labApiKey ? "rgba(46,204,113,0.3)" : "rgba(230,126,34,0.3)"}`,
                    fontWeight: 600,
                  }}
                >
                  {labApiKey ? "Your Key" : "Platform Key"}
                </span>
              </div>

              {/* Chat history */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {chat.length === 0 && !testing ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-text-muted)",
                      fontSize: "0.875rem",
                      textAlign: "center",
                    }}
                  >
                    Send a test message to see how your skill responds.
                    <br />
                    <br />
                    Your first message will show a data notice.
                  </div>
                ) : (
                  chat.map((msg, i) => (
                    <div key={i}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            msg.role === "user" ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "85%",
                            padding: "0.65rem 1rem",
                            borderRadius:
                              msg.role === "user"
                                ? "12px 12px 2px 12px"
                                : "12px 12px 12px 2px",
                            background:
                              msg.role === "user"
                                ? "var(--color-primary)"
                                : "var(--color-bg)",
                            color:
                              msg.role === "user"
                                ? "#fff"
                                : "var(--color-text)",
                            fontSize: "0.875rem",
                            lineHeight: 1.5,
                            border:
                              msg.role === "assistant"
                                ? "1px solid var(--color-border)"
                                : "none",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                      {msg.role === "assistant" && msg.mode && modeLabel[msg.mode] && (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: modeLabel[msg.mode].color,
                            marginTop: "0.25rem",
                            paddingLeft: "0.25rem",
                          }}
                        >
                          ● {modeLabel[msg.mode].text}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {testing && (
                  <div
                    style={{
                      alignSelf: "flex-start",
                      padding: "0.65rem 1rem",
                      borderRadius: "12px 12px 12px 2px",
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.875rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Invoking skill…
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div
                style={{
                  padding: "0.75rem 1.25rem",
                  borderTop: "1px solid var(--color-border)",
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <input
                  type="text"
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleTest();
                    }
                  }}
                  placeholder={
                    consented ? "Enter a test query…" : "Enter a query (you'll see a data notice first)…"
                  }
                  disabled={testing}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleTest}
                  disabled={!query.trim() || testing}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Test
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
