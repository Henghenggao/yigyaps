import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Header } from "../components/Header";
import { fetchApi } from "../lib/api";
import {
  ConsentModal,
  LabApiKeyPanel,
  ChatInterface,
  RulesEditor,
} from "../components/lab";
import type { ChatMessage } from "../components/lab";

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

  const handleConsentDecline = () => {
    setShowConsentModal(false);
    setPendingQuery(null);
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

  return (
    <div className="app-container">
      <Header user={user} login={login} />

      <ConsentModal
        isOpen={showConsentModal}
        hasApiKey={!!labApiKey}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />

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
            Inference sends your plaintext rules to an external LLM provider
            (Anthropic). This is a <em>testing-only</em> environment. Production
            agent invocations will use a TEE-isolated proxy.{" "}
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
          <LabApiKeyPanel
            apiKey={labApiKey}
            keyDraft={keyDraft}
            onKeyDraftChange={setKeyDraft}
            onSave={saveLabApiKey}
            onClear={clearLabApiKey}
          />
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
            <RulesEditor
              rules={rules}
              isDirty={isDirty}
              isSaving={saving}
              onRulesChange={setRules}
              onSave={handleEvolve}
              onDiscard={() => setRules(initialRules)}
            />

            {/* ── Right: Chat / Test Panel ── */}
            <ChatInterface
              messages={chat}
              input={query}
              onInputChange={setQuery}
              onSend={handleTest}
              isLoading={testing}
              consented={consented}
              apiKey={labApiKey}
            />
          </div>
        )}
      </main>
    </div>
  );
}
