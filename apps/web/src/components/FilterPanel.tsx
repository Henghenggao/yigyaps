import type {
  SkillPackageSearchQuery,
  SkillPackageCategory,
  SkillPackageLicense,
} from "@yigyaps/types";

interface FilterPanelProps {
  filters: SkillPackageSearchQuery;
  onFilterChange: (filters: Partial<SkillPackageSearchQuery>) => void;
}

const CATEGORIES: { value: SkillPackageCategory; label: string }[] = [
  { value: "development", label: "Development" },
  { value: "communication", label: "Communication" },
  { value: "productivity", label: "Productivity" },
  { value: "research", label: "Research" },
  { value: "integration", label: "Integration" },
  { value: "data", label: "Data" },
  { value: "automation", label: "Automation" },
  { value: "security", label: "Security" },
  { value: "ai-ml", label: "AI & Machine Learning" },
  { value: "personality", label: "Personality" },
  { value: "wisdom", label: "Expert Wisdom" },
  { value: "voice", label: "Voice & Audio" },
  { value: "likeness", label: "Digital Likeness" },
  { value: "other", label: "Other" },
];

const LICENSES: { value: SkillPackageLicense | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "open-source", label: "Open Source" },
  { value: "free", label: "Free Proprietary" },
  { value: "premium", label: "Premium" },
];

const SORT_OPTIONS = [
  { value: "popularity", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
  { value: "recent", label: "Recently Added" },
  { value: "name", label: "Name (A-Z)" },
];

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const handleClearFilters = () => {
    onFilterChange({
      category: undefined,
      license: undefined,
      maturity: undefined,
      maxPriceUsd: undefined,
      sortBy: "popularity",
    });
  };

  const hasActiveFilters =
    filters.category ||
    filters.license ||
    filters.maturity ||
    filters.maxPriceUsd !== undefined;

  return (
    <div className="filter-panel-wrapper">
      <div className="filter-section-header">
        <h3 className="filter-title">Refine Search</h3>
        {hasActiveFilters && (
          <button className="clear-link" onClick={handleClearFilters}>
            Reset
          </button>
        )}
      </div>

      <div className="filter-group">
        <label className="filter-label">Sort Order</label>
        <select
          className="filter-dropdown"
          value={filters.sortBy || "popularity"}
          onChange={(e) =>
            onFilterChange({
              sortBy: e.target.value as SkillPackageSearchQuery["sortBy"],
            })
          }
        >
          {SORT_OPTIONS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Domain Category</label>
        <select
          className="filter-dropdown"
          value={filters.category || ""}
          onChange={(e) =>
            onFilterChange({
              category: e.target.value
                ? (e.target.value as SkillPackageCategory)
                : undefined,
            })
          }
        >
          <option value="">All Domains</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">License Model</label>
        <div className="filter-option-list">
          {LICENSES.map((lic) => (
            <label key={lic.value} className="filter-option-item">
              <input
                type="radio"
                name="license"
                value={lic.value}
                className="filter-radio-input"
                checked={
                  lic.value === "all"
                    ? !filters.license
                    : filters.license === lic.value
                }
                onChange={(e) =>
                  onFilterChange({
                    license:
                      e.target.value === "all"
                        ? undefined
                        : (e.target.value as SkillPackageLicense),
                  })
                }
              />
              <span className="option-text">{lic.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label">
          Budget: Up to ${filters.maxPriceUsd ?? 100}
        </label>
        <input
          type="range"
          className="filter-price-slider"
          min="0"
          max="100"
          step="5"
          value={filters.maxPriceUsd ?? 100}
          onChange={(e) =>
            onFilterChange({ maxPriceUsd: parseInt(e.target.value, 10) })
          }
        />
        <div className="price-range-info">
          <span>$0</span>
          <span>$100+</span>
        </div>
      </div>

      <style>{`
        .filter-panel-wrapper {
          position: sticky;
          top: 100px;
        }
        .filter-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .filter-title {
          font-family: var(--font-sans);
          font-weight: 600;
          font-size: 1.1rem;
          margin: 0;
          color: var(--color-text-main);
        }
        .clear-link {
          background: none;
          border: none;
          color: var(--color-primary);
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          text-decoration: underline;
        }
        .filter-group {
          margin-bottom: 2.5rem;
        }
        .filter-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-sub);
          margin-bottom: 0.75rem;
        }
        .filter-dropdown {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background-color: var(--color-surface);
          font-family: var(--font-sans);
          font-size: 0.95rem;
          outline: none;
          cursor: pointer;
        }
        .filter-dropdown:focus {
          border-color: var(--color-primary);
        }
        .filter-option-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .filter-option-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          font-size: 0.95rem;
          color: var(--color-text-main);
        }
        .filter-radio-input {
          width: 18px;
          height: 18px;
          accent-color: var(--color-primary);
        }
        .filter-price-slider {
          width: 100%;
          height: 4px;
          -webkit-appearance: none;
          background: var(--color-border);
          border-radius: 2px;
          outline: none;
          accent-color: var(--color-primary);
        }
        .price-range-info {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: var(--color-text-sub);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
