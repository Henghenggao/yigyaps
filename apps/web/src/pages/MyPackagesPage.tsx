import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Header } from "../components/Header";
import { fetchApi } from "../lib/api";

interface PackageSummary {
  id: string;
  packageId: string;
  displayName: string;
  description: string;
  category: string;
  maturity: string;
  status: string;
  installCount: number;
  rating: string | number;
  reviewCount: number;
  icon: string | null;
  createdAt: number;
  updatedAt: number;
}

export function MyPackagesPage() {
  const { user, login } = useAuth();
  const { addToast } = useToast();
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<{ packages: PackageSummary[] }>("/v1/packages/my-packages")
      .then((data) => setPackages(data.packages ?? []))
      .catch(() => addToast({ message: "Failed to load your packages", type: "error" }))
      .finally(() => setLoading(false));
  }, [addToast]);

  const handleArchive = async (pkg: PackageSummary) => {
    if (!window.confirm(`Archive "${pkg.displayName}"? It will no longer appear in search.`)) return;
    setArchiving(pkg.id);
    try {
      await fetchApi(`/v1/packages/${pkg.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "archived" }),
      });
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, status: "archived" } : p)),
      );
      addToast({ message: `"${pkg.displayName}" archived`, type: "success" });
    } catch {
      addToast({ message: "Failed to archive package", type: "error" });
    } finally {
      setArchiving(null);
    }
  };

  const totalInstalls = packages.reduce((s, p) => s + (p.installCount || 0), 0);
  const avgRating =
    packages.length > 0
      ? packages.reduce((s, p) => s + Number(p.rating || 0), 0) / packages.length
      : 0;


  return (
    <div className="app-container">
      <Header user={user} login={login} />

      <main className="main-content dashboard-container">
        <div className="dashboard-header fade-in">
          <div className="header-titles">
            <h1>My Skills</h1>
            <p className="subtitle">Manage and monitor your AI skill packages</p>
          </div>
          <Link to="/publish" className="btn btn-primary">
            + Publish New Skill
          </Link>
        </div>

        {/* Stats bar */}
        {packages.length > 0 && (
          <div className="stats-grid fade-in-up">
            {[
              { label: "Published Skills", value: packages.length, icon: "📦" },
              { label: "Total Installs", value: totalInstalls.toLocaleString(), icon: "📥" },
              { label: "Avg Rating", value: avgRating.toFixed(1), icon: "⭐" },
            ].map((stat) => (
              <div key={stat.label} className="stat-card">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-info">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Gathering your arsenal...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="empty-dashboard fade-in">
            <div className="empty-icon">📦</div>
            <h2>No skills published yet</h2>
            <p>Ready to assetize your wisdom and earn from the agent economy?</p>
            <Link to="/publish" className="btn btn-primary">
              Publish Your First Skill
            </Link>
          </div>
        ) : (
          <div className="dashboard-list fade-in">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.id}
                className="dashboard-item fade-in-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="item-icon">
                  {pkg.icon || pkg.displayName.charAt(0).toUpperCase()}
                </div>

                <div className="item-main">
                  <div className="item-title-row">
                    <span className="item-title">{pkg.displayName}</span>
                    <span className={`status-badge maturity-${pkg.maturity}`}>
                      {pkg.maturity}
                    </span>
                    <span className={`status-badge status-${pkg.status}`}>
                      {pkg.status}
                    </span>
                  </div>
                  <div className="item-desc">{pkg.description}</div>
                  <div className="item-metrics">
                    <span className="metric">
                      <strong>{pkg.installCount.toLocaleString()}</strong> installs
                    </span>
                    {Number(pkg.rating) > 0 && (
                      <span className="metric">
                        <strong>⭐ {Number(pkg.rating).toFixed(1)}</strong> ({pkg.reviewCount})
                      </span>
                    )}
                    <span className="metric category">{pkg.category}</span>
                  </div>
                </div>

                <div className="item-actions">
                  <Link to={`/skill/${pkg.packageId}`} className="btn btn-outline btn-sm">
                    View
                  </Link>
                  <Link to={`/my-packages/${pkg.id}/edit`} className="btn btn-outline btn-sm">
                    Edit
                  </Link>
                  <Link
                    to={`/lab/${pkg.packageId}`}
                    className="btn btn-outline btn-sm btn-accent"
                    title="Open Evolution Lab"
                  >
                    Lab
                  </Link>
                  {pkg.status === "active" && (
                    <button
                      className="btn btn-outline btn-sm btn-danger"
                      disabled={archiving === pkg.id}
                      onClick={() => handleArchive(pkg)}
                    >
                      {archiving === pkg.id ? "..." : "Archive"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
