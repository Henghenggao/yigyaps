import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { fetchApi } from "../lib/api";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { TemplateEditor } from "../components/TemplateEditor";
import { Win98Window } from "../components/Win98Window";
import { Win98Wizard } from "../components/Win98Wizard";
import { Win98Dialog } from "../components/Win98Dialog";
import { PACKAGE_ID_DESCRIPTION, isValidPackageId } from "@yigyaps/types";

const CATEGORIES = [
  { value: "development", label: "Development" },
  { value: "communication", label: "Communication" },
  { value: "productivity", label: "Productivity" },
  { value: "research", label: "Research & Analysis" },
  { value: "integration", label: "Integration" },
  { value: "data", label: "Data & Knowledge" },
  { value: "automation", label: "Automation" },
  { value: "security", label: "Security & Privacy" },
  { value: "ai-ml", label: "AI & Machine Learning" },
  { value: "personality", label: "Personality & Style" },
  { value: "wisdom", label: "Domain Wisdom" },
  { value: "voice", label: "Voice & Tone" },
  { value: "likeness", label: "Likeness & Brand" },
  { value: "other", label: "Other" },
] as const;

const LICENSES = [
  { value: "open-source", label: "Open Source (Free)" },
  { value: "free", label: "Free (Closed Source)" },
  { value: "premium", label: "Premium (Paid)" },
  { value: "enterprise", label: "Enterprise" },
] as const;

const MATURITIES = [
  { value: "experimental", label: "Experimental" },
  { value: "beta", label: "Beta" },
  { value: "stable", label: "Stable" },
  { value: "deprecated", label: "Deprecated" },
] as const;

interface Step1Data {
  packageId: string;
  version: string;
  displayName: string;
  description: string;
  category: string;
  tags: string[];
  maturity: string;
  license: string;
  priceUsd: number;
}

interface Step2Data {
  readme: string;
  authorName: string;
  authorUrl: string;
  icon: string;
  repositoryUrl: string;
  homepageUrl: string;
}

interface Step3Data {
  rules: string;
}

type FormData = Step1Data & Step2Data & Step3Data;

const STEPS = [
  { label: "Basic Info" },
  { label: "Details & README" },
  { label: "Knowledge Rules" },
];

