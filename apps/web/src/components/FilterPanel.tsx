import type {
  SkillPackageSearchQuery,
  SkillPackageCategory,
  SkillPackageLicense,
  SkillPackageMaturity,
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
  { value: "ai-ml", label: "AI/ML" },
  { value: "personality", label: "Personality" },
  { value: "wisdom", label: "Wisdom" },
  { value: "voice", label: "Voice" },
  { value: "likeness", label: "Likeness" },
  { value: "other", label: "Other" },
];

const LICENSES: { value: SkillPackageLicense | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open-source", label: "Open Source" },
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
  { value: "enterprise", label: "Enterprise" },
];

const MATURITIES: { value: SkillPackageMaturity | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "experimental", label: "Experimental" },
  { value: "beta", label: "Beta" },
  { value: "stable", label: "Stable" },
  { value: "deprecated", label: "Deprecated" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "popularity", label: "Popularity" },
  { value: "rating", label: "Rating" },
  { value: "recent", label: "Recent" },
  { value: "name", label: "Name" },
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
    <div className="filter-panel">
      <div className="filter-header">
        <h3>Filters</h3>
        {hasActiveFilters && (
          <button className="btn-text" onClick={handleClearFilters}>
            Clear All
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="filter-group">
        <label className="filter-label">Category</label>
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
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* License Filter */}
      <div className="filter-group">
        <label className="filter-label">License</label>
        <div className="filter-radio-group">
          {LICENSES.map((lic) => (
            <label key={lic.value} className="filter-radio-label">
              <input
                type="radio"
                name="license"
                value={lic.value}
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
              <span>{lic.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Maturity Filter */}
      <div className="filter-group">
        <label className="filter-label">Maturity</label>
        <div className="filter-radio-group">
          {MATURITIES.map((mat) => (
            <label key={mat.value} className="filter-radio-label">
              <input
                type="radio"
                name="maturity"
                value={mat.value}
                checked={
                  mat.value === "all"
                    ? !filters.maturity
                    : filters.maturity === mat.value
                }
                onChange={(e) =>
                  onFilterChange({
                    maturity:
                      e.target.value === "all"
                        ? undefined
                        : (e.target.value as SkillPackageMaturity),
                  })
                }
              />
              <span>{mat.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="filter-group">
        <label className="filter-label">
          Max Price: ${filters.maxPriceUsd ?? 100} USD
        </label>
        <input
          type="range"
          className="filter-range"
          min="0"
          max="100"
          step="5"
          value={filters.maxPriceUsd ?? 100}
          onChange={(e) =>
            onFilterChange({ maxPriceUsd: parseInt(e.target.value, 10) })
          }
        />
        <div className="filter-range-labels">
          <span>$0</span>
          <span>$100</span>
        </div>
      </div>

      {/* Sort By */}
      <div className="filter-group">
        <label className="filter-label">Sort By</label>
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
      </div>
    </div>
  );
}
