import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { YigYapsSecurityClient } from '@yigyaps/client';
import { useSkillDetail } from '../hooks/useSkillDetail';
import { useAuth } from '../contexts/AuthContext';
import { UserMenu } from '../components/UserMenu';
import { ReviewList } from '../components/ReviewList';
import { ReviewForm } from '../components/ReviewForm';
import { InstallButton } from '../components/InstallButton';

export function SkillDetailPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const { skillDetail, reviews, loading, error, refreshReviews } = useSkillDetail(packageId!);
  const { user, login } = useAuth();

  if (loading) {
    return (
      <div className="app-container">
        <Header user={user} login={login} />
        <main className="main-content">
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            Loading skill details...
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
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-accent)' }}>
            {error || 'Skill not found'}
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/" className="btn btn-outline">
              Back to Marketplace
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const displayName = skillDetail.displayName || skillDetail.packageId;
  const detailData = skillDetail as unknown as Record<string, unknown>;
  const hasLimitedEdition = detailData.maxEditions !== null && detailData.maxEditions !== undefined;
  const mintProgress = hasLimitedEdition
    ? ((Number(detailData.mintedCount) || 0) / (Number(detailData.maxEditions) || 1)) * 100
    : 0;

  return (
    <div className="app-container">
      <Header user={user} login={login} />

      <main className="main-content">
        {/* Skill Hero Section */}
        <section className="skill-detail-hero">
          <div className="skill-header">
            <div className="skill-header-left">
              <div className="skill-icon-large">
                {skillDetail.icon || displayName.charAt(0).toUpperCase()}
              </div>
              <div className="skill-title-section">
                <h1 className="skill-title">{displayName}</h1>
                <div className="skill-meta">
                  <span>@{String(detailData.creatorUsername) || 'anonymous'}</span>
                  {skillDetail.rating > 0 && (
                    <>
                      <span className="meta-separator">|</span>
                      <span>⭐ {skillDetail.rating.toFixed(1)} ({skillDetail.reviewCount})</span>
                    </>
                  )}
                  <span className="meta-separator">|</span>
                  <span>{skillDetail.installCount} installs</span>
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
                <span className="skill-tag">{skillDetail.category}</span>
              )}
              {skillDetail.tags?.map((tag) => (
                <span key={tag} className="skill-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* README Section */}
        <section className="readme-section">
          <h2 className="section-heading">About</h2>
          {(skillDetail.readme || detailData.longDescription) ? (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {String(skillDetail.readme || detailData.longDescription)}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="no-content">{skillDetail.description || 'No description provided.'}</p>
          )}
        </section>

        {/* EVR Simulation Sandbox */}
        <section className="sandbox-section" style={{ marginTop: '3rem', padding: '2rem', background: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="section-heading" style={{ margin: 0 }}>Simulation Sandbox</h2>
            <span style={{ fontSize: '0.85rem', background: 'rgba(0,255,100,0.1)', color: '#2ecc71', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(0,255,100,0.2)' }}>
              Encrypted Virtual Room Active
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            Test what an external AI sees when invoking this secure skill. The raw rules are decrypted only in volatile memory (RAM) and immediately wiped.
            The firewall ensures <strong>only the sanitized conclusion</strong> is exported.
          </p>

          <SimulationSandbox packageId={packageId!} />
        </section>

        {/* Mint Status (if limited edition) */}
        {hasLimitedEdition && (
          <section className="mint-status-section">
            <div className="mint-status-header">
              <h2 className="section-heading">
                {String(detailData.editionType)?.toUpperCase()}: {Number(detailData.mintedCount) || 0} /{' '}
                {Number(detailData.maxEditions)} minted
              </h2>
              <span className="mint-percentage">{mintProgress.toFixed(1)}% claimed</span>
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
        <section className="reviews-section">
          <h2 className="section-heading">Reviews ({reviews.length})</h2>

          {/* Review List */}
          <ReviewList reviews={reviews} />

          {/* Review Form (authenticated users only) */}
          <div style={{ marginTop: '3rem' }}>
            <ReviewForm skill={skillDetail} onReviewSubmitted={refreshReviews} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.85rem',
        }}
      >
        <p>&copy; {new Date().getFullYear()} YigYaps. Apache 2.0 Licensed.</p>
      </footer>
    </div>
  );
}

// Shared Header Component (extracted for reuse)
function Header({ user, login }: { user: unknown; login: () => void }) {
  return (
    <header className="header">
      <Link to="/" className="logo">
        Yig<span>Yaps</span>
      </Link>
      <nav className="nav-links">
        <Link to="/">Marketplace</Link>
        <Link to="/publish">Publish Skill</Link>
        <a href="#">Creators</a>
        <a href="#">Docs</a>
      </nav>
      <div className="header-actions">
        {user ? (
          <UserMenu />
        ) : (
          <button className="btn btn-outline" onClick={login}>
            Sign In
          </button>
        )}
        <button className="btn btn-primary">Connect Agent</button>
      </div>
    </header>
  );
}

function SimulationSandbox({ packageId }: { packageId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ conclusion: string; disclaimer: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3100';
      const security = new YigYapsSecurityClient({ baseUrl });

      const response = await security.invokeEvr(packageId);
      setResult({
        conclusion: response.conclusion,
        disclaimer: response.disclaimer,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Simulation failed');
      } else {
        setError('Simulation failed owing to an unknown error.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={handleSimulate}
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
        >
          {loading ? 'Booting EVR Sandbox and Matching Rules...' : 'Simulate External Agent Call'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#e74c3c', padding: '1rem', background: 'rgba(255,0,0,0.1)', borderRadius: '6px' }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#1e1e24', borderLeft: '4px solid #3498db', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Agent Received:</div>
            <div style={{ fontFamily: 'monospace', color: '#ecf0f1' }}>{result.conclusion}</div>
          </div>
          <div style={{ padding: '1rem', background: '#1e1e24', borderLeft: '4px solid #2ecc71', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>System Disclaimer:</div>
            <div style={{ fontSize: '0.9rem', color: '#2ecc71' }}>🛡️ {result.disclaimer}</div>
          </div>
        </div>
      )}
    </div>
  );
}
