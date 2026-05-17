import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import { ApiError, fetchApi } from "../lib/api";
import {
  LabApiKeyPanel,
  ChatInterface,
  RulesEditor,
  LabPageHeader,
  PrivacyWarningBanner,
  EmptyRulesState,
} from "../components/lab";
import type { ChatMessage } from "../components/lab";
import { Win98Window } from "../components/Win98Window";
import { Win98Dialog } from "../components/Win98Dialog";

// Session-scoped storage key — cleared when tab closes
const SESSION_KEY = "yigyaps_lab_api_key";
const EXPERT_SHARE_HEADER = "x-yigyaps-expert-share";

function expertShareSessionKey(packageId: string): string {
  return `yigyaps_expert_share:${packageId}`;
}

export function EvolutionLabPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const { addToast } = useToast();

  const [rules, setRules] = useState("");
  const [initialRules, setInitialRules] = useState("");
  const [loadingRules, setLoadingRules] = useState(true);
  const [rulesNotFound, setRulesNotFound] = useState(false);
  const [shareRequired, setShareRequired] = useState(false);
  const [expertShare, setExpertShare] = useState("");
  const [expertSharePackageId, setExpertSharePackageId] = useState<string>();
  const [shareDraft, setShareDraft] = useState("");

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
    const savedShare = sessionStorage.getItem(expertShareSessionKey(packageId)) ?? "";
    setExpertShare(savedShare);
    setExpertSharePackageId(packageId);
    setShareDraft(savedShare);
  }, [packageId]);

  useEffect(() => {
    if (!packageId || expertSharePackageId !== packageId) return;
    const headers: Record<string, string> = {};
    if (expertShare) {
      headers[EXPERT_SHARE_HEADER] = expertShare;
    }

    setLoadingRules(true);
    fetchApi<{ plaintextRules: string }>(`/v1/security/knowledge/${packageId}`, {
      headers,
    })
      .then((data) => {
        setRules(data.plaintextRules);
        setInitialRules(data.plaintextRules);
        setRulesNotFound(false);
        setShareRequired(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setRulesNotFound(true);
          setShareRequired(false);
        } else if (
          err instanceof ApiError &&
          err.status === 400 &&
          JSON.stringify(err.data ?? {}).includes("expert share")
        ) {
          setShareRequired(true);
          setRulesNotFound(false);
        } else {
          addToast({ message: "Failed to load skill rules", type: "error" });
        }
      })
      .finally(() => setLoadingRules(false));
  }, [packageId, expertSharePackageId, expertShare, addToast]);

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

  const saveExpertShare = () => {
    if (!packageId) return;
    const trimmed = shareDraft.trim();
    if (trimmed) {
      sessionStorage.setItem(expertShareSessionKey(packageId), trimmed);
      setExpertShare(trimmed);
      addToast({ message: "Expert share saved for this session", type: "success" });
    } else {
      sessionStorage.removeItem(expertShareSessionKey(packageId));
      setExpertShare("");
      setShareRequired(true);
      addToast({ message: "Expert share cleared", type: "success" });
    }
  };

  const clearExpertShare = () => {
    if (!packageId) return;
    sessionStorage.removeItem(expertShareSessionKey(packageId));
    setExpertShare("");
    setShareDraft("");
    setShareRequired(true);
    addToast({ message: "Expert share cleared", type: "success" });
  };

  const doTest = async (userMessage: string) => {
    setChat((prev) => [...prev, { role: "user", content: userMessage }]);
    setTesting(true);
    try {
      const body: Record<string, string> = { user_query: userMessage };
      if (labApiKey) body.lab_api_key = labApiKey;
      if (expertShare) body.expert_share = expertShare;

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
      const data = await fetchApi<{ expert_share?: string }>(`/v1/security/knowledge/${packageId}`, {
        method: "POST",
        body: JSON.stringify({ plaintextRules: rules }),
      });
      if (data.expert_share && packageId) {
        sessionStorage.setItem(expertShareSessionKey(packageId), data.expert_share);
        setExpertShare(data.expert_share);
        setShareDraft(data.expert_share);
        setShareRequired(false);
      }
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
  const showRulesPlaceholder = loadingRules || rulesNotFound || shareRequired;

  return (
    <>
      {showConsentModal && (
        <Win98Dialog
          title="⚠️ Lab Preview — Data Notice"
          icon="⚠️"
          onClose={handleConsentDecline}
          footer={
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="w98-btn w98-btn--default" onClick={handleConsentAccept}>
                I understand — proceed
              </button>
              <button className="w98-btn" onClick={handleConsentDecline}>
                Cancel
              </button>
            </div>
          }
        >
          <p style={{ lineHeight: 1.7, marginBottom: "0.75rem" }}>
            This is a <strong>lab testing mode</strong>. When you click "Test",
            your skill's plaintext rules will be transmitted to{" "}
            <strong>api.anthropic.com</strong> as an LLM system prompt.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "1rem" }}>
            {labApiKey
              ? "You are using your own API key — the data agreement is between you and Anthropic."
              : "You are using the Yig Yaps platform key. This is for testing only and is not the production security model."}
          </p>
          <p
            style={{
              fontSize: "0.8rem",
              padding: "0.75rem",
              background: "rgba(230,126,34,0.08)",
              border: "1px solid rgba(230,126,34,0.2)",
              borderRadius: "4px",
              marginBottom: 0,
            }}
          >
            Production agent invocations will use a TEE-isolated compute
            environment (Phase 3). The lab is for author tuning only.
          </p>
        </Win98Dialog>
      )}

      <Win98Window
        title={`🧪 Evolution Lab — ${packageId ?? ""}`}
        icon="🧪"
        statusBar="Experimental · API key required"
      >
        <LabPageHeader packageId={packageId} />

        <PrivacyWarningBanner
          hasApiKey={!!labApiKey}
          onToggleApiKey={() => setShowKeyInput((v) => !v)}
        />

        {showKeyInput && (
          <LabApiKeyPanel
            apiKey={labApiKey}
            keyDraft={keyDraft}
            onKeyDraftChange={setKeyDraft}
            onSave={saveLabApiKey}
            onClear={clearLabApiKey}
          />
        )}

        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.85rem 1.25rem",
            background: shareRequired
              ? "rgba(231,76,60,0.08)"
              : "var(--color-card)",
            border: shareRequired
              ? "1px solid rgba(231,76,60,0.35)"
              : "1px solid var(--color-border)",
            borderRadius: "8px",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1 1 160px" }}>
            <strong>Expert share</strong>
            <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
              {expertShare ? "Available for this session" : "Required to decrypt rules"}
            </div>
          </div>
          <input
            type="password"
            value={shareDraft}
            onChange={(event) => setShareDraft(event.target.value)}
            placeholder="Paste share_index 2"
            style={{
              flex: "2 1 260px",
              minWidth: "180px",
              padding: "0.55rem 0.7rem",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.78rem",
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-primary" onClick={saveExpertShare}>
              Save
            </button>
            {expertShare && (
              <button className="btn btn-outline" onClick={clearExpertShare}>
                Clear
              </button>
            )}
          </div>
        </div>

        {showRulesPlaceholder ? (
          shareRequired ? (
            <div
              style={{
                minHeight: "320px",
                display: "grid",
                placeItems: "center",
                color: "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                background: "var(--color-card)",
                textAlign: "center",
                padding: "2rem",
              }}
            >
              Enter the expert share to load and test encrypted rules.
            </div>
          ) : (
            <EmptyRulesState isLoading={loadingRules} packageId={packageId} />
          )
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.25rem",
              alignItems: "start",
            }}
          >
            <RulesEditor
              rules={rules}
              isDirty={isDirty}
              isSaving={saving}
              onRulesChange={setRules}
              onSave={handleEvolve}
              onDiscard={() => setRules(initialRules)}
            />

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
      </Win98Window>
    </>
  );
}
