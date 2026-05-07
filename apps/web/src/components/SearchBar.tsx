import { useState, useEffect } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search skills...' }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => { onChange(inputValue); }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, onChange]);

  useEffect(() => { setInputValue(value); }, [value]);

  const handleClear = () => { setInputValue(''); onChange(''); };

  return (
    <div className="search-bar-wrapper">
      <input
        type="text"
        className="w98-search-input"
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
          ✕
        </button>
      )}
    </div>
  );
}
