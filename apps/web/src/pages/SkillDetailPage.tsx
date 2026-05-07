import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSkillDetail } from "../hooks/useSkillDetail";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { ReviewList } from "../components/ReviewList";
import { ReviewForm } from "../components/ReviewForm";
import { InstallButton } from "../components/InstallButton";
import { QuickStartModal } from "../components/QuickStartModal";
import { Win98Window } from "../components/Win98Window";
import { fetchApi } from "../lib/api";
import type { User } from "../contexts/AuthContext";
import type { SkillPackage } from "@yigyaps/types";

function SubscribeButton({ packageId, priceUsd }: { packageId: string; priceUsd: number }) {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  if (priceUsd <= 0) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<{ checkoutUrl: string }>(
        `/v1/stripe/checkout/${encodeURIComponent(packageId)}`,
        { method: "POST", body: JSON.stringify({ tier: "pro" }) },
      );
      window.location.href = data.checkoutUrl;
    } catch {
      addToast({ message: "Could not start checkout. Please try again.", type: "error" });
      setLoading(false);
    }
  };

  return (
    <button
      className="w98-btn"
      onClick={handleSubscribe}
      disabled={loading}
      style={{ minWidth: "140px" }}
    >
      {loading ? "Redirecting…" : `Subscribe · $${priceUsd.toFixed(2)}/mo`}
    </button>
  );
}

