import { Link } from "react-router-dom";
import { Win98Window } from "../components/Win98Window";

export function PrivacyPage() {
  return (
    <Win98Window
      title="🔒 Privacy Policy — Yig Yaps"
      icon="🔒"
      statusBar="Legal · Data protection"
    >
      <div className="md-body">
        <h1>Privacy Policy</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "2.5rem" }}>
          Effective date: January 1, 2026 · Last updated: February 27, 2026
        </p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>When you authenticate with GitHub OAuth, we receive:</p>
          <ul>
            <li>Your GitHub username and display name</li>
            <li>Your public GitHub avatar URL</li>
            <li>A GitHub user ID (for identity verification)</li>
          </ul>
          <p>
            We do not receive your GitHub email, repositories, or private data. We do not store your GitHub OAuth
            token — we only use it once to retrieve your profile, then discard it.
          </p>
        </section>

        <section>
          <h2>2. Skill Rules &amp; Encryption</h2>
          <p>
            Skill rules submitted by Creators are encrypted using AES-256-GCM before being stored. The plaintext
            rules exist only transiently in server memory during the encryption process. We cannot access your
            Skill rules in plaintext after encryption.
          </p>
        </section>

        <section>
          <h2>3. How We Use Your Data</h2>
          <ul>
            <li>To authenticate you and maintain your session</li>
            <li>To display your public profile on Skill listings</li>
            <li>To process royalty payments for Skill installations</li>
            <li>To enforce platform policies and detect abuse</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Sharing</h2>
          <p>
            We do not sell your personal data. We may share data with:
          </p>
          <ul>
            <li>Cloud infrastructure providers (hosting, databases)</li>
            <li>Payment processors (Stripe) for paid Skill transactions</li>
            <li>Law enforcement when required by applicable law</li>
          </ul>
        </section>

        <section>
          <h2>5. API Keys</h2>
          <p>
            API keys are stored as SHA-256 hashes. We never store the plaintext key after initial generation.
            If you lose your API key, you must revoke it and generate a new one.
          </p>
        </section>

        <section>
          <h2>6. Cookies &amp; Sessions</h2>
          <p>
            We use a single httpOnly, Secure, SameSite=Strict session cookie for authentication. We do not use
            tracking cookies, analytics, or advertising cookies. We do not use third-party analytics services.
          </p>
        </section>

        <section>
          <h2>7. Data Retention</h2>
          <p>
            Account data is retained as long as your account exists. You may request deletion by contacting us.
            Encrypted Skill rules are deleted when a Skill is permanently removed. Session data expires after 7 days
            of inactivity.
          </p>
        </section>

        <section>
          <h2>8. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have rights to access, correct, port, or delete your personal
            data. To exercise these rights, open an issue on our GitHub repository.
          </p>
        </section>

        <section>
          <h2>9. Security</h2>
          <p>
            We implement industry-standard security measures including TLS in transit, AES-256-GCM for Skill rules,
            SHA-256 for API keys, CSRF protection, and Content Security Policy headers. However, no system is
            perfectly secure.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            For privacy inquiries, open an issue at{" "}
            <a href="https://github.com/Henghenggao/yigyaps/issues" target="_blank" rel="noopener noreferrer">
              github.com/Henghenggao/yigyaps
            </a>
            .
          </p>
        </section>

        <p style={{ fontSize: "0.8rem", marginTop: "1.5rem", textAlign: "center" }}>
          <Link to="/terms">Terms of Service</Link>
          {" · "}
          <Link to="/">Back to Home</Link>
        </p>
      </div>
    </Win98Window>
  );
}
