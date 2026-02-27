import { Header } from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export function TermsPage() {
  const { user, login } = useAuth();

  const sectionStyle = { marginBottom: "2rem" };
  const headingStyle = { fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" };
  const paraStyle = { color: "var(--color-text-muted)", lineHeight: 1.7, fontSize: "0.9rem", marginBottom: "0.75rem" };

  return (
    <div className="app-container">
      <Header user={user} login={login} />

      <main className="main-content" style={{ maxWidth: "760px", margin: "0 auto", paddingBottom: "4rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Terms of Service</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "2.5rem" }}>
          Effective date: January 1, 2026 · Last updated: February 27, 2026
        </p>

        <div
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            padding: "2rem",
          }}
        >
          <div style={sectionStyle}>
            <h2 style={headingStyle}>1. Acceptance of Terms</h2>
            <p style={paraStyle}>
              By accessing or using YigYaps ("the Platform", "we", "us"), you agree to be bound by these Terms of Service.
              If you do not agree to all terms, you may not access the Platform.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>2. Description of Service</h2>
            <p style={paraStyle}>
              YigYaps is a marketplace for human expertise packaged as AI skills ("Skills" or "YAPs"). Creators publish
              encrypted skill rules that AI agents can license and invoke. The Platform operates as an intermediary
              between Creators and AI operators.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>3. User Accounts</h2>
            <p style={paraStyle}>
              You must authenticate via GitHub OAuth to publish or install Skills. You are responsible for all activity
              under your account. You must be at least 18 years old to use the Platform.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>4. Intellectual Property</h2>
            <p style={paraStyle}>
              Creators retain full ownership of their published Skills. By publishing on YigYaps, you grant the Platform
              a non-exclusive license to store, encrypt, and deliver your Skills to licensed users. You represent that
              you own or have rights to publish all content you submit.
            </p>
            <p style={paraStyle}>
              Installating a Skill grants a non-transferable license to use the Skill in AI agent contexts as specified
              by the Creator. Reverse engineering, extraction, or redistribution of Skill rules is strictly prohibited.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>5. Prohibited Content</h2>
            <p style={paraStyle}>You may not publish Skills that:</p>
            <ul style={{ ...paraStyle, paddingLeft: "1.5rem" } as React.CSSProperties}>
              <li>Contain malware, exploits, or harmful instructions</li>
              <li>Violate any applicable law or third-party rights</li>
              <li>Constitute spam, scams, or deceptive content</li>
              <li>Infringe intellectual property rights of others</li>
              <li>Are sexually explicit, threatening, or harassing</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>6. Revenue Sharing</h2>
            <p style={paraStyle}>
              For paid Skills, Creators receive 70% of net revenue. YigYaps retains 30% as a platform fee to cover
              infrastructure, security, and operational costs. Payouts are processed via Stripe when available.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>7. Alpha Disclaimer</h2>
            <p style={paraStyle}>
              YigYaps is currently in Alpha. The Platform may be unavailable, reset, or significantly modified without
              notice. Data may be lost during this period. Do not rely on the Platform for production-critical workloads
              during Alpha.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>8. Limitation of Liability</h2>
            <p style={paraStyle}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, YIGYAPS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF $100 OR THE AMOUNT
              YOU PAID IN THE PAST 12 MONTHS.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>9. Changes to Terms</h2>
            <p style={paraStyle}>
              We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance.
              Material changes will be communicated via email or Platform notification.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>10. Contact</h2>
            <p style={paraStyle}>
              For questions about these Terms, please open an issue at{" "}
              <a href="https://github.com/yigyaps/yigyaps/issues" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)" }}>
                github.com/yigyaps/yigyaps
              </a>
              .
            </p>
          </div>
        </div>

        <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", marginTop: "1.5rem", textAlign: "center" }}>
          <Link to="/privacy" style={{ color: "var(--color-primary)" }}>Privacy Policy</Link>
          {" · "}
          <Link to="/" style={{ color: "var(--color-primary)" }}>Back to Home</Link>
        </p>
      </main>
    </div>
  );
}