export function PublishSkillPage() {
  const { user, openAuthModal } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [packageIdAvailable, setPackageIdAvailable] = useState<boolean | null>(null);
  const [checkingId, setCheckingId] = useState(false);
  const [publishedSkill, setPublishedSkill] = useState<{
    packageId: string;
    expertShare: string;
  } | null>(null);
  const [expertShareConfirmed, setExpertShareConfirmed] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    packageId: "",
    version: "1.0.0",
    displayName: "",
    description: "",
    category: "other",
    tags: [],
    maturity: "experimental",
    license: "open-source",
    priceUsd: 0,
    readme: "",
    authorName: user?.displayName || user?.githubUsername || "",
    authorUrl: user ? `https://github.com/${user.githubUsername}` : "",
    icon: "",
    repositoryUrl: "",
    homepageUrl: "",
    rules: "",
  });

  if (!user) {
    return (
      <Win98Window title="⬆ Publish a Skill — Sign In Required" icon="⬆">
        <div className="empty-state">
          <p>You must be signed in to publish a new secure skill.</p>
          <button className="w98-btn w98-btn--default" onClick={openAuthModal} style={{ marginTop: 8 }}>
            Sign In Now
          </button>
        </div>
      </Win98Window>
    );
  }

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "priceUsd") {
      set("priceUsd", parseFloat(value) || 0);
    } else {
      set(name as keyof FormData, value as FormData[keyof FormData]);
    }
  };

  const checkPackageId = async (id: string) => {
    if (!isValidPackageId(id)) {
      setPackageIdAvailable(null);
      return;
    }
    setCheckingId(true);
    try {
      await fetchApi(`/v1/packages/by-pkg/${encodeURIComponent(id)}`);
      setPackageIdAvailable(false); // 200 means it exists
    } catch {
      setPackageIdAvailable(true); // 404 means it's available
    } finally {
      setCheckingId(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      set("tags", [...formData.tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => set("tags", formData.tags.filter((t) => t !== tag));

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!isValidPackageId(formData.packageId)) {
        return PACKAGE_ID_DESCRIPTION;
      }
      if (packageIdAvailable === false) return "This Package ID is already taken.";
      if (!formData.version.match(/^\d+\.\d+\.\d+/)) return "Version must follow semver (e.g. 1.0.0).";
      if (!formData.displayName.trim()) return "Display name is required.";
      if (formData.description.trim().length < 10) return "Description must be at least 10 characters.";
    }
    if (s === 2) {
      if (!formData.rules.trim()) return "Knowledge rules are required.";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      addToast({ message: err, type: "warning" });
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleCancel = () => navigate("/");

  const handleSubmit = async () => {
    const err = validateStep(2);
    if (err) {
      addToast({ message: err, type: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Create package
      const pkg = await fetchApi<{ id: string; packageId: string }>("/v1/packages", {
        method: "POST",
        body: JSON.stringify({
          packageId: formData.packageId,
          version: formData.version,
          displayName: formData.displayName,
          description: formData.description,
          readme: formData.readme || undefined,
          authorName: formData.authorName,
          authorUrl: formData.authorUrl || undefined,
          category: formData.category,
          tags: formData.tags,
          maturity: formData.maturity,
          license: formData.license,
          priceUsd: formData.priceUsd,
          icon: formData.icon || undefined,
          repositoryUrl: formData.repositoryUrl || undefined,
          homepageUrl: formData.homepageUrl || undefined,
        }),
      });

      // Step 2: Encrypt and store knowledge rules
      const encryptedKnowledge = await fetchApi<{ expert_share?: string }>(
        `/v1/security/knowledge/${formData.packageId}`,
        {
          method: "POST",
          body: JSON.stringify({ plaintextRules: formData.rules }),
        },
      );
      if (encryptedKnowledge.expert_share) {
        sessionStorage.setItem(
          `yigyaps_expert_share:${formData.packageId}`,
          encryptedKnowledge.expert_share,
        );
        setPublishedSkill({
          packageId: pkg.packageId,
          expertShare: encryptedKnowledge.expert_share,
        });
        setExpertShareConfirmed(false);
        addToast({
          message: "Skill published. Save your expert share to continue.",
          type: "success",
        });
        return;
      }

      addToast({ message: "Skill published successfully!", type: "success" });
      navigate(`/skill/${pkg.packageId}`);
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : "Failed to publish skill",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyExpertShare = async () => {
    if (!publishedSkill) return;
    if (!navigator.clipboard?.writeText) {
      addToast({
        message: "Clipboard unavailable. Select and copy the share manually.",
        type: "warning",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(publishedSkill.expertShare);
      addToast({ message: "Expert share copied", type: "success" });
    } catch {
      addToast({
        message: "Copy failed. Select and copy the share manually.",
        type: "warning",
      });
    }
  };

  const continueAfterShareSaved = () => {
    if (!publishedSkill || !expertShareConfirmed) return;
    navigate(`/skill/${publishedSkill.packageId}`);
  };

  return (
    <>
      {publishedSkill && (
        <Win98Dialog
          title="Save Expert Share"
          icon="*"
          footer={
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button className="w98-btn" type="button" onClick={copyExpertShare}>
                Copy Share
              </button>
              <button
                className="w98-btn w98-btn--default"
                type="button"
                disabled={!expertShareConfirmed}
                onClick={continueAfterShareSaved}
              >
                Continue
              </button>
            </div>
          }
        >
          <p style={{ lineHeight: 1.7, marginBottom: "0.75rem" }}>
            This expert share is required to retrieve, evolve, and securely
            invoke this skill. YigYaps does not store a copy, so save it before
            leaving this screen.
          </p>
          <textarea
            aria-label="Expert share"
            readOnly
            value={publishedSkill.expertShare}
            className="w98-input"
            style={{
              width: "100%",
              minHeight: "96px",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.78rem",
              resize: "vertical",
              marginBottom: "0.85rem",
            }}
            onFocus={(event) => event.currentTarget.select()}
          />
          <label
            style={{
              display: "flex",
              gap: "0.55rem",
              alignItems: "flex-start",
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={expertShareConfirmed}
              onChange={(event) => setExpertShareConfirmed(event.target.checked)}
              style={{ marginTop: "0.2rem" }}
            />
            <span>I saved this expert share somewhere durable.</span>
          </label>
        </Win98Dialog>
      )}

      <Win98Window
      title="⬆ Publish a Skill — New YAP Wizard"
      icon="⬆"
      statusBar={
        <>
          <div className="w98-statusbar__panel w98-statusbar__panel--grow">
            Step {step + 1} of {STEPS.length} · {STEPS[step].label}
          </div>
          <div className="w98-statusbar__panel">
            <span style={{ color: "var(--yig-phosphor)" }}>●</span> Draft saved
          </div>
        </>
      }
    >
      <Win98Wizard
        title="Publish Your YAP Skill"
        steps={STEPS}
        currentStep={step}
        onBack={step > 0 ? handleBack : undefined}
        onNext={step < STEPS.length - 1 ? handleNext : handleSubmit}
        onCancel={handleCancel}
        nextLabel={step === STEPS.length - 1 ? (submitting ? "Publishing..." : "Publish →") : "Next →"}
      >
        {/* ── Step 0: Basic Info ── */}
        {step === 0 && (
          <div>
            <div className="wizard-field">
              <label className="wizard-label">Package ID *</label>
              <div style={{ position: "relative" }}>
                <input
                  name="packageId"
                  value={formData.packageId}
                  onChange={(e) => {
                    handleChange(e);
                    const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
                    set("packageId", v);
                    checkPackageId(v);
                  }}
                  placeholder="e.g. legal-contract-reviewer"
                  className="w98-input"
                  style={{ width: "100%", paddingRight: "7rem" }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "0.78rem",
                    color:
                      checkingId
                        ? "var(--color-text-muted)"
                        : packageIdAvailable === true
                          ? "#2ecc71"
                          : packageIdAvailable === false
                            ? "#e74c3c"
                            : "transparent",
                  }}
                >
                  {checkingId ? "checking..." : packageIdAvailable === true ? "✓ available" : packageIdAvailable === false ? "✗ taken" : ""}
                </div>
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>
                Lowercase letters, numbers, hyphens only. This is permanent.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <label className="wizard-label">Version *</label>
                <input name="version" value={formData.version} onChange={handleChange} placeholder="1.0.0" className="w98-input" style={{ width: "100%" }} />
              </div>
              <div>
                <label className="wizard-label">Maturity</label>
                <select name="maturity" value={formData.maturity} onChange={handleChange} className="w98-input" style={{ width: "100%" }}>
                  {MATURITIES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <div className="wizard-field">
              <label className="wizard-label">Display Name *</label>
              <input name="displayName" value={formData.displayName} onChange={handleChange} placeholder="Legal Contract Reviewer Pro" className="w98-input" style={{ width: "100%" }} />
            </div>

            <div className="wizard-field">
              <label className="wizard-label">Short Description * (10-500 characters)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="A secure skill that reviews contracts for loopholes and identifies risk clauses."
                className="w98-input"
                style={{ width: "100%", resize: "vertical" }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "right" }}>
                {formData.description.length}/500
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <label className="wizard-label">Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w98-input" style={{ width: "100%" }}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="wizard-label">License</label>
                <select name="license" value={formData.license} onChange={handleChange} className="w98-input" style={{ width: "100%" }}>
                  {LICENSES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            {(formData.license === "premium" || formData.license === "enterprise") && (
              <div className="wizard-field">
                <label className="wizard-label">Price (USD)</label>
                <input name="priceUsd" type="number" min={0} max={9999} step={0.01} value={formData.priceUsd} onChange={handleChange} className="w98-input" style={{ width: "100%" }} />
              </div>
            )}

            <div className="wizard-field">
              <label className="wizard-label">Tags (up to 10)</label>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag..."
                  className="w98-input"
                  style={{ flex: 1 }}
                />
                <button type="button" className="w98-btn" onClick={addTag}>Add</button>
              </div>
              {formData.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.2rem 0.6rem",
                        background: "var(--color-primary)",
                        color: "#fff",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, fontSize: "0.9rem", lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 1: Details & README ── */}
        {step === 1 && (
          <div>
            <div className="wizard-field">
              <label className="wizard-label">README (Markdown)</label>
              <MarkdownEditor
                value={formData.readme}
                onChange={(v) => set("readme", v)}
                placeholder="# My Skill&#10;&#10;Describe what this skill does, how to use it, and what makes it valuable..."
                maxLength={5000}
                height="320px"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <label className="wizard-label">Author Name *</label>
                <input name="authorName" value={formData.authorName} onChange={handleChange} placeholder="Your Name" className="w98-input" style={{ width: "100%" }} />
              </div>
              <div>
                <label className="wizard-label">Author URL</label>
                <input name="authorUrl" value={formData.authorUrl} onChange={handleChange} placeholder="https://yoursite.com" className="w98-input" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="wizard-field">
              <label className="wizard-label">Icon URL</label>
              <input name="icon" value={formData.icon} onChange={handleChange} placeholder="https://example.com/icon.png" className="w98-input" style={{ width: "100%" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <label className="wizard-label">Repository URL</label>
                <input name="repositoryUrl" value={formData.repositoryUrl} onChange={handleChange} placeholder="https://github.com/..." className="w98-input" style={{ width: "100%" }} />
              </div>
              <div>
                <label className="wizard-label">Homepage URL</label>
                <input name="homepageUrl" value={formData.homepageUrl} onChange={handleChange} placeholder="https://yoursite.com" className="w98-input" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Knowledge Rules ── */}
        {step === 2 && (
          <div>
            <div
              style={{
                background: "rgba(46, 204, 113, 0.08)",
                border: "1px solid rgba(46, 204, 113, 0.3)",
                borderRadius: "8px",
                padding: "1rem 1.25rem",
                marginBottom: "1.5rem",
                fontSize: "0.85rem",
                color: "var(--color-text-muted)",
              }}
            >
              <div style={{ fontWeight: 600, color: "#2ecc71", marginBottom: "0.4rem" }}>
                Encryption Guarantee
              </div>
              Your rules are sent over TLS and immediately encrypted with AES-256-GCM at the server. The plaintext
              never touches disk — only the ciphertext is stored. Rules are decrypted only in volatile memory during
              sandbox execution.
            </div>

            <div className="wizard-field">
              <label className="wizard-label">Expert IP Rules *</label>
              <TemplateEditor
                value={formData.rules}
                onChange={(v) => set("rules", v)}
              />
            </div>

            <div
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                fontSize: "0.8rem",
                color: "var(--color-text-muted)",
              }}
            >
              To use CLI instead: <code>yigyaps publish</code> — the CLI reads from{" "}
              <code>yigyaps.yaml</code> in your project directory
            </div>

          </div>
        )}
      </Win98Wizard>
    </Win98Window>
    </>
  );
}
