/**
 * QuickStartModal
 *
 * Shown immediately after a skill is installed. Gives the user
 * ready-to-paste code for three integration paths:
 *   1. Claude Desktop / MCP Bridge
 *   2. @yigyaps/client SDK (OpenAI, Gemini, LangChain …)
 *   3. Raw REST API (curl)
 *
 * License: Apache 2.0
 */

import { useState } from "react";
import { Link } from "react-router-dom";

type Tab = "mcp" | "sdk" | "rest";

interface QuickStartModalProps {
  packageId: string;
  onClose: () => void;
}

export function QuickStartModal({ packageId, onClose }: QuickStartModalProps) {
  const [tab, setTab] = useState<Tab>("mcp");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      /* ignore */
    });
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  // ── Code snippets ────────────────────────────────────────────────────────

  const installCmd = `npm install -g @yigyaps/cli`;

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        [packageId]: {
          command: "npx",
          args: ["@yigyaps/cli", "mcp-bridge", packageId],
          env: { YIGYAPS_API_KEY: "yyy_xxxx" },
        },
      },
    },
    null,
    2,
  );

  const sdkCode = `import { YigYapsSecurityClient, toOpenAITool } from "@yigyaps/client";

const client = new YigYapsSecurityClient({
  apiKey: process.env.YIGYAPS_API_KEY,
});

// ── Direct invoke ────────────────────────────────
const result = await client.invoke(
  "${packageId}",
  "your input here",
);
console.log(result.conclusion);

// ── As an OpenAI / Claude tool ───────────────────
const tool = toOpenAITool(client, "${packageId}");
// Pass tool.schema to the tools: [] array
// Call tool.execute({ user_query: "..." }) in your handler`;

  const restCode = `curl -X POST \\
  https://api.yigyaps.com/v1/security/invoke/${packageId} \\
  -H "Authorization: Bearer yyy_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"user_query": "your input here"}'`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="qs-overlay" onClick={onClose}>
      <div className="qs-modal" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="qs-header">
          <div className="qs-title-row">
            <span className="qs-check">✅</span>
            <div>
              <h2 className="qs-title">Skill Installed</h2>
              <p className="qs-sub">
                <code className="qs-pkg">{packageId}</code> is ready to use
              </p>
            </div>
          </div>
          <button className="qs-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="qs-tabs">
          <button
            className={`qs-tab ${tab === "mcp" ? "active" : ""}`}
            onClick={() => setTab("mcp")}
          >
            Claude Desktop / MCP
          </button>
          <button
            className={`qs-tab ${tab === "sdk" ? "active" : ""}`}
            onClick={() => setTab("sdk")}
          >
            SDK (GPT · Gemini · LangChain)
          </button>
          <button
            className={`qs-tab ${tab === "rest" ? "active" : ""}`}
            onClick={() => setTab("rest")}
          >
            REST API
          </button>
        </div>

        {/* ── Content ── */}
        <div className="qs-content">
          {/* MCP tab */}
          {tab === "mcp" && (
            <div className="qs-pane">
              <p className="qs-desc">
                Expose this skill as a native tool in Claude Desktop, Cursor, or
                any MCP host. Your API key is in{" "}
                <Link to="/settings" onClick={onClose} className="qs-link">
                  Settings → API Keys
                </Link>
                .
              </p>

              <div className="qs-step">
                <span className="qs-step-num">1</span>
                <div className="qs-step-body">
                  <span className="qs-step-label">Install the YigYaps CLI</span>
                  <CodeBlock
                    code={installCmd}
                    id="cli"
                    copied={copied}
                    onCopy={copy}
                    lang="bash"
                  />
                </div>
              </div>

              <div className="qs-step">
                <span className="qs-step-num">2</span>
                <div className="qs-step-body">
                  <span className="qs-step-label">
                    Add to <code>claude_desktop_config.json</code> and restart
                  </span>
                  <CodeBlock
                    code={mcpConfig}
                    id="mcp"
                    copied={copied}
                    onCopy={copy}
                    lang="json"
                  />
                </div>
              </div>

              <p className="qs-hint">
                The skill will appear as a tool named{" "}
                <strong>{packageId}</strong> in your AI host. Replace{" "}
                <code>yyy_xxxx</code> with your real API key.
              </p>
            </div>
          )}

          {/* SDK tab */}
          {tab === "sdk" && (
            <div className="qs-pane">
              <p className="qs-desc">
                Zero-dependency adapters for OpenAI, Claude, Gemini, Vercel AI
                SDK, and LangChain.
              </p>
              <div className="qs-install-row">
                <code className="qs-inline-cmd">
                  npm install @yigyaps/client
                </code>
                <button
                  className="qs-copy-inline"
                  onClick={() => copy("npm install @yigyaps/client", "npm")}
                >
                  {copied === "npm" ? "Copied!" : "Copy"}
                </button>
              </div>
              <CodeBlock
                code={sdkCode}
                id="sdk"
                copied={copied}
                onCopy={copy}
                lang="typescript"
              />
              <p className="qs-hint">
                Replace <code>process.env.YIGYAPS_API_KEY</code> with your key
                from{" "}
                <Link to="/settings" onClick={onClose} className="qs-link">
                  Settings → API Keys
                </Link>
                . Use <code>toVercelAITool()</code>,{" "}
                <code>toLangChainTool()</code>, or{" "}
                <code>toGeminiFunctionDeclaration()</code> for other frameworks.
              </p>
            </div>
          )}

          {/* REST tab */}
          {tab === "rest" && (
            <div className="qs-pane">
              <p className="qs-desc">
                Direct HTTP — works with any language, curl, Postman, or n8n
                workflow.
              </p>
              <CodeBlock
                code={restCode}
                id="rest"
                copied={copied}
                onCopy={copy}
                lang="bash"
              />
              <p className="qs-hint">
                Get your API key from{" "}
                <Link to="/settings" onClick={onClose} className="qs-link">
                  Settings → API Keys
                </Link>
                . The response includes <code>conclusion</code>,{" "}
                <code>evaluation_details</code>, and <code>privacy_notice</code>
                .
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="qs-footer">
          <Link
            to="/settings"
            onClick={onClose}
            className="btn btn-outline btn-sm"
          >
            Get API Key
          </Link>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>

      <style>{`
        /* ── Overlay ── */
        .qs-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          animation: qs-fade-in 0.15s ease;
        }
        @keyframes qs-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ── Modal card ── */
        .qs-modal {
          background: var(--color-surface, #fff);
          border-radius: 16px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.18);
          width: 100%;
          max-width: 680px;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: qs-slide-up 0.2s ease;
        }
        @keyframes qs-slide-up {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        /* ── Header ── */
        .qs-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.75rem 1.75rem 1.25rem;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }
        .qs-title-row {
          display: flex;
          gap: 0.875rem;
          align-items: flex-start;
        }
        .qs-check { font-size: 1.75rem; line-height: 1; }
        .qs-title {
          margin: 0 0 0.2rem;
          font-size: 1.35rem;
          font-family: var(--font-serif, Georgia, serif);
          color: var(--color-text-main, #1a1a1a);
        }
        .qs-sub {
          margin: 0;
          font-size: 0.9rem;
          color: var(--color-text-sub, #666);
        }
        .qs-pkg {
          font-family: var(--font-mono, monospace);
          background: var(--color-accent-bg, #f5f5f5);
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-size: 0.85rem;
          color: var(--color-primary, #c0392b);
        }
        .qs-close {
          background: none;
          border: none;
          font-size: 1.75rem;
          line-height: 1;
          color: var(--color-text-sub, #999);
          cursor: pointer;
          padding: 0;
          margin-left: 1rem;
          flex-shrink: 0;
        }
        .qs-close:hover { color: var(--color-text-main, #333); }

        /* ── Tabs ── */
        .qs-tabs {
          display: flex;
          gap: 0;
          padding: 0 1.75rem;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-bg, #fafafa);
        }
        .qs-tab {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 0.875rem 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-sub, #777);
          cursor: pointer;
          white-space: nowrap;
          transition: color 0.15s, border-color 0.15s;
          margin-bottom: -1px;
        }
        .qs-tab:hover { color: var(--color-text-main, #333); }
        .qs-tab.active {
          color: var(--color-primary, #c0392b);
          border-bottom-color: var(--color-primary, #c0392b);
        }

        /* ── Content pane ── */
        .qs-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem 1.75rem;
        }
        .qs-pane { display: flex; flex-direction: column; gap: 1rem; }

        .qs-desc {
          margin: 0;
          font-size: 0.9rem;
          color: var(--color-text-sub, #555);
          line-height: 1.6;
        }
        .qs-link {
          color: var(--color-primary, #c0392b);
          font-weight: 600;
          text-decoration: none;
        }
        .qs-link:hover { text-decoration: underline; }

        .qs-hint {
          margin: 0;
          font-size: 0.82rem;
          color: var(--color-text-sub, #777);
          line-height: 1.6;
        }
        .qs-hint code {
          font-family: var(--font-mono, monospace);
          background: var(--color-accent-bg, #f5f5f5);
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          font-size: 0.8rem;
        }

        /* ── Step layout ── */
        .qs-step {
          display: flex;
          gap: 0.875rem;
          align-items: flex-start;
        }
        .qs-step-num {
          flex-shrink: 0;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          background: var(--color-primary, #c0392b);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          margin-top: 0.15rem;
        }
        .qs-step-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .qs-step-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-main, #333);
        }
        .qs-step-label code {
          font-family: var(--font-mono, monospace);
          font-size: 0.8rem;
          font-weight: 400;
        }

        /* ── Inline install row ── */
        .qs-install-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #1e1e2e;
          border-radius: 8px;
          padding: 0.625rem 1rem;
        }
        .qs-inline-cmd {
          flex: 1;
          font-family: var(--font-mono, monospace);
          font-size: 0.875rem;
          color: #e0e0ff;
        }
        .qs-copy-inline {
          background: none;
          border: 1px solid #555;
          border-radius: 5px;
          color: #aaa;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          cursor: pointer;
          white-space: nowrap;
          transition: border-color 0.15s, color 0.15s;
        }
        .qs-copy-inline:hover { border-color: #888; color: #fff; }

        /* ── Footer ── */
        .qs-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.25rem 1.75rem;
          border-top: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-bg, #fafafa);
        }
      `}</style>
    </div>
  );
}

