import { Header } from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export function BlogPage() {
  const { user, login } = useAuth();

  return (
    <div className="blog-layout">
      <Header user={user} login={login} />
      <main className="blog-main">
        <div className="container">
          <article className="blog-post animate-fade-in">
            <header className="post-header">
              <div className="post-meta">
                <span className="post-date">March 2, 2026</span>
                <span className="post-author">By Jerome G., Founder</span>
                <span className="post-category">Vision & Strategy</span>
              </div>
              <h1 className="post-title">
                Why We Built YigYaps: Turning Human Expertise into the Sovereign
                Assets of the AI Era
              </h1>
              <p className="post-intro">
                The AI revolution shouldn't be a zero-sum game between humans
                and machines. We're building YigYaps to ensure that human
                professional judgment remains the most valuable currency in the
                new economy.
              </p>
            </header>

            <div className="post-content">
              <section>
                <h2>The Expertise Paradox</h2>
                <p>
                  Today, we face a strange paradox. Professional expertise is
                  more accessible than ever, yet the people who spent decades
                  acquiring it are feeling increasingly threatened. When you
                  feed your insights into a generic LLM chatbox, you are
                  inadvertently training your own replacement. The value of your
                  "Secret Sauce"—that specific methodology or professional
                  intuition—gets diluted into a statistical average.
                </p>
                <p>
                  <strong>YigYaps was born from a simple question:</strong> How
                  can we let experts share their value with the AI world without
                  giving away their life's work for free?
                </p>
              </section>

              <section>
                <h2>Our Theory: The Blackbox Economy</h2>
                <p>
                  We believe in <em>Assetization</em>, not just{" "}
                  <em>Digitization</em>. Unlike traditional platforms, YigYaps
                  doesn't ask you to "publish your data." Instead, we ask you to
                  "publish your logic."
                </p>
                <p>
                  Through our <strong>Blackbox Defense Architecture</strong>, we
                  turn your professional judgment into an executable API. When
                  an AI agent calls your "Skill" on YigYaps, it receives your
                  high-level diagnostic or creative conclusion—but it never sees
                  the underlying rules, weights, or reasoning process that led
                  there. Your IP remains a black box, protected by
                  military-grade encryption, serving as a private vault for your
                  professional soul.
                </p>
              </section>

              <section>
                <h2>The Vision: A Global Marketplace for Human Wisdom</h2>
                <p>
                  Our vision is a world where every industry expert has a
                  "Digital Twin" on YigYaps—a set of sovereign AI plugins that
                  represent their professional brain. Whether you are a
                  compliance lawyer in Singapore, a senior growth analyst in San
                  Francisco, or a veteran supply chain manager in Shanghai, you
                  should be able to:
                </p>
                <ul>
                  <li>
                    <strong>Monetize at Scale:</strong> Earn royalty fees every
                    time a global AI agent (AutoGPT, custom enterprise bots,
                    etc.) consults your logic.
                  </li>
                  <li>
                    <strong>Maintain Absolute Control:</strong> Your knowledge
                    is yours. It is never used to train global models. It only
                    executes when you are paid.
                  </li>
                  <li>
                    <strong>Focus on What Matters:</strong> Use our zero-code
                    templates to turn your "mental models" into globally
                    compliant AI plugins in minutes.
                  </li>
                </ul>
              </section>

              <section className="post-conclusion">
                <h2>Don't Feed the Models. Let the Economy Work for You.</h2>
                <p>
                  YigYaps is more than a platform; it's a movement to preserve
                  the value of human wisdom in the age of silicon. We are
                  currently in Alpha, and we invite you—the thinkers, the
                  specialists, the veterans—to join us in building the knowledge
                  bank of the future.
                </p>
                <p>
                  The era of free knowledge sacrifice is over. The era of
                  Knowledge Sovereignty has begun.
                </p>
              </section>
            </div>

            <footer className="post-footer">
              <Link to="/marketplace" className="btn-primary">
                Explore the Marketplace
              </Link>
              <Link
                to="/publish"
                className="btn-outline"
                style={{ marginLeft: "1rem" }}
              >
                Assetize Your Knowledge
              </Link>
            </footer>
          </article>
        </div>
      </main>

      <style>{`
        .blog-layout {
          min-height: 100vh;
          background: var(--color-bg);
        }
        .blog-main {
          padding: 6rem 0;
        }
        .blog-post {
          max-width: 800px;
          margin: 0 auto;
          background: var(--color-surface);
          padding: 4rem;
          border-radius: var(--radius-xl);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
        }
        .post-meta {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--color-primary);
          display: flex;
          gap: 1.5rem;
          margin-bottom: 2rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .post-title {
          font-family: var(--font-serif);
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          line-height: 1.2;
          margin-bottom: 2rem;
          color: var(--color-text-main);
          font-weight: 700;
        }
        .post-intro {
          font-size: 1.4rem;
          line-height: 1.6;
          color: var(--color-text-sub);
          margin-bottom: 4rem;
          font-style: italic;
          border-left: 4px solid var(--color-dot);
          padding-left: 2rem;
        }
        .post-content h2 {
          font-family: var(--font-serif);
          font-size: 2rem;
          margin: 3rem 0 1.5rem;
          color: var(--color-text-main);
        }
        .post-content p {
          font-size: 1.15rem;
          line-height: 1.8;
          color: var(--color-text-sub);
          margin-bottom: 2rem;
        }
        .post-content ul {
          margin-bottom: 3rem;
          padding-left: 1.5rem;
        }
        .post-content li {
          font-size: 1.15rem;
          line-height: 1.8;
          color: var(--color-text-sub);
          margin-bottom: 1rem;
        }
        .post-conclusion {
          margin-top: 5rem;
          padding-top: 3rem;
          border-top: 1px solid var(--color-border);
        }
        .post-footer {
          margin-top: 4rem;
          display: flex;
          align-items: center;
        }
        @media (max-width: 768px) {
          .blog-post {
            padding: 2rem;
            border-radius: 0;
            border: none;
          }
          .post-meta {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
