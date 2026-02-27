import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSkillDetail } from "../hooks/useSkillDetail";
import { useAuth } from "../contexts/AuthContext";
import { Header } from "../components/Header";
import { ReviewList } from "../components/ReviewList";
import { ReviewForm } from "../components/ReviewForm";
import { InstallButton } from "../components/InstallButton";
import { fetchApi } from "../lib/api";

export function SkillDetailPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const { skillDetail, reviews, loading, error, refreshReviews } =
    useSkillDetail(packageId!);
  const { user, login } = useAuth();

  if (loading) {
    return (
      <div className="app-container">
        <Header user={user} login={login} />
        <main className="main-content">
          <div className="skeleton-detail-placeholder">
            <div className="skeleton skeleton-icon" />
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-text" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !skillDetail) {
    return (
      <div className="app-container">
        <Header user={user} login={login} />
        <main className="main-content">
          <div className="error-container fade-in">
            <div className="error-icon">⚠️</div>
            <h2>{error || "Skill not found"}</h2>
            <Link to="/" className="btn btn-outline" style={{ marginTop: "1rem" }}>
              Back to Marketplace
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const displayName = skillDetail.displayName || skillDetail.packageId;
  const detailData = skillDetail as unknown as Record<string, unknown>;
  const hasLimitedEdition =
    detailData.maxEditions !== null && detailData.maxEditions !== undefined;
  const mintProgress = hasLimitedEdition
    ? ((Number(detailData.mintedCount) || 0) /
      (Number(detailData.maxEditions) || 1)) *
    100
    : 0;

  return (
    <div className="app-container">
      <Header user={user} login={login} />

      <main className="main-content">
        {/* Skill Hero Section */}
        <section className="skill-detail-hero fade-in-up">
          <div className="skill-header">
            <div className="skill-header-left">
              <div className="skill-icon-large">
                {skillDetail.icon || displayName.charAt(0).toUpperCase()}
              </div>
              <div className="skill-title-section">
                <h1 className="skill-title">{displayName}</h1>
                <div className="skill-meta">
                  <span className="skill-author">
                    @{String(detailData.authorUsername || detailData.authorName || skillDetail.authorName || "anonymous")}
                  </span>
                  {skillDetail.rating > 0 && (
                    <>
                      <span className="meta-separator">/</span>
                      <span className="skill-rating-meta">
                        ⭐ {skillDetail.rating.toFixed(1)}
                        <span className="review-count">({skillDetail.reviewCount} reviews)</span>
                      </span>
                    </>
                  )}
                  <span className="meta-separator">/</span>
                  <span className="skill-installs-meta">{skillDetail.installCount.toLocaleString()} installs</span>
                </div>
              </div>
            </div>
            <div className="skill-header-right">
              <InstallButton skill={skillDetail} />
            </div>
          </div>

          {/* Tags */}
          {(skillDetail.category || skillDetail.tags) && (
            <div className="skill-tags">
              {skillDetail.category && (
                <span className="skill-tag category">{skillDetail.category}</span>
              )}
              {skillDetail.tags?.map((tag) => (
                <span key={tag} className="skill-tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* README Section */}
        <section className="readme-section fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="section-heading">Description</h2>
          {skillDetail.readme || detailData.longDescription ? (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {String(skillDetail.readme || detailData.longDescription)}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="no-content">
              {skillDetail.description || "No description provided."}
            </p>
          )}
        </section>

        {/* EVR Simulation Sandbox */}
        <section className="sandbox-section fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="sandbox-header">
            <div className="sandbox-title-container">
              <h2 className="section-heading">Simulation Sandbox</h2>
              <span className="sandbox-badge">
                <span className="status-dot"></span>
                Encrypted Virtual Room Active
              </span>
            </div>
            <p className="sandbox-desc">
              Test what an external AI sees when invoking this secure skill. The
              raw rules are decrypted only in volatile memory (RAM) and
              immediately wiped.
            </p>
          </div>

          <SimulationSandbox packageId={packageId!} />
        </section>

        {/* Mint Status */}
        {hasLimitedEdition && (
          <section className="mint-status-section fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="mint-status-header">
              <h3 className="section-heading">
                {String(detailData.editionType)?.toUpperCase()}: {Number(detailData.mintedCount) || 0} / {Number(detailData.maxEditions)} Claimed
              </h3>
              <span className="mint-percentage">
                {mintProgress.toFixed(1)}%
              </span>
            </div>
            <div className="mint-progress-bar">
              <div
                className="mint-progress-fill"
                style={{ width: `${Math.min(mintProgress, 100)}%` }}
              />
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <section className="reviews-section fade-in" style={{ animationDelay: "0.5s" }}>
          <h2 className="section-heading">Community Reviews ({reviews.length})</h2>
          <ReviewList reviews={reviews} />
          <div className="review-form-container">
            <ReviewForm
              skill={skillDetail}
              onReviewSubmitted={refreshReviews}
            />
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} YigYaps. Built for the Agentic Future.</p>
        <div className="footer-links">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </footer>
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
      if (err instanceof Error) {
        setError(err.message || "Simulation failed");
      } else {
        setError("Simulation failed owing to an unknown error.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sandbox-content">
      <div className="sandbox-actions">
        <button
          onClick={handleSimulate}
          disabled={loading}
          className={`btn btn-primary btn-large ${loading ? 'btn-loading' : ''}`}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Initializing EVR Sandbox...
            </>
          ) : (
            "Simulate Secure Agent Call"
          )}
        </button>
      </div>

      {error && (
        <div className="form-error fade-in">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="sandbox-results fade-in">
          <div className="sandbox-result-box conclusion">
            <div className="result-label">Agent Output (Sanitized):</div>
            <div className="result-value">
              {result.conclusion}
            </div>
          </div>
          <div className="sandbox-result-box disclaimer">
            <div className="result-label">Security Protocol:</div>
            <div className="result-value">
              🛡️ {result.disclaimer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