export function SkillDetailPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const { skillDetail, reviews, loading, error, refreshReviews } =
    useSkillDetail(packageId!);
  const { user } = useAuth();
  const [showQuickStart, setShowQuickStart] = useState(false);

  return (
    <>
      {/* Loading state */}
      {loading && (
        <Win98Window title="Loading Skill..." icon="📦" statusBar="Fetching skill details...">
          <div className="empty-state"><p>Loading...</p></div>
        </Win98Window>
      )}

      {/* Error state */}
      {!loading && (error || !skillDetail) && (
        <Win98Window title="Error — Skill Not Found" icon="📦" statusBar="Error">
          <div className="empty-state">
            <p>{error || "Skill not found"}</p>
            <Link to="/" className="w98-btn" style={{ display: "inline-block", marginTop: 8 }}>
              Back to Marketplace
            </Link>
          </div>
        </Win98Window>
      )}

      {/* Skill loaded */}
      {!loading && !error && skillDetail && (
        <>
          {/* Window 1: Detail */}
          <Win98Window
            title={`${skillDetail.displayName || skillDetail.packageId} — Skill Detail`}
            icon="📦"
            menuItems={[{ label: "File" }, { label: "View" }, { label: "Help" }]}
            statusBar={
              <>
                <div className="w98-statusbar__panel w98-statusbar__panel--grow">
                  <span style={{ color: "var(--yig-phosphor)" }}>●</span>
                  {` ${skillDetail.maturity} · v${skillDetail.version}`}
                </div>
                {skillDetail.category && (
                  <div className="w98-statusbar__panel">{skillDetail.category}</div>
                )}
              </>
            }
          >
            <div className="skill-detail-body">
              <div>
                <p
                  style={{
                    fontFamily: "var(--yig-font-sans)",
                    fontSize: "var(--yig-text-base)",
                    color: "#333",
                    lineHeight: 1.7,
                    margin: "0 0 var(--yig-space-4)",
                  }}
                >
                  {skillDetail.description}
                </p>
                <div className="skill-detail-meta">
                  <div className="meta-row">
                    <span className="meta-label">Author</span>
                    <span className="meta-value">
                      @{String((skillDetail as unknown as Record<string, unknown>).authorUsername || skillDetail.authorName || "anonymous")}
                    </span>
                  </div>
                  {skillDetail.category && (
                    <div className="meta-row">
                      <span className="meta-label">Category</span>
                      <span className="meta-value">{skillDetail.category}</span>
                    </div>
                  )}
                  <div className="meta-row">
                    <span className="meta-label">License</span>
                    <span className="meta-value">{skillDetail.license}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Transport</span>
                    <span className="meta-value">{skillDetail.mcpTransport}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Installs</span>
                    <span className="meta-value">{skillDetail.installCount.toLocaleString()}</span>
                  </div>
                  {Number(skillDetail.rating) > 0 && (
                    <div className="meta-row">
                      <span className="meta-label">Rating</span>
                      <span className="meta-value skill-rating">
                        ★ {Number(skillDetail.rating).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="skill-install-panel">
                <div className="skill-price-large">
                  {Number(skillDetail.priceUsd || 0) === 0
                    ? "Free"
                    : `$${Number(skillDetail.priceUsd).toFixed(2)}`}
                </div>
                <InstallButton
                  skill={skillDetail}
                  onInstallSuccess={() => setShowQuickStart(true)}
                />
                <SubscribeButton
                  packageId={skillDetail.packageId}
                  priceUsd={parseFloat(String(skillDetail.priceUsd ?? "0"))}
                />
                <div>
                  <p
                    style={{
                      fontFamily: "var(--yig-font-w98)",
                      fontSize: "var(--yig-text-xs)",
                      color: "#666",
                      margin: "0 0 4px",
                    }}
                  >
                    CLI install:
                  </p>
                  <input
                    className="w98-input"
                    style={{ width: "100%", fontFamily: "var(--yig-font-mono)", fontSize: 10 }}
                    readOnly
                    value={`yig install ${skillDetail.packageId}`}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              </div>
            </div>
          </Win98Window>

          {/* Window 2: Documentation */}
          <Win98Window title="📋 Documentation" statusBar="Scroll to read">
            <div className="md-body">
              {skillDetail.readme || (skillDetail as unknown as Record<string, unknown>).longDescription ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {String(skillDetail.readme || (skillDetail as unknown as Record<string, unknown>).longDescription)}
                </ReactMarkdown>
              ) : (
                <p>{skillDetail.description || "No detailed documentation available."}</p>
              )}
            </div>
          </Win98Window>

          {/* Window 3: Simulation Sandbox */}
          <Win98Window
            title="🔬 Simulation Sandbox"
            statusBar={
              <>
                <div className="w98-statusbar__panel w98-statusbar__panel--grow">
                  Test how an external AI sees when invoking this secure skill
                </div>
                <div className="w98-statusbar__panel">EVR Secure</div>
              </>
            }
          >
            <SimulationSandbox packageId={packageId!} user={user} skill={skillDetail} />
          </Win98Window>

          {/* Window 4: Reviews */}
          <Win98Window
            title="⭐ Reviews"
            statusBar={`${reviews.length} reviews`}
          >
            <ReviewList reviews={reviews} />
            <div style={{ marginTop: "var(--yig-space-6)", paddingTop: "var(--yig-space-4)", borderTop: "1px solid #ddd" }}>
              <p
                style={{
                  fontFamily: "var(--yig-font-w98)",
                  fontSize: "var(--yig-text-xs)",
                  fontWeight: 700,
                  margin: "0 0 var(--yig-space-3)",
                }}
              >
                Share your experience
              </p>
              <ReviewForm skill={skillDetail} onReviewSubmitted={refreshReviews} />
            </div>
          </Win98Window>

          {showQuickStart && (
            <QuickStartModal
              packageId={skillDetail.packageId}
              onClose={() => setShowQuickStart(false)}
            />
          )}
        </>
      )}
    </>
  );
}

// ── Smart placeholder by skill type ──────────────────────────────────────────

function getSmartQuery(skill: SkillPackage): string {
  const id = (skill.packageId || "").toLowerCase();
  const tags = ((skill.tags as string[]) || []).join(" ").toLowerCase();
  const all = id + " " + tags;

  if (/meeting|notes|action.item/.test(all))
    return "Sarah will finalize the product roadmap by Friday. John needs to review the budget proposal by end of Q2. We decided to delay the launch to next quarter. Open question: should we hire external contractors for the mobile app?";
  if (/git|commit/.test(all))
    return "feat: add JWT authentication middleware\n\nImplemented token refresh logic. Added rate limiting on auth endpoints. Removed deprecated session cookie. Closes #142.";
  if (/regex|pattern/.test(all))
    return "I need a regex that matches email addresses only from .com and .org domains, and must reject addresses with consecutive dots.";
  if (/spreadsheet|formula|excel/.test(all))
    return "Sales data in columns A (date), B (region), C (revenue). Calculate total revenue per region for Q3 2024 and highlight regions below $50k target.";
  if (/okr|goal|cascade/.test(all))
    return "Company objective: become market leader in B2B SaaS. Focus areas: product quality, customer retention, and expanding to the EU market by Q4.";
  if (/python|typescript|javascript|code.review/.test(all))
    return "def calculate_discount(price, user_type):\n    if user_type == 'premium':\n        return price * 0.8\n    elif user_type == 'new':\n        return price * 0.9\n    return price";
  if (/sql|database|schema/.test(all))
    return "SELECT u.name, COUNT(o.id) as orders, SUM(o.total) as revenue FROM users u JOIN orders o ON u.id = o.user_id WHERE o.created_at > '2024-01-01' GROUP BY u.id ORDER BY revenue DESC LIMIT 10";
  if (/security|pentest|audit|k8s|kubernetes/.test(all))
    return "Node.js REST API with JWT auth. User input is passed directly into a SQL query string. App runs as root in Docker. No rate limiting on the login endpoint.";
  if (/resume|linkedin|career/.test(all))
    return "Software engineer with 5 years experience in React and Node.js. Led migration of monolith to microservices. Looking for senior roles at growth-stage companies in SF or remote.";
  if (/email|triage|draft/.test(all))
    return "47 unread emails. Client asking for project update (3 days old). Team member requesting vacation approval. Vendor invoice needs sign-off. Strong job application from senior candidate.";
  if (/research|paper|academic/.test(all))
    return "Abstract: This study examines the impact of transformer architecture on NLP benchmarks 2018–2023. We analyze 150 papers and find significant gains in reasoning tasks but limited improvement in commonsense knowledge.";
  if (/market|competitive|intelligence/.test(all))
    return "Entering the project management software market. Competitors: Notion, Linear, Monday.com. Target: SMBs with 10–50 employees in tech. Differentiator: AI-powered task prioritization.";
  if (/legal|contract/.test(all))
    return "Clause 7.3: Licensee shall not reverse engineer the Software. Modifications by Licensee become property of Licensor. Licensor may terminate with 30 days notice for any reason.";
  if (/image|prompt|ai.image/.test(all))
    return "Create a product photo for a premium coffee brand. Modern minimalist aesthetic. Convey warmth, quality, and morning ritual. Target audience: urban professionals aged 25–40.";
  if (/video|script|youtube/.test(all))
    return "10-minute explainer video: How blockchain enables trustless peer-to-peer transactions. Audience: non-technical business professionals. Goal: practical use cases without jargon.";
  if (/rag|pipeline|llm/.test(all))
    return "Our RAG pipeline retrieves top-5 chunks from a 100k-doc corpus. We see 23% hallucination rate on factual queries. Embedding model: text-ada-002. Chunk size: 512 tokens. No re-ranking step.";
  if (/seo|article|content/.test(all))
    return "Write an SEO article about 'AI tools for small business'. Target keyword: 'AI productivity tools'. Audience: non-technical SMB owners. Goal: rank on page 1 for long-tail queries.";

  return `Provide a sample input for this skill: ${skill.description?.slice(0, 120) || skill.displayName}`;
}

// ── Simulation Sandbox component ──────────────────────────────────────────────

interface EvaluationDetails {
  overall_score: number;
  verdict: "recommend" | "neutral" | "caution";
  dimensions: Array<{ name: string; score: number; conclusion_key: string }>;
}

interface SimulationResult {
  success: boolean;
  conclusion: string;
  mode?: string;
  privacy_notice?: string;
  evaluation_details?: EvaluationDetails | null;
}

function SimulationSandbox({
  packageId,
  user,
  skill,
}: {
  packageId: string;
  user: User | null;
  skill: SkillPackage;
}) {
  const { openAuthModal } = useAuth();
  const smartQuery = getSmartQuery(skill);
  const [query, setQuery] = useState(smartQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="sandbox-box">
        <button onClick={openAuthModal} className="w98-btn" style={{ minWidth: "220px" }}>
          Sign In to Simulate
        </button>
        <p style={{ marginTop: "0.75rem", color: "var(--color-text-sub)", fontSize: "0.9rem" }}>
          Authentication required to run the security simulation.
        </p>
      </div>
    );
  }

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetchApi<SimulationResult>(
        `/v1/security/invoke/${packageId}`,
        { method: "POST", body: JSON.stringify({ user_query: query.trim() || smartQuery }) },
      );
      setResult(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const ev = result?.evaluation_details;
  const verdictColor = ev
    ? ev.verdict === "recommend" ? "#16a34a"
      : ev.verdict === "neutral" ? "#d97706"
        : "#6b7280"
    : undefined;

  return (
    <div className="sandbox-box">
      {/* Query input */}
      <div className="query-wrapper">
        <label className="query-label">TEST QUERY</label>
        <textarea
          className="query-textarea"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={smartQuery}
          rows={4}
        />
        <p className="query-hint">
          Enter sample content this skill would process. Rules are evaluated entirely in-process — no data is transmitted.
        </p>
      </div>

      <button
        onClick={handleSimulate}
        disabled={loading}
        className="w98-btn"
        style={{ minWidth: "220px" }}
      >
        {loading ? "Evaluating…" : "Run Security Simulation"}
      </button>

      {error && <div className="sandbox-error">❌ {error}</div>}

      {result && (
        <div className="results-box animate-fade-in">
          {ev ? (
            <>
              {/* Overall score */}
              <div className="eval-overall">
                <span className="eval-score" style={{ color: verdictColor }}>
                  {ev.overall_score}<span className="eval-score-denom">/10</span>
                </span>
                <span className="eval-verdict" style={{ background: verdictColor + "18", color: verdictColor }}>
                  {ev.verdict.toUpperCase()}
                </span>
              </div>

              {/* Dimension breakdown */}
              <div className="dim-list">
                {ev.dimensions.map((d) => {
                  const color = d.score >= 7 ? "#16a34a" : d.score >= 4 ? "#d97706" : "#9ca3af";
                  return (
                    <div key={d.name} className="dim-row">
                      <span className="dim-name">{d.name}</span>
                      <div className="dim-track">
                        <div className="dim-fill" style={{ width: `${d.score * 10}%`, background: color }} />
                      </div>
                      <span className="dim-score" style={{ color }}>{d.score}/10</span>
                      <span className="dim-key">{d.conclusion_key.replace(/_/g, " ")}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Fallback: free-form text conclusion */
            <div className="freeform-conclusion">
              <span className="res-label">AGENT CONCLUSION</span>
              <div className="res-value">{result.conclusion}</div>
            </div>
          )}

          {/* Privacy notice */}
          <div className="privacy-bar">
            🛡️ {result.privacy_notice}
          </div>
        </div>
      )}

      <style>{`
        .sandbox-box { margin-top: 1rem; }

        .query-wrapper { margin-bottom: 1.25rem; }
        .query-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-sub);
          margin-bottom: 0.5rem;
        }
        .query-textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 0.875rem 1rem;
          border: 1.5px solid var(--color-border);
          border-radius: 8px;
          font-family: var(--font-mono, 'Courier New', monospace);
          font-size: 0.875rem;
          line-height: 1.6;
          color: var(--color-text-main);
          background: var(--color-bg);
          resize: vertical;
          transition: border-color 0.15s;
        }
        .query-textarea:focus { outline: none; border-color: var(--color-primary); }
        .query-hint {
          margin-top: 0.4rem;
          font-size: 0.8rem;
          color: var(--color-text-sub);
        }

        .sandbox-error { margin-top: 1rem; color: #ef4444; font-weight: 500; }

        .results-box {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: var(--color-bg);
          border-radius: 12px;
          border: 1px solid var(--color-border);
        }

        .eval-overall {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .eval-score {
          font-size: 2.25rem;
          font-weight: 700;
          font-family: var(--font-mono, monospace);
          line-height: 1;
        }
        .eval-score-denom { font-size: 1.25rem; opacity: 0.6; }
        .eval-verdict {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          letter-spacing: 0.06em;
        }

        .dim-list { display: flex; flex-direction: column; gap: 0.55rem; margin-bottom: 1.25rem; }
        .dim-row {
          display: grid;
          grid-template-columns: 180px 1fr 44px 1fr;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.82rem;
        }
        .dim-name { color: var(--color-text-sub); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dim-track { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
        .dim-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
        .dim-score { font-family: var(--font-mono, monospace); color: var(--color-text-sub); text-align: right; }
        .dim-key { color: var(--color-text-sub); font-style: italic; }

        .freeform-conclusion { margin-bottom: 1.25rem; }
        .res-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-sub);
          margin-bottom: 0.5rem;
        }
        .res-value { font-size: 0.9rem; color: var(--color-text-main); line-height: 1.6; white-space: pre-line; }

        .privacy-bar {
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
          font-size: 0.8rem;
          color: #4338CA;
          font-weight: 500;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
