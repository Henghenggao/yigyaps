import { Link } from "react-router-dom";
import { Win98Window } from "../components/Win98Window";

export function BlogPage() {
  return (
    <Win98Window
      title="📄 Docs & Blog — Yig Yaps"
      icon="📄"
      statusBar="Documentation · Guides · Updates"
    >
      <div className="md-body">
        <article>
          <header>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--color-primary)", display: "flex", gap: "1.5rem", marginBottom: "2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span>March 2, 2026</span>
              <span>By Jerome G., Founder</span>
              <span>Vision &amp; Strategy</span>
            </div>
            <h1>Why We Built YigYaps: Turning Human Expertise into the Sovereign Assets of the AI Era</h1>
            <p style={{ fontSize: "1.1rem", lineHeight: 1.6, fontStyle: "italic", borderLeft: "4px solid var(--color-dot)", paddingLeft: "1.5rem", marginBottom: "2rem" }}>
              The AI revolution shouldn't be a zero-sum game between humans and machines.
              We're building YigYaps to ensure that human professional judgment remains the most valuable currency in the new economy.
            </p>
          </header>

          <section>
            <h2>The Expertise Paradox</h2>
            <p>
              Today, we face a strange paradox. Professional expertise is more accessible than ever, yet the people who spent decades acquiring it are feeling increasingly threatened.
              When you feed your insights into a generic LLM chatbox, you are inadvertently training your own replacement.
              The value of your "Secret Sauce"—that specific methodology or professional intuition—gets diluted into a statistical average.
            </p>
            <p>
              <strong>YigYaps was born from a simple question:</strong> How can we let experts share their value with the AI world without giving away their life's work for free?
            </p>
          </section>

          <section>
            <h2>Our Theory: The Blackbox Economy</h2>
            <p>
              We believe in <em>Assetization</em>, not just <em>Digitization</em>.
              Unlike traditional platforms, YigYaps doesn't ask you to "publish your data." Instead, we ask you to "publish your logic."
            </p>
            <p>
              Through our <strong>Blackbox Defense Architecture</strong>, we turn your professional judgment into an executable API.
              When an AI agent calls your "Skill" on YigYaps, it receives your high-level diagnostic or creative conclusion—but it never sees the underlying rules, weights, or reasoning process that led there.
              Your IP remains a black box, protected by military-grade encryption, serving as a private vault for your professional soul.
            </p>
          </section>

          <section>
            <h2>The Vision: A Global Marketplace for Human Wisdom</h2>
            <p>
              Our vision is a world where every industry expert has a "Digital Twin" on YigYaps—a set of sovereign AI plugins that represent their professional brain.
              Whether you are a compliance lawyer in Singapore, a senior growth analyst in San Francisco, or a veteran supply chain manager in Shanghai, you should be able to:
            </p>
            <ul>
              <li><strong>Monetize at Scale:</strong> Earn royalty fees every time a global AI agent (AutoGPT, custom enterprise bots, etc.) consults your logic.</li>
              <li><strong>Maintain Absolute Control:</strong> Your knowledge is yours. It is never used to train global models. It only executes when you are paid.</li>
              <li><strong>Focus on What Matters:</strong> Use our zero-code templates to turn your "mental models" into globally compliant AI plugins in minutes.</li>
            </ul>
          </section>

          <section>
            <h2>Don't Feed the Models. Let the Economy Work for You.</h2>
            <p>
              YigYaps is more than a platform; it's a movement to preserve the value of human wisdom in the age of silicon.
              We are currently in Alpha, and we invite you—the thinkers, the specialists, the veterans—to join us in building the knowledge bank of the future.
            </p>
            <p>
              The era of free knowledge sacrifice is over. The era of Knowledge Sovereignty has begun.
            </p>
          </section>

          <footer style={{ marginTop: "2rem" }}>
            <Link to="/marketplace" className="w98-btn w98-btn--default">Explore the Marketplace</Link>
            <Link to="/publish" className="w98-btn" style={{ marginLeft: "1rem" }}>Assetize Your Knowledge</Link>
          </footer>
        </article>
      </div>
    </Win98Window>
  );
}
