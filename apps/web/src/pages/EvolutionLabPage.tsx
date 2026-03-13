import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Header } from "../components/Header";
import { fetchApi } from "../lib/api";
import {
  ConsentModal,
  LabApiKeyPanel,
  ChatInterface,
  RulesEditor,
  LabPageHeader,
  PrivacyWarningBanner,
  EmptyRulesState,
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
  }, [packageId, addToast]);

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

        {loadingRules || rulesNotFound ? (
          <EmptyRulesState isLoading={loadingRules} packageId={packageId} />
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
      </main>
    </div>
  );
}
