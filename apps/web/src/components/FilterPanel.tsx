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
        <fieldset className="filter-groupbox">
          <legend className="filter-legend">Sort Order</legend>
          <select
            className="filter-select"
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
        </fieldset>
      </div>

      <div className="filter-group">
        <fieldset className="filter-groupbox">
          <legend className="filter-legend">Domain Category</legend>
          <select
            className="filter-select"
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
        </fieldset>
      </div>

      <div className="filter-group">
        <fieldset className="filter-groupbox">
          <legend className="filter-legend">License Model</legend>
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
        </fieldset>
      </div>

      <div className="filter-group">
        <fieldset className="filter-groupbox">
          <legend className="filter-legend">
            Budget: Up to ${filters.maxPriceUsd ?? 100}
          </legend>
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
        </fieldset>
      </div>
    </div>
  );
}
