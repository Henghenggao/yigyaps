import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSkillDetail } from "../hooks/useSkillDetail";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Header } from "../components/Header";
import { ReviewList } from "../components/ReviewList";
import { ReviewForm } from "../components/ReviewForm";
import { InstallButton } from "../components/InstallButton";
import { fetchApi } from "../lib/api";

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
      className="btn btn-primary"
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
  const { user, login } = useAuth();

  if (loading) {
    return (
      <div className="detail-layout">
        <Header user={user} login={login} />
        <main className="container">
          <div className="skeleton-loading">
            <div className="skeleton-line" style={{ width: '40%', height: '3rem' }} />
            <div className="skeleton-line" style={{ width: '60%', height: '1.5rem' }} />
          </div>
        </main>
      </div>
    );
  }

  if (error || !skillDetail) {
    return (
      <div className="detail-layout">
        <Header user={user} login={login} />
        <main className="container error-page">
          <h2>{error || "Skill not found"}</h2>
          <Link to="/" className="clear-link">Back to Marketplace</Link>
        </main>
      </div>
    );
  }

  const displayName = skillDetail.displayName || skillDetail.packageId;
  const detailData = skillDetail as unknown as Record<string, unknown>;

  return (
    <div className="detail-layout">
      <Header user={user} login={login} />

      <main className="detail-main">
        {/* Header Section */}
        <section className="detail-hero animate-fade-in">
          <div className="container">
            <div className="hero-top">
              <div className="hero-info">
                <h1 className="hero-title">{displayName}</h1>
                <div className="hero-meta">
                  <span className="meta-author">by @{String(detailData.authorUsername || detailData.authorName || skillDetail.authorName || "anonymous")}</span>
                  <span className="meta-dot">·</span>
                  <span className="meta-installs">{skillDetail.installCount.toLocaleString()} installations</span>
                </div>
              </div>
              <div className="hero-action" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <InstallButton skill={skillDetail} />
                <SubscribeButton
                  packageId={skillDetail.packageId}
                  priceUsd={parseFloat(String(skillDetail.priceUsd ?? "0"))}
                />
              </div>
            </div>

            <div className="hero-pills">
              {skillDetail.category && (
                <span className="pill category">{skillDetail.category}</span>
              )}
              {skillDetail.tags?.map((tag) => (
                <span key={tag} className="pill tag">#{tag}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Content Body */}
        <div className="container detail-content-grid">
          <div className="detail-primary">
            {/* Description */}
            <section className="content-section card">
              <h2 className="section-title">Overview</h2>
              <div className="markdown-body">
                {skillDetail.readme || detailData.longDescription ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {String(skillDetail.readme || detailData.longDescription)}
                  </ReactMarkdown>
                ) : (
                  <p>{skillDetail.description || "No detailed description available."}</p>
                )}
              </div>
            </section>

            {/* Sandbox */}
            <section className="content-section card">
              <div className="section-header-flex">
                <h2 className="section-title">Simulation Sandbox</h2>
                <span className="badge-secure">EVR Secure</span>
              </div>
              <p className="section-desc">Test how an external AI sees when invoking this secure skill.</p>
              <SimulationSandbox packageId={packageId!} />
            </section>

            {/* Reviews */}
            <section className="content-section card">
              <h2 className="section-title">Community Voice</h2>
              <ReviewList reviews={reviews} />
              <div className="review-form-box">
                <h3 className="sub-title">Share your experience</h3>
                <ReviewForm
                  skill={skillDetail}
                  onReviewSubmitted={refreshReviews}
                />
              </div>
            </section>
          </div>

          <aside className="detail-sidebar">
            <div className="sidebar-card card">
              <h3 className="sidebar-title">Technical Specs</h3>
              <div className="spec-list">
                <div className="spec-item">
                  <span className="spec-label">Version</span>
                  <span className="spec-value">{skillDetail.version}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">License</span>
                  <span className="spec-value">{skillDetail.license}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Transport</span>
                  <span className="spec-value">{skillDetail.mcpTransport}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Rating</span>
                  <span className="spec-value">★ {skillDetail.rating?.toFixed(1) || "N/A"}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} YigYaps. Shared Wisdom for AI Agents.</p>
        </div>
      </footer>

      <style>{`
        .detail-layout {
          min-height: 100vh;
        }
        .detail-hero {
          padding: 4rem 0 3rem;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-surface);
        }
        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .hero-title {
          font-size: 3.5rem;
          margin-bottom: 0.5rem;
        }
        .hero-meta {
          color: var(--color-text-sub);
          font-weight: 500;
        }
        .meta-dot {
          margin: 0 0.75rem;
        }
        .hero-pills {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .pill {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .pill.category {
          background: var(--color-accent-bg);
          color: var(--color-primary);
        }
        .pill.tag {
          background: #F3F4F6;
          color: var(--color-text-sub);
        }

        .detail-content-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 3rem;
          padding-top: 4rem;
          padding-bottom: 6rem;
        }

        .content-section {
          margin-bottom: 3rem;
        }
        .section-title {
          font-size: 1.75rem;
          margin-bottom: 1.5rem;
        }
        .section-desc {
          color: var(--color-text-sub);
          margin-bottom: 1.5rem;
        }
        .section-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .badge-secure {
          background: #EEF2FF;
          color: #4338CA;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
        }

        .markdown-body {
          line-height: 1.8;
          color: var(--color-text-main);
          font-size: 1.1rem;
        }
        .markdown-body h1, .markdown-body h2 {
          font-family: var(--font-sans);
          font-size: 1.5rem;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .sidebar-title {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .spec-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .spec-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
        }
        .spec-label {
          color: var(--color-text-sub);
        }
        .spec-value {
          font-weight: 600;
          color: var(--color-text-main);
        }

        .review-form-box {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid var(--color-border);
        }
        .sub-title {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 1024px) {
          .detail-content-grid {
            grid-template-columns: 1fr;
          }
          .hero-title {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
}

function SimulationSandbox({ packageId }: { packageId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    conclusion: string;
    disclaimer: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetchApi<{
        success: boolean;
        conclusion: string;
        disclaimer: string;
      }>(`/v1/security/invoke/${packageId}`, {
        method: "POST",
      });
      setResult({
        conclusion: response.conclusion,
        disclaimer: response.disclaimer,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sandbox-box">
      <button
        onClick={handleSimulate}
        disabled={loading}
        className="btn-primary"
        style={{ width: 'auto', minWidth: '240px' }}
      >
        {loading ? "Initializing Sandbox..." : "Run Security Simulation"}
      </button>

      {error && <div className="error-msg">❌ {error}</div>}

      {result && (
        <div className="results-box animate-fade-in">
          <div className="result-group">
            <span className="res-label">Agent Conclusion</span>
            <div className="res-value">{result.conclusion}</div>
          </div>
          <div className="result-group">
            <span className="res-label">Security Protocol</span>
            <div className="res-value protocol">🛡️ {result.disclaimer}</div>
          </div>
        </div>
      )}

      <style>{`
        .sandbox-box {
          margin-top: 1rem;
        }
        .error-msg {
          margin-top: 1rem;
          color: #ef4444;
          font-weight: 500;
        }
        .results-box {
          margin-top: 2rem;
          padding: 1.5rem;
          background: var(--color-bg);
          border-radius: 12px;
          border: 1px solid var(--color-border);
        }
        .result-group {
          margin-bottom: 1.5rem;
        }
        .result-group:last-child {
          margin-bottom: 0;
        }
        .res-label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--color-text-sub);
          margin-bottom: 0.5rem;
        }
        .res-value {
          font-size: 0.95rem;
          color: var(--color-text-main);
          line-height: 1.5;
        }
        .res-value.protocol {
          font-weight: 600;
          color: #4338CA;
        }
      `}</style>
    </div>
  );
}
