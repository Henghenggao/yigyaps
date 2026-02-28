import { useSearchParams } from "react-router-dom";
import { useSkills } from "../hooks/useSkills";
import { useAuth } from "../contexts/AuthContext";
import { Header } from "../components/Header";
import { SearchBar } from "../components/SearchBar";
import { FilterPanel } from "../components/FilterPanel";
import { SkillCard } from "../components/SkillCard";
import { SkeletonGrid } from "../components/SkeletonLoader";
import { Pagination } from "../components/Pagination";
import type {
  SkillPackageSearchQuery,
  SkillPackageCategory,
  SkillPackageLicense,
  SkillPackageMaturity,
} from "@yigyaps/types";

const ITEMS_PER_PAGE = 20;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, login } = useAuth();

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

  return (
    <div className="home-layout">
      <Header user={user} login={login} />

      <main className="home-main">
        <section className="hero-section animate-fade-in">
          <div className="container">
            <h1 className="hero-title">Assetize Your Wisdom.</h1>
            <p className="hero-subtitle">
              The open marketplace for high-value AI skills. Package your
              expertise, license your identity, and generate royalties.
            </p>
            <div className="hero-search-wrapper">
              <SearchBar
                value={query}
                onChange={handleSearchChange}
                placeholder="Search skills, domains, or creators..."
              />
            </div>
          </div>
        </section>

        <section className="marketplace-section">
          <div className="container">
            <div className="marketplace-layout">
              <aside className="marketplace-sidebar">
                <FilterPanel
                  filters={searchQuery}
                  onFilterChange={handleFilterChange}
                />
              </aside>

              <div className="marketplace-content">
                <div className="content-header">
                  <h2 className="section-heading">
                    {query ? `Search: ${query}` : "Recommended Skills"}
                  </h2>
                  {total > 0 && (
                    <span className="results-count">
                      {total} skills available
                    </span>
                  )}
                </div>

                {loading && <SkeletonGrid count={6} />}

                {error && (
                  <div className="error-state">
                    <p>{error}</p>
                    <button className="auth-btn" onClick={() => window.location.reload()}>Retry</button>
                  </div>
                )}

                {!loading && !error && skills.length === 0 && (
                  <div className="empty-state">
                    <p>No skills matches your current filters.</p>
                  </div>
                )}

                {!loading && !error && skills.length > 0 && (
                  <>
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
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} YigYaps. Shared Wisdom for AI Agents.</p>
        </div>
      </footer>

      <style>{`
        .home-main {
          min-height: 80vh;
        }
        .hero-section {
          padding: 7rem 0 5rem;
          text-align: center;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg);
        }
        .hero-title {
          font-family: var(--font-serif);
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 700;
          margin-bottom: 2rem;
          line-height: 1.05;
          letter-spacing: -0.03em;
        }
        .hero-subtitle {
          font-family: var(--font-sans);
          font-size: clamp(1.1rem, 2vw, 1.25rem);
          max-width: 700px;
          margin: 0 auto 4rem;
          color: var(--color-text-sub);
          line-height: 1.6;
          font-weight: 400;
        }
        .hero-search-wrapper {
          max-width: 700px;
          margin: 0 auto;
        }
        .marketplace-section {
          padding: 4rem 0;
        }
        .marketplace-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 3rem;
        }
        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--color-border);
        }
        .section-heading {
          font-size: 1.75rem;
          margin: 0;
        }
        .results-count {
          font-size: 0.9rem;
          color: var(--color-text-sub);
          font-weight: 500;
        }
        .skills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }
        .error-state, .empty-state {
          text-align: center;
          padding: 5rem 0;
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }
        .site-footer {
          padding: 3rem 0;
          border-top: 1px solid var(--color-border);
          text-align: center;
          color: var(--color-text-sub);
          font-size: 0.9rem;
        }
        @media (max-width: 1024px) {
          .marketplace-layout {
            grid-template-columns: 1fr;
          }
          .marketplace-sidebar {
            display: none; /* Mobile filter logic can be added later */
          }
          .hero-title {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
}
