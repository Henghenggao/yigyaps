import { useSearchParams } from 'react-router-dom';
import { useSkills } from '../hooks/useSkills';
import { useAuth } from '../contexts/AuthContext';
import { UserMenu } from '../components/UserMenu';
import { SearchBar } from '../components/SearchBar';
import { FilterPanel } from '../components/FilterPanel';
import { SkillCard } from '../components/SkillCard';
import { Pagination } from '../components/Pagination';
import type { SkillPackageSearchQuery, SkillPackageCategory, SkillPackageLicense, SkillPackageMaturity } from '@yigyaps/types';

const ITEMS_PER_PAGE = 20;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, login } = useAuth();

  // Extract search parameters from URL
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') as SkillPackageCategory | null;
  const license = searchParams.get('license') as SkillPackageLicense | null;
  const maturity = searchParams.get('maturity') as SkillPackageMaturity | null;
  const maxPriceUsd = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!, 10) : undefined;
  const sortBy = (searchParams.get('sort') || 'popularity') as SkillPackageSearchQuery['sortBy'];
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Build search query object
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

  // Update URL when search query changes
  const handleSearchChange = (newQuery: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (newQuery) {
        params.set('q', newQuery);
      } else {
        params.delete('q');
      }
      params.set('page', '1'); // Reset to page 1 on search
      return params;
    });
  };

  // Update URL when filters change
  const handleFilterChange = (filters: Partial<SkillPackageSearchQuery>) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);

      // Update each filter
      if (filters.category !== undefined) {
        if (filters.category) {
          params.set('category', filters.category);
        } else {
          params.delete('category');
        }
      }

      if (filters.license !== undefined) {
        if (filters.license) {
          params.set('license', filters.license);
        } else {
          params.delete('license');
        }
      }

      if (filters.maturity !== undefined) {
        if (filters.maturity) {
          params.set('maturity', filters.maturity);
        } else {
          params.delete('maturity');
        }
      }

      if (filters.maxPriceUsd !== undefined && filters.maxPriceUsd !== null) {
        params.set('maxPrice', filters.maxPriceUsd.toString());
      }

      if (filters.sortBy !== undefined) {
        params.set('sort', filters.sortBy);
      }

      params.set('page', '1'); // Reset to page 1 on filter change
      return params;
    });
  };

  // Update URL when page changes
  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('page', newPage.toString());
      return params;
    });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          Yig<span>Yaps</span>
        </div>
        <nav className="nav-links">
          <a href="#">Marketplace</a>
          <a href="/publish">Publish Skill</a>
          <a href="#">Creators</a>
          <a href="#">Docs</a>
        </nav>
        <div className="header-actions">
          {user ? (
            <UserMenu />
          ) : (
            <button className="btn btn-outline" onClick={login}>
              Sign In
            </button>
          )}
          <button className="btn btn-primary">Connect Agent</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero">
          <h1>Assetize Your Wisdom.</h1>
          <p>
            The open marketplace for high-value AI skills. Package your expertise, license your identity, and generate royalties.
          </p>
          <SearchBar
            value={query}
            onChange={handleSearchChange}
            placeholder="Search skills, verified identities, or domain wisdom..."
          />
        </section>

        {/* Skills Section with Filters */}
        <section className="skills-section">
          <div className="section-header">
            <div className="section-title">
              {query ? `Search Results for "${query}"` : 'Top Minted Skills'}
            </div>
            {total > 0 && (
              <div className="section-subtitle">
                {total} {total === 1 ? 'skill' : 'skills'} found
              </div>
            )}
          </div>

          <div className="skills-content">
            {/* Filter Panel (Left Sidebar) */}
            <FilterPanel filters={searchQuery} onFilterChange={handleFilterChange} />

            {/* Skills Grid (Main Content) */}
            <div className="skills-main">
              {loading && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  Loading skills...
                </div>
              )}

              {error && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-accent)' }}>
                  {error}
                </div>
              )}

              {!loading && !error && skills.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  No skills found. Try adjusting your filters.
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
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.85rem',
        }}
      >
        <p>&copy; {new Date().getFullYear()} YigYaps. Apache 2.0 Licensed.</p>
      </footer>
    </div>
  );
}
