import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Win98Window } from '../components/Win98Window';

export function LandingPage() {
  const { user, openAuthModal } = useAuth();

  return (
    <>
      {/* ── Window 1: Hero ── */}
      <Win98Window
        title="Yig Yaps — Open Skill Registry"
        icon="∴"
        menuItems={[
          { label: 'File' }, { label: 'Edit' }, { label: 'View' },
          { label: 'Marketplace' }, { label: 'Publish' },
          { label: 'Docs' }, { label: 'Help' },
        ]}
        tabs={[
          { label: 'All Skills', dotColor: '#0A0A0A' },
          { label: 'Featured', dotColor: '#C8321B', active: true },
          { label: 'New', dotColor: '#555' },
          { label: 'Finance', dotColor: '#555' },
          { label: 'Legal', dotColor: '#555' },
        ]}
        statusBar={
          <>
            <div className="w98-statusbar__panel w98-statusbar__panel--grow">
              <span style={{ color: 'var(--yig-phosphor)' }}>●</span>
              {' '}Ready · MCP-compatible · Apache 2.0
            </div>
            <div className="w98-statusbar__panel">github.com/yigyaps</div>
          </>
        }
      >
        <div className="landing-hero-body">
          <div>
            <p className="hero-eyebrow">Human expertise for the AI agent economy</p>
            <h1 className="hero-h1">
              Don't be replaced by AI<span className="hero-dot">.</span><br />
              Let the agent economy<br />work for you<span className="hero-dot">.</span>
            </h1>
            <p className="hero-sub">
              Yig Yaps is the open registry for YAP skills — publish your expertise
              once, let thousands of AI agents pay to consult it.
            </p>
            <div className="hero-btn-row">
              <Link to="/marketplace" className="w98-btn w98-btn--default">
                Browse Marketplace
              </Link>
              {user ? (
                <Link to="/publish" className="w98-btn">Publish a Skill</Link>
              ) : (
                <button className="w98-btn" onClick={openAuthModal}>
                  Sign In to Publish
                </button>
              )}
              <a
                href="https://github.com/Henghenggao/yigyaps"
                target="_blank"
                rel="noopener noreferrer"
                className="w98-btn"
              >
                GitHub ↗
              </a>
            </div>
            <p className="hero-note">Independent · Security-First · MCP-Compatible</p>
          </div>
          <div className="landing-hero-mark">
            <div className="hero-mark-glyph">∴</div>
            <div className="hero-wordmark">
              Yig <span className="hero-wordmark-sub">Yaps</span>
            </div>
            <div className="hero-version">ALPHA · v0.9</div>
          </div>
        </div>
      </Win98Window>

      {/* ── Window 2: Value Props ── */}
      <Win98Window
        title="Why Yig Yaps — Platform Overview"
        icon="💡"
        statusBar="AES-256-GCM · MCP Protocol · GitHub OAuth · Stripe Settlement"
      >
        <div className="value-grid">
          <div className="value-pane">
            <p className="value-label">Monetization</p>
            <p className="value-title">Knowledge Monetization: Turn Experience Into Passive Income</p>
            <p className="value-body">
              Your methodologies earn real royalties every time a global AI agent
              invokes your skill to solve problems.
            </p>
          </div>
          <div className="value-pane">
            <p className="value-label">IP Protection</p>
            <p className="value-title">Patent-Grade Moat: Never Feed The Big Models</p>
            <p className="value-body">
              Blackbox Defense Architecture. Buyers get only the conclusion —
              your core rules stay encrypted and yours.
            </p>
          </div>
          <div className="value-pane">
            <p className="value-label">Zero Code</p>
            <p className="value-title">Zero Code: As Easy As Filling a Form</p>
            <p className="value-body">
              Visual templates let you fill in your decision logic. The system
              turns you into a globally compliant AI plugin in 10 minutes.
            </p>
          </div>
        </div>
      </Win98Window>

      {/* ── Window 3: Security ── */}
      <Win98Window
        title="Security Model — Give Conclusions, Not Your Secrets"
        icon="🔒"
        statusBar={
          <div className="w98-statusbar__panel w98-statusbar__panel--grow">
            <span style={{ color: 'var(--yig-phosphor)' }}>●</span>
            {' '}AES-256-GCM envelope encryption · ephemeral decryption · zero-knowledge output
          </div>
        }
      >
        <div style={{ marginBottom: 'var(--yig-space-4)' }}>
          <p className="hero-eyebrow" style={{ marginBottom: 'var(--yig-space-2)' }}>
            Security architecture
          </p>
          <h2 style={{ fontFamily: 'var(--yig-font-sans)', fontSize: 'var(--yig-text-2xl)', fontWeight: 700, letterSpacing: 'var(--yig-tracking-headline)', color: 'var(--yig-ink)', margin: '0 0 var(--yig-space-2)' }}>
            Give Conclusions, Not Your Secrets<span className="hero-dot">.</span>
          </h2>
          <p style={{ fontFamily: 'var(--yig-font-sans)', fontSize: 'var(--yig-text-sm)', color: '#555', margin: 0, lineHeight: 1.6 }}>
            No matter how capable the other AI is, it only gets your judgment
            results — never your core logic.
          </p>
        </div>
        <div className="sec-grid">
          <div className="sec-card sec-dim">
            <p className="sec-label">Standard Platforms</p>
            <p className="sec-title">Feed Models for Free</p>
            <p className="sec-body">
              Your expertise → LLM chatbox → used for training → your value
              diluted and replaced.
            </p>
          </div>
          <div className="sec-card sec-highlight">
            <p className="sec-label">Yig Yaps Model</p>
            <p className="sec-title">Earn Passive Income (Bank-Grade)</p>
            <p className="sec-body">
              Your expertise → Yig Yaps Rule Engine → outputs structured
              conclusions only → royalty received.
            </p>
          </div>
        </div>
      </Win98Window>

      {/* ── Window 4: CTA ── */}
      <Win98Window
        title="Get Started — Yig Yaps"
        icon="∴"
        statusBar="Open · Community-governed · Apache 2.0"
      >
        <div style={{ textAlign: 'center', padding: 'var(--yig-space-8) 0' }}>
          <p className="hero-eyebrow" style={{ marginBottom: 'var(--yig-space-2)' }}>
            Ready?
          </p>
          <h2 style={{ fontFamily: 'var(--yig-font-sans)', fontSize: 'var(--yig-text-2xl)', fontWeight: 700, letterSpacing: 'var(--yig-tracking-headline)', color: 'var(--yig-ink)', margin: '0 0 var(--yig-space-3)' }}>
            Assetize your expertise<span className="hero-dot">.</span>
          </h2>
          <p style={{ fontFamily: 'var(--yig-font-sans)', fontSize: 'var(--yig-text-sm)', color: '#555', margin: '0 0 var(--yig-space-6)', lineHeight: 1.7 }}>
            Join the knowledge monetization network for human experts.
          </p>
          <div className="hero-btn-row" style={{ justifyContent: 'center' }}>
            {user ? (
              <Link to="/publish" className="w98-btn w98-btn--default">
                Start Creating Skills
              </Link>
            ) : (
              <button className="w98-btn w98-btn--default" onClick={openAuthModal}>
                Sign In to Yig Yaps
              </button>
            )}
            <Link to="/marketplace" className="w98-btn">Browse Marketplace</Link>
          </div>
        </div>
      </Win98Window>

      {/* ── Window 5: Footer ── */}
      <Win98Window
        title="Yig Yaps · © 2026 · Apache 2.0"
        icon="∴"
        statusBar="Visual style inspired by Windows 98 (© Microsoft). Yig Yaps is not affiliated with Microsoft."
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--yig-font-w98)', fontSize: 'var(--yig-text-xs)', color: '#666' }}>
          <span>© {new Date().getFullYear()} Yig Yaps · Protecting human wisdom, empowering the AI economy.</span>
          <div style={{ display: 'flex', gap: 'var(--yig-space-4)' }}>
            <Link to="/terms" style={{ color: '#666', textDecoration: 'none' }}>Terms</Link>
            <Link to="/privacy" style={{ color: '#666', textDecoration: 'none' }}>Privacy</Link>
            <a href="https://github.com/Henghenggao/yigyaps" target="_blank" rel="noopener noreferrer" style={{ color: '#666', textDecoration: 'none' }}>GitHub ↗</a>
          </div>
        </div>
      </Win98Window>
    </>
  );
}
