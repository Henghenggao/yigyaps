import { Link } from "react-router-dom";
import { Win98Window } from "../components/Win98Window";

export function TermsPage() {
  return (
    <Win98Window
      title="📋 Terms of Service — Yig Yaps"
      icon="📋"
      statusBar="Legal · Apache 2.0"
    >
      <div className="md-body">
        <h1>Terms of Service</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "2.5rem" }}>
          Effective date: January 1, 2026 · Last updated: February 27, 2026
        </p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using YigYaps ("the Platform", "we", "us"), you agree to be bound by these Terms of Service.
            If you do not agree to all terms, you may not access the Platform.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            YigYaps is a marketplace for human expertise packaged as **Yigbot Augmented Plugin** skills ("Skills" or "YAPs").
            Creators publish encrypted skill rules that AI agents can license and invoke. The Platform operates as
            an intermediary between Creators and AI operators.
          </p>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          <p>
            You must authenticate via GitHub OAuth to publish or install Skills. You are responsible for all activity
            under your account. You must be at least 18 years old to use the Platform.
          </p>
        </section>

        <section>
          <h2>4. Intellectual Property</h2>
          <p>
            Creators retain full ownership of their published Skills. By publishing on YigYaps, you grant the Platform
            a non-exclusive license to store, encrypt, and deliver your Skills to licensed users. You represent that
            you own or have rights to publish all content you submit.
          </p>
          <p>
            Installing a Skill grants a non-transferable license to use the Skill in AI agent contexts as specified
            by the Creator. Reverse engineering, extraction, or redistribution of Skill rules is strictly prohibited.
          </p>
        </section>

        <section
          style={{
            padding: "1.25rem 1.5rem",
            background: "rgba(231,76,60,0.04)",
            border: "1px solid rgba(231,76,60,0.18)",
            borderRadius: "8px",
            marginBottom: "2rem",
          }}
        >
          <h2>5. Prohibited AI Training Use</h2>
          <p>
            <strong>5.1 Prohibition.</strong>{" "}
            You ("Licensee") shall NOT use any knowledge, rules, case studies, decision frameworks,
            evaluation criteria, or derivative data obtained through YigYaps API calls for:
          </p>
          <ul>
            <li>
              Training, fine-tuning, distilling, or reinforcement learning of any machine learning model;
            </li>
            <li>Constructing synthetic datasets derived from Skill outputs;</li>
            <li>Building competitive products that replicate Skill functionality.</li>
          </ul>
          <p>
            <strong>5.2 Violation Consequences.</strong> Breach of Section 5.1 triggers:
          </p>
          <ul>
            <li>Immediate termination of all API access without refund;</li>
            <li>Liquidated damages equal to 10× the total API fees paid to date;</li>
            <li>Platform's right to seek injunctive relief.</li>
          </ul>
          <p>
            <strong>5.3 Detection &amp; Audit.</strong>{" "}
            YigYaps reserves the right to periodically test Licensee systems for output patterns matching
            YigYaps Skill fingerprints. Licensee agrees to cooperate with reasonable audit requests within
            14 days of written notice.
          </p>
          <p style={{ fontSize: "0.8rem", marginBottom: 0 }}>
            By creating an API key you confirm you have read, understood, and agree to Section 5.
          </p>
        </section>

        <section>
          <h2>6. Prohibited Content</h2>
          <p>You may not publish Skills that:</p>
          <ul>
            <li>Contain malware, exploits, or harmful instructions</li>
            <li>Violate any applicable law or third-party rights</li>
            <li>Constitute spam, scams, or deceptive content</li>
            <li>Infringe intellectual property rights of others</li>
            <li>Are sexually explicit, threatening, or harassing</li>
          </ul>
        </section>

        <section>
          <h2>7. Revenue Sharing</h2>
          <p>
            For paid Skills, Creators receive 70% of net revenue. YigYaps retains 30% as a platform fee to cover
            infrastructure, security, and operational costs. Payouts are processed via Stripe when available.
          </p>
        </section>

        <section>
          <h2>8. Alpha Disclaimer</h2>
          <p>
            YigYaps is currently in Alpha. The Platform may be unavailable, reset, or significantly modified without
            notice. Data may be lost during this period. Do not rely on the Platform for production-critical workloads
            during Alpha.
          </p>
        </section>

        <section>
          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, YIGYAPS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF $100 OR THE AMOUNT
            YOU PAID IN THE PAST 12 MONTHS.
          </p>
        </section>

        <section>
          <h2>10. Changes to Terms</h2>
          <p>
            We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance.
            Material changes will be communicated via email or Platform notification.
          </p>
        </section>

        <section>
          <h2>11. Contact</h2>
          <p>
            For questions about these Terms, please open an issue at{" "}
            <a href="https://github.com/Henghenggao/yigyaps/issues" target="_blank" rel="noopener noreferrer">
              github.com/Henghenggao/yigyaps
            </a>
            .
          </p>
        </section>

        <p style={{ fontSize: "0.8rem", marginTop: "1.5rem", textAlign: "center" }}>
          <Link to="/privacy">Privacy Policy</Link>
          {" · "}
          <Link to="/">Back to Home</Link>
        </p>
      </div>
    </Win98Window>
  );
}
