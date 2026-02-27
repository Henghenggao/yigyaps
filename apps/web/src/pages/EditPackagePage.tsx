import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { fetchApi } from "../lib/api";
import { Header } from "../components/Header";
import { MarkdownEditor } from "../components/MarkdownEditor";

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

interface Package {
  id: string;
  packageId: string;
  version: string;
  displayName: string;
  description: string;
  readme: string | null;
  authorName: string;
  authorUrl: string | null;
  category: string;
  tags: string[];
  maturity: string;
  license: string;
  priceUsd: string;
  icon: string | null;
  repositoryUrl: string | null;
  homepageUrl: string | null;
  mcpTransport: string;
  mcpCommand: string | null;
  mcpUrl: string | null;
}

export function EditPackagePage() {
  const { id } = useParams<{ id: string }>();
  const { user, login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const [formData, setFormData] = useState({
    version: "",
    displayName: "",
    description: "",
    readme: "",
    authorName: "",
    authorUrl: "",
    category: "other",
    tags: [] as string[],
    maturity: "experimental",
    license: "open-source",
    priceUsd: 0,
    icon: "",
    repositoryUrl: "",
    homepageUrl: "",
    mcpTransport: "stdio",
    mcpCommand: "",
    mcpUrl: "",
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchApi<Package>(`/v1/packages/${id}`)
      .then((data) => {
        setPkg(data);
        setFormData({
          version: data.version,
          displayName: data.displayName,
          description: data.description,
          readme: data.readme || "",
          authorName: data.authorName,
          authorUrl: data.authorUrl || "",
          category: data.category,
          tags: data.tags || [],
          maturity: data.maturity,
          license: data.license,
          priceUsd: parseFloat(data.priceUsd) || 0,
          icon: data.icon || "",
          repositoryUrl: data.repositoryUrl || "",
          homepageUrl: data.homepageUrl || "",
          mcpTransport: data.mcpTransport || "stdio",
          mcpCommand: data.mcpCommand || "",
          mcpUrl: data.mcpUrl || "",
        });
      })
      .catch(() => addToast({ message: "Failed to load package", type: "error" }))
      .finally(() => setLoading(false));
  }, [id]);

  const set = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "priceUsd") {
      set("priceUsd", parseFloat(value) || 0);
    } else {
      set(name as keyof typeof formData, value as (typeof formData)[keyof typeof formData]);
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

  const handleSave = async () => {
    if (!id) return;
    if (!formData.displayName.trim()) {
      addToast({ message: "Display name is required", type: "warning" });
      return;
    }
    if (formData.description.trim().length < 10) {
      addToast({ message: "Description must be at least 10 characters", type: "warning" });
      return;
    }

    setSaving(true);
    try {
      await fetchApi(`/v1/packages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...formData,
          priceUsd: formData.priceUsd,
          readme: formData.readme || undefined,
          authorUrl: formData.authorUrl || undefined,
          icon: formData.icon || undefined,
          repositoryUrl: formData.repositoryUrl || undefined,
          homepageUrl: formData.homepageUrl || undefined,
          mcpCommand: formData.mcpCommand || undefined,
          mcpUrl: formData.mcpUrl || undefined,
        }),
      });
      addToast({ message: "Package updated successfully", type: "success" });
      navigate("/my-packages");
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : "Failed to save changes",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.6rem 0.75rem",
    background: "var(--color-input-bg, #1a1a1a)",
    border: "1px solid var(--color-border)",
    borderRadius: "6px",
    color: "var(--color-text)",
    fontSize: "0.9rem",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.35rem",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "var(--color-text-muted)",
  };

  const fieldStyle = { marginBottom: "1.25rem" };

  return (
    <div className="app-container">
      <Header user={user} login={login} />

      <main className="main-content" style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <Link to="/my-packages" style={{ color: "var(--color-text-muted)", textDecoration: "none", fontSize: "0.875rem" }}>
            ← My Packages
          </Link>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
            {loading ? "Loading..." : `Edit: ${pkg?.displayName}`}
          </h1>
        </div>

        {loading ? (
          <div style={{ color: "var(--color-text-muted)", padding: "2rem 0" }}>Loading package data...</div>
        ) : !pkg ? (
          <div style={{ color: "#e74c3c", padding: "2rem 0" }}>Package not found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Section: Core */}
            <section
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: "1rem", marginBottom: "1.25rem", fontWeight: 600 }}>Core Info</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={labelStyle}>Version *</label>
                  <input name="version" value={formData.version} onChange={handleChange} placeholder="1.0.0" className="publish-input" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Maturity</label>
                  <select name="maturity" value={formData.maturity} onChange={handleChange} className="publish-select" style={{ ...inputStyle }}>
                    {MATURITIES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Display Name *</label>
                <input name="displayName" value={formData.displayName} onChange={handleChange} placeholder="Display Name" className="publish-input" style={inputStyle} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Short Description * (10-500 chars)</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="publish-textarea" style={{ ...inputStyle, resize: "vertical" }} />
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "right" }}>
                  {formData.description.length}/500
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} className="publish-select" style={{ ...inputStyle }}>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>License</label>
                  <select name="license" value={formData.license} onChange={handleChange} className="publish-select" style={{ ...inputStyle }}>
                    {LICENSES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              {(formData.license === "premium" || formData.license === "enterprise") && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>Price (USD)</label>
                  <input name="priceUsd" type="number" min={0} max={9999} step={0.01} value={formData.priceUsd} onChange={handleChange} className="publish-input" style={inputStyle} />
                </div>
              )}

              <div style={fieldStyle}>
                <label style={labelStyle}>Tags (up to 10)</label>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Add a tag..."
                    className="publish-input"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button type="button" className="btn btn-outline" onClick={addTag} style={{ fontSize: "0.85rem" }}>Add</button>
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
            </section>

            {/* Section: README */}
            <section
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: "1rem", marginBottom: "1.25rem", fontWeight: 600 }}>README</h2>
              <MarkdownEditor
                value={formData.readme}
                onChange={(v) => set("readme", v)}
                placeholder="# My Skill&#10;&#10;Describe what this skill does..."
                maxLength={5000}
                height="280px"
              />
            </section>

            {/* Section: Author & Links */}
            <section
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: "1rem", marginBottom: "1.25rem", fontWeight: 600 }}>Author & Links</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={labelStyle}>Author Name *</label>
                  <input name="authorName" value={formData.authorName} onChange={handleChange} className="publish-input" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Author URL</label>
                  <input name="authorUrl" value={formData.authorUrl} onChange={handleChange} placeholder="https://" className="publish-input" style={inputStyle} />
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Icon URL</label>
                <input name="icon" value={formData.icon} onChange={handleChange} placeholder="https://example.com/icon.png" className="publish-input" style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Repository URL</label>
                  <input name="repositoryUrl" value={formData.repositoryUrl} onChange={handleChange} placeholder="https://github.com/..." className="publish-input" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Homepage URL</label>
                  <input name="homepageUrl" value={formData.homepageUrl} onChange={handleChange} placeholder="https://" className="publish-input" style={inputStyle} />
                </div>
              </div>
            </section>

            {/* Save button */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingBottom: "2rem" }}>
              <Link to="/my-packages" className="btn btn-outline">Cancel</Link>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: "120px" }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
