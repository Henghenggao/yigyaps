import { useEffect, useRef } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  mode?: string;
}

const modeLabel: Record<string, { text: string; color: string }> = {
  "lab-preview-expert-key": { text: "Lab · Your Key", color: "#2ecc71" },
  "lab-preview-platform-key": {
    text: "Lab · Platform Key",
    color: "#e67e22",
  },
  mock: { text: "Mock", color: "#95a5a6" },
};

interface ChatInterfaceProps {
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  consented: boolean;
  apiKey: string;
}

export function ChatInterface({
  messages,
  input,
  onInputChange,
  onSend,
  isLoading,
  consented,
  apiKey,
}: ChatInterfaceProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        height: "580px",
      }}
    >
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontWeight: 600 }}>Test Inference</span>
        <span
          style={{
            fontSize: "0.72rem",
            padding: "0.2rem 0.6rem",
            borderRadius: "4px",
            background: apiKey
              ? "rgba(46,204,113,0.12)"
              : "rgba(230,126,34,0.12)",
            color: apiKey ? "#2ecc71" : "#e67e22",
            border: `1px solid ${apiKey ? "rgba(46,204,113,0.3)" : "rgba(230,126,34,0.3)"}`,
            fontWeight: 600,
          }}
        >
          {apiKey ? "Your Key" : "Platform Key"}
        </span>
      </div>

      {/* Chat history */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {messages.length === 0 && !isLoading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-muted)",
              fontSize: "0.875rem",
              textAlign: "center",
            }}
          >
            Send a test message to see how your skill responds.
            <br />
            <br />
            Your first message will show a data notice.
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "0.65rem 1rem",
                    borderRadius:
                      msg.role === "user"
                        ? "12px 12px 2px 12px"
                        : "12px 12px 12px 2px",
                    background:
                      msg.role === "user"
                        ? "var(--color-primary)"
                        : "var(--color-bg)",
                    color:
                      msg.role === "user" ? "#fff" : "var(--color-text)",
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                    border:
                      msg.role === "assistant"
                        ? "1px solid var(--color-border)"
                        : "none",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
              {msg.role === "assistant" &&
                msg.mode &&
                modeLabel[msg.mode] && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: modeLabel[msg.mode].color,
                      marginTop: "0.25rem",
                      paddingLeft: "0.25rem",
                    }}
                  >
                    ● {modeLabel[msg.mode].text}
                  </div>
                )}
            </div>
          ))
        )}
        {isLoading && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "0.65rem 1rem",
              borderRadius: "12px 12px 12px 2px",
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}
          >
            Invoking skill…
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "0.75rem 1.25rem",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          gap: "0.5rem",
        }}
      >
        <input
          type="text"
          className="input"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={
            consented
              ? "Enter a test query…"
              : "Enter a query (you'll see a data notice first)…"
          }
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-primary"
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          style={{ whiteSpace: "nowrap" }}
        >
          Test
        </button>
      </div>
    </div>
  );
}
