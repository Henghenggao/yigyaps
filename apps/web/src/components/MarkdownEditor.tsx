import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TOOLBAR_ITEMS = [
  { label: "B", title: "Bold", before: "**", after: "**" },
  { label: "I", title: "Italic", before: "_", after: "_" },
  { label: "H", title: "Heading", before: "## ", after: "" },
  { label: "•", title: "List", before: "- ", after: "" },
  { label: "</>", title: "Code block", before: "```\n", after: "\n```" },
  { label: "🔗", title: "Link", before: "[", after: "](url)" },
] as const;

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  height?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  maxLength = 5000,
  placeholder = "Write markdown here...",
  height = "320px",
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAt = (before: string, after = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const newVal =
      value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  };

  const overLimit = value.length > maxLength;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          padding: "0.375rem",
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "6px 6px 0 0",
        }}
      >
        {TOOLBAR_ITEMS.map((btn) => (
          <button
            key={btn.title}
            type="button"
            title={btn.title}
            onClick={() => insertAt(btn.before, btn.after)}
            style={{
              background: "none",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              padding: "0.2rem 0.5rem",
              color: "var(--color-text)",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontFamily: "monospace",
            }}
          >
            {btn.label}
          </button>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.8rem",
            color: overLimit ? "#e74c3c" : "var(--color-text-muted)",
            alignSelf: "center",
          }}
        >
          {value.length} / {maxLength}
        </span>
      </div>

      {/* Split pane */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0",
          border: "1px solid var(--color-border)",
          borderTop: "none",
          borderRadius: "0 0 6px 6px",
          overflow: "hidden",
          height,
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength + 100}
          style={{
            padding: "0.75rem",
            background: "var(--color-card)",
            border: "none",
            borderRight: "1px solid var(--color-border)",
            color: "var(--color-text)",
            fontFamily: "monospace",
            fontSize: "0.875rem",
            resize: "none",
            height: "100%",
            outline: "none",
          }}
        />
        <div
          style={{
            padding: "0.75rem",
            background: "rgba(0,0,0,0.15)",
            overflowY: "auto",
            fontSize: "0.875rem",
          }}
          className="markdown-content"
        >
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
              Preview will appear here...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
