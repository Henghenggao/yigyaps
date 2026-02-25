import { useSkills } from './hooks/useSkills';
import './App.css'

function App() {
  const { skills, loading, error } = useSkills();

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          Yig<span>Yaps</span>
        </div>
        <nav className="nav-links">
          <a href="#">Marketplace</a>
          <a href="#">Creators</a>
          <a href="#">Docs</a>
        </nav>
        <div className="header-actions">
          <button className="btn btn-outline">Sign In</button>
          <button className="btn btn-primary">Connect Agent</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero">
          <h1>Assetize Your Wisdom.</h1>
          <p>
            The open marketplace for high-value AI skills. Package your expertise, license your identity, and generate royalties.
          </p>
          <div className="search-container">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search skills, verified identities, or domain wisdom..."
            />
          </div>
        </section>

        {/* Skills Grid */}
        <section className="skills-section">
          <div className="section-title">Top Minted Skills</div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              Loading skills...
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-accent)' }}>
              {error}
            </div>
          )}

          {!loading && !error && skills.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              No skills found in the marketplace.
            </div>
          )}

          <div className="skills-grid">
            {skills.map((skill) => (
              <div key={skill.id} className="skill-card">
                <div className="card-header">
                  <div className="card-icon">{skill.name ? skill.name.charAt(0).toUpperCase() : 'Y'}</div>
                  <div className="status-indicator">
                    <span className="status-dot"></span>
                    Verified
                  </div>
                </div>
                <h3 className="card-title">{skill.name}</h3>
                <p className="card-desc">{skill.description || 'No description provided.'}</p>
                <div className="card-footer">
                  <div className="mint-quota">
                    MINT QUOTA: <span>{skill.mintCount || 0}/{skill.mintQuota ? skill.mintQuota : '∞'}</span>
                  </div>
                  <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-border)', padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <p>&copy; {new Date().getFullYear()} YigYaps. Apache 2.0 Licensed.</p>
      </footer>
    </div>
  )
}

export default App