// ── CodeBlock sub-component ──────────────────────────────────────────────────

function CodeBlock({
  code,
  id,
  copied,
  onCopy,
  lang,
}: {
  code: string;
  id: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  lang: string;
}) {
  return (
    <div className="qs-codeblock">
      <div className="qs-codeblock-bar">
        <span className="qs-codeblock-lang">{lang}</span>
        <button className="qs-copy-btn" onClick={() => onCopy(code, id)}>
          {copied === id ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <pre className="qs-pre">{code}</pre>

      <style>{`
        .qs-codeblock {
          border-radius: 10px;
          overflow: hidden;
          background: #1e1e2e;
          border: 1px solid #2a2a3e;
        }
        .qs-codeblock-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.4rem 0.875rem;
          background: #16161f;
          border-bottom: 1px solid #2a2a3e;
        }
        .qs-codeblock-lang {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6b6b8a;
          font-family: var(--font-mono, monospace);
        }
        .qs-copy-btn {
          background: none;
          border: 1px solid #444;
          border-radius: 5px;
          color: #888;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.18rem 0.55rem;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .qs-copy-btn:hover { border-color: #888; color: #ddd; }
        .qs-pre {
          margin: 0;
          padding: 1rem 1rem;
          font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);
          font-size: 0.82rem;
          line-height: 1.65;
          color: #cdd6f4;
          overflow-x: auto;
          white-space: pre;
        }
      `}</style>
    </div>
  );
}
