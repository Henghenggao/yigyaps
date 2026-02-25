import { useParams, Link } from 'react-router-dom';
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
  const hasLimitedEdition = skillDetail.maxEditions !== null;
  const mintProgress = hasLimitedEdition
    ? ((skillDetail.mintedCount || 0) / (skillDetail.maxEditions || 1)) * 100
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
                  <span>@{skillDetail.creatorUsername}</span>
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
          {skillDetail.longDescription ? (
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: skillDetail.longDescription }}
            />
          ) : (
            <p className="no-content">{skillDetail.description || 'No description provided.'}</p>
          )}
        </section>

        {/* Mint Status (if limited edition) */}
        {hasLimitedEdition && (
          <section className="mint-status-section">
            <div className="mint-status-header">
              <h2 className="section-heading">
                {skillDetail.editionType?.toUpperCase()}: {skillDetail.mintedCount || 0} /{' '}
                {skillDetail.maxEditions} minted
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
function Header({ user, login }: { user: any; login: () => void }) {
  return (
    <header className="header">
      <Link to="/" className="logo">
        Yig<span>Yaps</span>
      </Link>
      <nav className="nav-links">
        <Link to="/">Marketplace</Link>
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
