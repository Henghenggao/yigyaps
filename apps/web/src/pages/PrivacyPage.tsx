import { Header } from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export function PrivacyPage() {
  const { user, login } = useAuth();

  const sectionStyle = { marginBottom: "2rem" };
  const headingStyle = { fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" };
  const paraStyle = { color: "var(--color-text-muted)", lineHeight: 1.7, fontSize: "0.9rem", marginBottom: "0.75rem" };

  return (
    <div className="app-container">
      <Header user={user} login={login} />

      <main className="main-content" style={{ maxWidth: "760px", margin: "0 auto", paddingBottom: "4rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Privacy Policy</h1>
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
            <h2 style={headingStyle}>1. Information We Collect</h2>
            <p style={paraStyle}>When you authenticate with GitHub OAuth, we receive:</p>
            <ul style={{ ...paraStyle, paddingLeft: "1.5rem" } as React.CSSProperties}>
              <li>Your GitHub username and display name</li>
              <li>Your public GitHub avatar URL</li>
              <li>A GitHub user ID (for identity verification)</li>
            </ul>
            <p style={paraStyle}>
              We do not receive your GitHub email, repositories, or private data. We do not store your GitHub OAuth
              token — we only use it once to retrieve your profile, then discard it.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>2. Skill Rules & Encryption</h2>
            <p style={paraStyle}>
              Skill rules submitted by Creators are encrypted using AES-256-GCM before being stored. The plaintext
              rules exist only transiently in server memory during the encryption process. We cannot access your
              Skill rules in plaintext after encryption.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>3. How We Use Your Data</h2>
            <ul style={{ ...paraStyle, paddingLeft: "1.5rem" } as React.CSSProperties}>
              <li>To authenticate you and maintain your session</li>
              <li>To display your public profile on Skill listings</li>
              <li>To process royalty payments for Skill installations</li>
              <li>To enforce platform policies and detect abuse</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>4. Data Sharing</h2>
            <p style={paraStyle}>
              We do not sell your personal data. We may share data with:
            </p>
            <ul style={{ ...paraStyle, paddingLeft: "1.5rem" } as React.CSSProperties}>
              <li>Cloud infrastructure providers (hosting, databases)</li>
              <li>Payment processors (Stripe) for paid Skill transactions</li>
              <li>Law enforcement when required by applicable law</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>5. API Keys</h2>
            <p style={paraStyle}>
              API keys are stored as SHA-256 hashes. We never store the plaintext key after initial generation.
              If you lose your API key, you must revoke it and generate a new one.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>6. Cookies & Sessions</h2>
            <p style={paraStyle}>
              We use a single httpOnly, Secure, SameSite=Strict session cookie for authentication. We do not use
              tracking cookies, analytics, or advertising cookies. We do not use third-party analytics services.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>7. Data Retention</h2>
            <p style={paraStyle}>
              Account data is retained as long as your account exists. You may request deletion by contacting us.
              Encrypted Skill rules are deleted when a Skill is permanently removed. Session data expires after 7 days
              of inactivity.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>8. Your Rights</h2>
            <p style={paraStyle}>
              Depending on your jurisdiction, you may have rights to access, correct, port, or delete your personal
              data. To exercise these rights, open an issue on our GitHub repository.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>9. Security</h2>
            <p style={paraStyle}>
              We implement industry-standard security measures including TLS in transit, AES-256-GCM for Skill rules,
              SHA-256 for API keys, CSRF protection, and Content Security Policy headers. However, no system is
              perfectly secure.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>10. Contact</h2>
            <p style={paraStyle}>
              For privacy inquiries, open an issue at{" "}
              <a href="https://github.com/Henghenggao/yigyaps/issues" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)" }}>
                github.com/Henghenggao/yigyaps
              </a>
              .
            </p>
          </div>
        </div>

        <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", marginTop: "1.5rem", textAlign: "center" }}>
          <Link to="/terms" style={{ color: "var(--color-primary)" }}>Terms of Service</Link>
          {" · "}
          <Link to="/" style={{ color: "var(--color-primary)" }}>Back to Home</Link>
        </p>
      </main>
    </div>
  );
}
