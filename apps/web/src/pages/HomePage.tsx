import { useSearchParams } from "react-router-dom";
import { useSkills } from "../hooks/useSkills";
import { SearchBar } from "../components/SearchBar";
import { FilterPanel } from "../components/FilterPanel";
import { SkillCard } from "../components/SkillCard";
import { SkeletonGrid } from "../components/SkeletonLoader";
import { Pagination } from "../components/Pagination";
import { Win98Window } from "../components/Win98Window";
import type {
  SkillPackageSearchQuery,
  SkillPackageCategory,
  SkillPackageLicense,
  SkillPackageMaturity,
} from "@yigyaps/types";

const ITEMS_PER_PAGE = 20;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") as SkillPackageCategory | null;
  const license = searchParams.get("license") as SkillPackageLicense | null;
  const maturity = searchParams.get("maturity") as SkillPackageMaturity | null;
  const maxPriceUsd = searchParams.get("maxPrice")
    ? parseInt(searchParams.get("maxPrice")!, 10)
    : undefined;
  const sortBy = (searchParams.get("sort") ||
    "popularity") as SkillPackageSearchQuery["sortBy"];
  const page = parseInt(searchParams.get("page") || "1", 10);

  const searchQuery: SkillPackageSearchQuery = {
    query: query || undefined,
    category: category || undefined,
    license: license || undefined,
    maturity: maturity || undefined,
    maxPriceUsd,
    sortBy,
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  };

  const { skills, total, loading, error } = useSkills(searchQuery);

  const handleSearchChange = (newQuery: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (newQuery) {
        params.set("q", newQuery);
      } else {
        params.delete("q");
      }
      params.set("page", "1");
      return params;
    });
  };

  const handleFilterChange = (filters: Partial<SkillPackageSearchQuery>) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (filters.category !== undefined) {
        if (filters.category) params.set("category", filters.category);
        else params.delete("category");
      }
      if (filters.license !== undefined) {
        if (filters.license) params.set("license", filters.license);
        else params.delete("license");
      }
      if (filters.maturity !== undefined) {
        if (filters.maturity) params.set("maturity", filters.maturity);
        else params.delete("maturity");
      }
      if (filters.maxPriceUsd !== undefined && filters.maxPriceUsd !== null) {
        params.set("maxPrice", filters.maxPriceUsd.toString());
      }
      if (filters.sortBy !== undefined) {
        params.set("sort", filters.sortBy);
      }
      params.set("page", "1");
      return params;
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", newPage.toString());
      return params;
    });
  };

  const statusText = loading
    ? "Loading..."
    : error
    ? `Error: ${error}`
    : `${total} skills · Page ${page}`;

  return (
    <Win98Window
      title={`Marketplace — ${total > 0 ? `${total} Skills` : "Browse Skills"}`}
      icon="📦"
      menuItems={[
        { label: "File" }, { label: "View" },
        { label: "Sort" }, { label: "Filter" },
      ]}
      statusBar={
        <>
          <div className="w98-statusbar__panel w98-statusbar__panel--grow">
            {statusText}
          </div>
          <div className="w98-statusbar__panel">↑↓ to navigate · Enter to open</div>
        </>
      }
    >
      {/* Toolbar */}
      <div className="mp-toolbar">
        <SearchBar value={query} onChange={handleSearchChange} />
        <div className="mp-sep" />
        <select
          className="filter-select"
          style={{ height: 21, width: 140, fontFamily: "var(--yig-font-w98)", fontSize: 11 }}
          value={sortBy}
          onChange={(e) =>
            handleFilterChange({ sortBy: e.target.value as SkillPackageSearchQuery["sortBy"] })
          }
        >
          <option value="popularity">By Popularity</option>
          <option value="newest">By Newest</option>
          <option value="rating">By Rating</option>
          <option value="price_asc">Price: Low→High</option>
          <option value="price_desc">Price: High→Low</option>
        </select>
      </div>

      {/* Sidebar + content grid */}
      <div className="mp-layout">
        <div className="mp-sidebar">
          <FilterPanel filters={searchQuery} onFilterChange={handleFilterChange} />
        </div>
        <div className="mp-content">
          {loading && <SkeletonGrid count={6} />}

          {error && !loading && (
            <div className="empty-state">
              <p>{error}</p>
              <button
                className="w98-btn"
                style={{ marginTop: 8 }}
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && skills.length === 0 && (
            <div className="empty-state">
              <p>No skills match your filters.</p>
            </div>
          )}

          {!loading && !error && skills.length > 0 && (
            <>
              <p className="mp-count">
                {query ? `Results for "${query}"` : "All Skills"}
              </p>
              <div className="skills-grid">
                {skills.map((skill) => (
                  <SkillCard key={skill.packageId} skill={skill} />
                ))}
              </div>
              <Pagination
                currentPage={page}
                totalItems={total}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
    </Win98Window>
  );
}
