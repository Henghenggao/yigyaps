import { useState, useEffect } from "react";

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search skills...",
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, onChange]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleClear = () => {
    setInputValue("");
    onChange("");
  };

  return (
    <div className="search-bar-wrapper">
      <div className="search-input-group">
        <svg
          className="search-mag-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          className="search-field"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        {inputValue && (
          <button
            className="search-clear-btn"
            onClick={handleClear}
            aria-label="Clear search"
            type="button"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      <style>{`
        .search-bar-wrapper {
          width: 100%;
          position: relative;
        }
        .search-input-group {
          display: flex;
          align-items: center;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 0.6rem 1.5rem;
          box-shadow: var(--shadow-soft);
          transition: var(--transition);
        }
        .search-input-group:focus-within {
          border-color: var(--color-primary);
          box-shadow: 0 10px 20px -5px rgba(212, 163, 148, 0.15);
          transform: translateY(-2px);
        }
        .search-mag-icon {
          color: var(--color-text-sub);
          margin-right: 1rem;
          flex-shrink: 0;
        }
        .search-field {
          flex: 1;
          border: none;
          background: transparent;
          padding: 0.75rem 0;
          font-size: 1.15rem;
          font-family: var(--font-sans);
          color: var(--color-text-main);
          outline: none;
        }
        .search-field::placeholder {
          color: #A0AEC0;
        }
        .search-clear-btn {
          background: transparent;
          border: none;
          color: var(--color-text-sub);
          padding: 0.5rem;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .search-clear-btn:hover {
          background: var(--color-accent-bg);
          color: var(--color-text-main);
        }
      `}</style>
    </div>
  );
}
