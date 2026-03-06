import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Header } from "../components/Header";

export function LandingPage() {
  const { user, login } = useAuth();

  return (
    <div className="landing-layout">
      <Header user={user} login={login} />

      <main>
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="landing-hero animate-fade-in">
          <div className="container">
            <p className="hero-eyebrow">
              Human expertise for the AI Agent economy
            </p>
            <h1 className="landing-hero-title">
              Don't be replaced by AI.
              <br />
              Let the AI economy work for you<span className="dot">.</span>
            </h1>
            <p className="landing-hero-sub">
              YigYaps is a pioneer knowledge assetization platform built
              specifically for human experts. Turn your experience into AI
              skills while absolutely protecting your trade secrets, and let
              thousands of AI agents pay to consult your expertise.
            </p>
            <div className="hero-cta-row">
              <Link to="/publish" className="btn-primary btn-lg">
                Assetize Your Expertise Now
              </Link>
            </div>
            <p className="hero-note">
              Independent &middot; Security First &middot; The Knowledge Bank of
              the AI Era
            </p>
          </div>
        </section>

        {/* ── Value Props ─────────────────────────────────── */}
        <section className="section-block">
          <div className="container">
            <div className="value-grid-3">
              <div className="value-card">
                <div className="value-icon">
                  <span style={{ fontSize: "28px", lineHeight: 1 }}>💰</span>
                </div>
                <h3>
                  Knowledge Monetization: Turn Experience Into Passive Income
                </h3>
                <p>
                  Say goodbye to "free sharing". On YigYaps, your methodologies,
                  business acumen, and professional judgment are valuable
                  commodities. Earn real royalty shares whenever global AI
                  agents invoke your skill to solve problems.
                </p>
              </div>

              <div className="value-card">
                <div className="value-icon">
                  <span style={{ fontSize: "28px", lineHeight: 1 }}>🛡️</span>
                </div>
                <h3>Patent-Grade Moat: Never Feed The Big Models</h3>
                <p>
                  We solve your biggest fear: IP theft. While other platforms
                  use your data to train their models for free, YigYaps uses an
                  innovative "Blackbox Defense Architecture". Buyers only get
                  the final diagnostic conclusion and can never peek at your
                  core weights and rules. Your secret sauce stays yours.
                </p>
              </div>

              <div className="value-card">
                <div className="value-icon">
                  <span style={{ fontSize: "28px", lineHeight: 1 }}>⚡</span>
                </div>
                <h3>Zero Code: As Easy As Filling a Form</h3>
                <p>
                  You don't need to be a programmer to embrace AI. Designed
                  specifically for industry experts, our visual templates let
                  you simply fill in your "decision logic" or "scoring
                  criteria". The system automatically turns you into a globally
                  compliant AI plugin in 10 minutes. Your digital twin is ready
                  for business.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Use Cases ────────────────────────────────── */}
        <section className="section-block section-alt">
          <div className="container">
            <h2 className="section-title">
              Your knowledge is a necessity in the AI world
            </h2>
            <p className="section-subtitle">
              See how other experts are monetizing at scale on YigYaps:
            </p>

            <div
              className="trust-grid"
              style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
            >
              <div className="trust-card">
                <div className="trust-layer">💼 Senior Analyst</div>
                <h3>Project Risk Radar</h3>
                <p>
                  Every time an AI agent conducts corporate due diligence, it
                  calls this radar. The expert earns high per-call fees while
                  keeping the core evaluation model absolutely confidential.
                </p>
              </div>
              <div className="trust-card">
                <div className="trust-layer">⚖️ Compliance Lawyer</div>
                <h3>Contract Loophole Scanner</h3>
                <p>
                  Turn ten years of "US-China trade contract scanning
                  experience" into a plugin. Empower countless startup AI agents
                  with one click and monetize at scale.
                </p>
              </div>
              <div className="trust-card">
                <div className="trust-layer">🎨 Growth Hacker</div>
                <h3>Viral Potential Scorecard</h3>
                <p>
                  Let anyone anywhere who doesn't know how to write viral copy
                  pay a small fee to consult "your AI brain" for scoring and
                  guidance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Security Trust ──────────────────────────────── */}
        <section className="section-block section-trust">
          <div className="container">
            <h2 className="section-title">
              Give Conclusions, Not Your Secrets<span className="dot">.</span>
            </h2>
            <p className="section-subtitle">
              No matter how omnipotent the other party's AI is, it only gets
              your judgment results and never sees your core logic or reasoning
              process.
            </p>

            <div
              className="trust-grid"
              style={{
                gridTemplateColumns: "1fr 1fr",
                maxWidth: "860px",
                margin: "0 auto",
              }}
            >
              <div className="trust-card highlight-negative">
                <div className="trust-layer">
                  Standard Chat Models & Platforms
                </div>
                <h3>Give Away Your Secrets (Train Models for Free)</h3>
                <p>
                  Your valuable brain ➡️ Sent to an LLM chatbox ➡️ Data
                  ruthlessly used for training ➡️ Your value gets diluted and
                  replaced.
                </p>
              </div>
              <div className="trust-card highlight-positive">
                <div className="trust-layer">
                  The YigYaps Assetization Model
                </div>
                <h3>Earn Passive Income (Bank-Grade Protection)</h3>
                <p>
                  Your valuable brain ➡️ YigYaps Top-Secret Rule Engine Defense
                  ➡️ Outputs only structured conclusion reports ➡️ Ding! Royalty
                  received 💰.
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
              Join the exclusive knowledge monetization network for human
              experts.
            </p>
            <div className="hero-cta-row">
              {user ? (
                <Link to="/publish" className="btn-primary btn-lg">
                  Start Creating Skills
                </Link>
              ) : (
                <button className="btn-primary btn-lg" onClick={login}>
                  Sign in with GitHub
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-row">
          <p>
            &copy; {new Date().getFullYear()} YigYaps | Protecting human wisdom,
            empowering the AI economy.
          </p>
          <div
            className="footer-links"
            style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}
          >
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <a
              href="https://github.com/Henghenggao/yigyaps"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
        <div
          className="container"
          style={{
            marginTop: "1.5rem",
            fontSize: "0.85rem",
            color: "var(--color-text-sub)",
          }}
        >
          <p>
            🔒 <b>Under the Hood:</b> Independent decentralized registry |
            End-to-end AES-256-GCM isolated encryption | 100% Model Context
            Protocol (MCP) compatible | Enterprise-grade settlement by Stripe
          </p>
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
          font-size: clamp(2.5rem, 6vw, 4.25rem);
          font-weight: 700;
          line-height: 1.35;
          letter-spacing: -0.01em;
          margin-bottom: 2rem;
        }
        .landing-hero-title .dot {
          color: var(--color-dot);
        }
        .landing-hero-sub {
          font-size: clamp(1.1rem, 2vw, 1.25rem);
          max-width: 720px;
          margin: 0 auto 3rem;
          color: var(--color-text-sub);
          line-height: 1.8;
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
        .hero-note {
          margin-top: 2rem;
          font-size: 0.85rem;
          color: var(--color-text-sub);
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
          margin-bottom: 1.5rem;
        }
        .section-subtitle {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 4rem;
          font-size: 1.1rem;
          color: var(--color-text-sub);
          line-height: 1.7;
        }

        /* ── Value Props ────────────────────────────────── */
        .value-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
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
          margin-bottom: 1.5rem;
        }
        .value-card h3 {
          font-size: 1.45rem;
          margin-bottom: 1.2rem;
          color: var(--color-text-main);
          font-weight: 700;
        }
        .value-card p {
          line-height: 1.75;
          color: var(--color-text-sub);
          font-size: 0.95rem;
        }

        /* ── Trust ──────────────────────────────────────── */
        .trust-grid {
          display: grid;
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
          font-size: 0.9rem;
          color: var(--color-primary);
          margin-bottom: 1.25rem;
          font-weight: 600;
        }
        .trust-card h3 {
          font-size: 1.25rem;
          margin-bottom: 0.85rem;
        }
        .trust-card p {
          font-size: 0.95rem;
          line-height: 1.7;
          color: var(--color-text-sub);
        }
        .trust-card.highlight-positive {
          border-color: var(--color-primary);
          background: #FFF;
          box-shadow: 0 4px 20px rgba(212, 163, 148, 0.1);
          position: relative;
        }
        .trust-card.highlight-positive::after {
          content: 'The YigYaps Standard';
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

        /* ── Footer ─────────────────────────────────────── */
        .site-footer {
          padding: 3rem 0;
          border-top: 1px solid var(--color-border);
          font-size: 0.95rem;
          color: var(--color-text-sub);
        }
        .footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .footer-links a {
          color: var(--color-text-sub);
          transition: color 0.2s;
        }
        .footer-links a:hover {
          color: var(--color-primary);
        }

        /* ── Responsive ─────────────────────────────────── */
        @media (max-width: 1024px) {
          .value-grid-3 { grid-template-columns: 1fr; }
          .trust-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .landing-hero { padding: 5rem 0 4rem; }
          .footer-row { flex-direction: column; text-align: center; }
        }
      `}</style>
    </div>
  );
}
