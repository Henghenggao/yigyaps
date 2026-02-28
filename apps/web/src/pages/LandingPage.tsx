import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Header } from "../components/Header";
import { API_URL } from "../lib/api";

export function LandingPage() {
  const { user, login } = useAuth();

  return (
    <div className="landing-layout">
      <Header user={user} login={login} />

      <main>
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="landing-hero animate-fade-in">
          <div className="container">
            <p className="hero-eyebrow">Human expertise for the AI Agent economy</p>
            <h1 className="landing-hero-title">
              The Trusted Skills Platform<span className="dot">.</span>
            </h1>
            <p className="landing-hero-sub">
              Package your professional knowledge into encrypted, licensable AI skills.
              Agents pay per call. You earn royalties. Your IP stays yours.
            </p>
            <div className="hero-cta-row">
              <Link to="/marketplace" className="btn-primary btn-lg">
                Browse Marketplace
              </Link>
              <Link to="/publish" className="btn-outline btn-lg">
                Publish a Skill
              </Link>
            </div>
            <p className="hero-note">
              Open source &middot; Apache 2.0 &middot; No vendor lock-in
            </p>
          </div>
        </section>

        {/* ── Metrics Bar ─────────────────────────────────── */}
        <section className="metrics-bar">
          <div className="container metrics-row">
            <div className="metric">
              <span className="metric-val">AES-256</span>
              <span className="metric-label">Envelope Encryption</span>
            </div>
            <div className="metric-divider" />
            <div className="metric">
              <span className="metric-val">70 %</span>
              <span className="metric-label">Creator Royalty</span>
            </div>
            <div className="metric-divider" />
            <div className="metric">
              <span className="metric-val">MCP</span>
              <span className="metric-label">Native Bridge</span>
            </div>
            <div className="metric-divider" />
            <div className="metric">
              <span className="metric-val">SKILL.md</span>
              <span className="metric-label">Ecosystem Standard</span>
            </div>
          </div>
        </section>

        {/* ── Value Props ─────────────────────────────────── */}
        <section className="section-block">
          <div className="container">
            <h2 className="section-title">Two sides. One marketplace.</h2>
            <p className="section-subtitle">
              Experts monetize knowledge. Agents access verified skills. Everyone wins.
            </p>

            <div className="value-grid">
              <div className="value-card">
                <div className="value-icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3>For Creators</h3>
                <p>
                  Package your expertise once — decision trees, scoring matrices,
                  case libraries. Agents call your skill via API. You earn 70% of
                  every invocation. Update anytime; your versioned knowledge keeps
                  evolving.
                </p>
                <ul className="value-list">
                  <li>Structured template editor</li>
                  <li>SKILL.md export for ecosystem reach</li>
                  <li>Stripe Connect payouts</li>
                  <li>Evolution Lab for iterating rules</li>
                </ul>
              </div>

              <div className="value-card">
                <div className="value-icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                    <path d="M7 8h2m2 0h2m2 0h2" />
                    <path d="M7 12h10" />
                  </svg>
                </div>
                <h3>For AI Agents</h3>
                <p>
                  Access verified professional skills through a single API or
                  MCP bridge. No prompt engineering guesswork — structured
                  evaluations from real domain experts, delivered in milliseconds.
                </p>
                <ul className="value-list">
                  <li>MCP-native tool integration</li>
                  <li>Local rule engine (zero-latency)</li>
                  <li>Pay-per-call or subscription tiers</li>
                  <li>Hash-chained audit trail</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────── */}
        <section className="section-block section-alt">
          <div className="container">
            <h2 className="section-title">How it works</h2>
            <p className="section-subtitle">Three steps from expertise to revenue.</p>

            <div className="steps-grid">
              <div className="step-card">
                <div className="step-num">1</div>
                <h3>Encode</h3>
                <p>
                  Choose a template — decision tree, scoring matrix, or case
                  library. Fill in your domain knowledge. The structured format
                  guarantees machine-readable precision without sacrificing nuance.
                </p>
              </div>
              <div className="step-arrow">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </div>
              <div className="step-card">
                <div className="step-num">2</div>
                <h3>Encrypt &amp; Publish</h3>
                <p>
                  Your rules are encrypted with AES-256-GCM envelope encryption
                  before touching the database. A SHA-256 content hash is
                  timestamped for IP proof. Then your skill goes live on the
                  marketplace.
                </p>
              </div>
              <div className="step-arrow">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </div>
              <div className="step-card">
                <div className="step-num">3</div>
                <h3>Earn</h3>
                <p>
                  Agents invoke your skill via API or MCP bridge. The local rule
                  engine evaluates queries without sending your knowledge
                  externally. You receive 70% of every paid call through Stripe
                  Connect.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Security Trust ──────────────────────────────── */}
        <section className="section-block section-trust">
          <div className="container">
            <h2 className="section-title">Assetize your knowledge, don't donate it<span className="dot">.</span></h2>
            <p className="section-subtitle">
              Most platforms treat your expertise as fuel for their models. At YigYaps, we treat it as your private property.
            </p>

            <div className="trust-grid">
              <div className="trust-card highlight-negative">
                <div className="trust-layer">OpenAI / ChatGPT</div>
                <h3>Fueling the Goliaths</h3>
                <p>
                  When you give your expertise to ChatGPT, it becomes training data.
                  You're effectively training your own replacement for free.
                </p>
              </div>
              <div className="trust-card highlight-positive">
                <div className="trust-layer">The YigYaps Way</div>
                <h3>AES-256 Encrypted</h3>
                <p>
                  Your knowledge is stored with bank-grade encryption. Not even we can see it.
                  Only authorized Agents receive encrypted conclusions during calls.
                </p>
              </div>
              <div className="trust-card">
                <div className="trust-layer">Control</div>
                <h3>Instant 'Kill Switch'</h3>
                <p>
                  You are the master of your expertise. Revoke access anytime to make your
                  knowledge permanently 'brick' for everyone with one click.
                </p>
              </div>
              <div className="trust-card">
                <div className="trust-layer">IP Proof</div>
                <h3>Immutable Authorship</h3>
                <p>
                  Every skill is hashed and timestamped. Your intellectual property
                  is verifiable, protected, and legally assetized.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Ecosystem ───────────────────────────────────── */}
        <section className="section-block section-alt">
          <div className="container">
            <h2 className="section-title">Built for the AI ecosystem</h2>
            <p className="section-subtitle">
              Works with the tools agents already use.
            </p>

            <div className="eco-grid">
              <div className="eco-card">
                <h3>MCP Bridge</h3>
                <p>
                  Any MCP-compatible client — Claude Code, Codex, Verdent —
                  can invoke YigYaps skills as native tools via
                  <code>npx yigyaps mcp-bridge</code>.
                </p>
              </div>
              <div className="eco-card">
                <h3>SKILL.md Export</h3>
                <p>
                  Export the public layer of any skill in SKILL.md format.
                  Compatible with SkillsMP and the emerging skill standard.
                  Private rules stay encrypted.
                </p>
              </div>
              <div className="eco-card">
                <h3>REST API + CLI</h3>
                <p>
                  Full Swagger-documented API. 17-command CLI for
                  publishing, testing, and managing skills.
                  <code>npm install -g @yigyaps/cli</code>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <section className="section-block cta-section">
          <div className="container">
            <h2 className="cta-title">Ready to assetize your expertise?</h2>
            <p className="cta-sub">
              Join the marketplace. Start earning from what you know.
            </p>
            <div className="hero-cta-row">
              {user ? (
                <Link to="/publish" className="btn-primary btn-lg">
                  Publish Your First Skill
                </Link>
              ) : (
                <button className="btn-primary btn-lg" onClick={login}>
                  Sign In with GitHub
                </button>
              )}
              <a
                href={`${API_URL}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline btn-lg"
              >
                Read the Docs
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-row">
          <p>&copy; {new Date().getFullYear()} YigYaps. Shared Wisdom for AI Agents.</p>
          <div className="footer-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <a href="https://github.com/Henghenggao/yigyaps" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </footer>

      <style>{`
        /* ── Landing Hero ───────────────────────────────── */
        .landing-hero {
          padding: 8rem 0 6rem;
          text-align: center;
          background: var(--color-bg);
        }
        .hero-eyebrow {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--color-primary);
          margin-bottom: 1.5rem;
          font-weight: 600;
        }
        .landing-hero-title {
          font-family: var(--font-serif);
          font-size: clamp(3rem, 7vw, 5rem);
          font-weight: 700;
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin-bottom: 2rem;
        }
        .landing-hero-title .dot {
          color: var(--color-dot);
        }
        .landing-hero-sub {
          font-size: clamp(1.15rem, 2vw, 1.35rem);
          max-width: 680px;
          margin: 0 auto 3rem;
          color: var(--color-text-sub);
          line-height: 1.7;
        }
        .hero-cta-row {
          display: flex;
          gap: 1.25rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn-lg {
          padding: 1rem 2.5rem;
          font-size: 1.05rem;
          border-radius: var(--radius-lg);
        }
        .btn-outline {
          background: transparent;
          color: var(--color-text-main);
          border: 1.5px solid var(--color-border);
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          transition: var(--transition);
        }
        .btn-outline:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: var(--color-surface);
        }
        .hero-note {
          margin-top: 2rem;
          font-size: 0.85rem;
          color: var(--color-text-sub);
        }

        /* ── Metrics Bar ────────────────────────────────── */
        .metrics-bar {
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          padding: 2rem 0;
          background: var(--color-surface);
        }
        .metrics-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 3rem;
          flex-wrap: wrap;
        }
        .metric {
          text-align: center;
        }
        .metric-val {
          display: block;
          font-family: var(--font-mono);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-main);
          letter-spacing: -0.02em;
        }
        .metric-label {
          font-size: 0.8rem;
          color: var(--color-text-sub);
          margin-top: 0.25rem;
          display: block;
        }
        .metric-divider {
          width: 1px;
          height: 40px;
          background: var(--color-border);
        }

        /* ── Sections ───────────────────────────────────── */
        .section-block {
          padding: 6rem 0;
        }
        .section-alt {
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
        }
        .section-title {
          text-align: center;
          font-size: clamp(2rem, 4vw, 2.75rem);
          margin-bottom: 1rem;
        }
        .section-subtitle {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 4rem;
          font-size: 1.1rem;
          color: var(--color-text-sub);
          line-height: 1.6;
        }

        /* ── Value Props ────────────────────────────────── */
        .value-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2.5rem;
        }
        .value-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 3rem;
          transition: var(--transition);
        }
        .value-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-hover);
        }
        .value-icon {
          width: 56px;
          height: 56px;
          background: var(--color-accent-bg);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
          margin-bottom: 1.5rem;
        }
        .value-card h3 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
        .value-card p {
          line-height: 1.7;
          margin-bottom: 1.5rem;
        }
        .value-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .value-list li {
          padding: 0.4rem 0;
          padding-left: 1.5rem;
          position: relative;
          color: var(--color-text-sub);
          font-size: 0.95rem;
        }
        .value-list li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.75rem;
          width: 6px;
          height: 6px;
          background: var(--color-primary);
          border-radius: 50%;
        }

        /* ── Steps ──────────────────────────────────────── */
        .steps-grid {
          display: flex;
          align-items: flex-start;
          gap: 1.5rem;
          justify-content: center;
        }
        .step-card {
          flex: 1;
          max-width: 320px;
          text-align: center;
          padding: 2.5rem 2rem;
        }
        .step-num {
          width: 48px;
          height: 48px;
          border: 2px solid var(--color-primary);
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-primary);
          margin-bottom: 1.5rem;
        }
        .step-card h3 {
          font-size: 1.35rem;
          margin-bottom: 0.75rem;
        }
        .step-card p {
          font-size: 0.95rem;
          line-height: 1.7;
        }
        .step-arrow {
          display: flex;
          align-items: center;
          padding-top: 4rem;
          color: var(--color-border);
        }

        /* ── Trust ──────────────────────────────────────── */
        .trust-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }
        .trust-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 2.5rem 2rem;
          transition: var(--transition);
        }
        .trust-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-hover);
        }
        .trust-layer {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--color-primary);
          margin-bottom: 1rem;
          font-weight: 600;
        }
        .trust-card h3 {
          font-size: 1.15rem;
          margin-bottom: 0.75rem;
        }
        .trust-card p {
          font-size: 0.9rem;
          line-height: 1.65;
        }
        .trust-card.highlight-positive {
          border-color: var(--color-primary);
          background: #FFF;
          box-shadow: 0 4px 20px rgba(212, 163, 148, 0.1);
          position: relative;
        }
        .trust-card.highlight-positive::after {
          content: 'The Standard';
          position: absolute;
          top: -12px;
          right: 20px;
          background: var(--color-primary);
          color: white;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .trust-card.highlight-negative {
          background: #F5F5F3;
          border-color: #E0E0DE;
          opacity: 0.8;
        }
        .trust-card.highlight-negative .trust-layer {
          color: #888;
        }

        /* ── Ecosystem ──────────────────────────────────── */
        .eco-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }
        .eco-card {
          text-align: center;
          padding: 2.5rem 2rem;
        }
        .eco-card h3 {
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .eco-card p {
          font-size: 0.95rem;
          line-height: 1.7;
        }
        .eco-card code {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          background: var(--color-accent-bg);
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
          color: var(--color-text-main);
        }

        /* ── CTA ────────────────────────────────────────── */
        .cta-section {
          text-align: center;
          background: var(--color-logo-bg);
          border: none;
        }
        .cta-title {
          color: #FFFFFF;
          font-size: clamp(2rem, 4vw, 2.75rem);
          margin-bottom: 1rem;
        }
        .cta-sub {
          color: rgba(255,255,255,0.7);
          font-size: 1.15rem;
          margin-bottom: 3rem;
        }
        .cta-section .btn-primary {
          background: var(--color-primary);
        }
        .cta-section .btn-outline {
          color: #FFFFFF;
          border-color: rgba(255,255,255,0.3);
        }
        .cta-section .btn-outline:hover {
          border-color: #FFFFFF;
          color: #FFFFFF;
          background: rgba(255,255,255,0.1);
        }

        /* ── Footer ─────────────────────────────────────── */
        .site-footer {
          padding: 3rem 0;
          border-top: 1px solid var(--color-border);
          font-size: 0.9rem;
          color: var(--color-text-sub);
        }
        .footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-links {
          display: flex;
          gap: 2rem;
        }
        .footer-links a {
          color: var(--color-text-sub);
        }
        .footer-links a:hover {
          color: var(--color-primary);
        }

        /* ── Responsive ─────────────────────────────────── */
        @media (max-width: 1024px) {
          .value-grid { grid-template-columns: 1fr; }
          .trust-grid { grid-template-columns: repeat(2, 1fr); }
          .eco-grid { grid-template-columns: 1fr; }
          .steps-grid { flex-direction: column; align-items: center; }
          .step-arrow { transform: rotate(90deg); padding: 0; }
        }
        @media (max-width: 640px) {
          .landing-hero { padding: 5rem 0 4rem; }
          .trust-grid { grid-template-columns: 1fr; }
          .metrics-row { gap: 1.5rem; }
          .metric-divider { display: none; }
          .footer-row { flex-direction: column; gap: 1rem; text-align: center; }
        }
      `}</style>
    </div>
  );
}
