import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import { fetchApi } from "../lib/api";
import { Win98Window } from "../components/Win98Window";

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

interface Earnings {
  allTimeUsd: number;
  last30dUsd: number;
  creatorSharePercent: number;
}

export function MyPackagesPage() {
  const { addToast } = useToast();
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);

  useEffect(() => {
    fetchApi<{ packages: PackageSummary[] }>("/v1/packages/my-packages")
      .then((data) => setPackages(data.packages ?? []))
      .catch(() => addToast({ message: "Failed to load your packages", type: "error" }))
      .finally(() => setLoading(false));

    fetchApi<Earnings>("/v1/stripe/earnings")
      .then((data) => setEarnings(data))
      .catch(() => {}); // Earnings are optional — silently skip if Stripe not configured
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
    <Win98Window
      title="📊 My Packages — Dashboard"
      icon="📊"
      menuItems={[{ label: "File" }, { label: "View" }, { label: "Help" }]}
      statusBar={loading ? "Loading..." : `${packages.length} package${packages.length !== 1 ? "s" : ""}`}
    >
      {/* Header action row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <p className="wizard-sub" style={{ margin: 0 }}>Manage and monitor your AI skill packages</p>
        <Link to="/publish" className="w98-btn w98-btn--default">
          + Publish New Skill
        </Link>
      </div>

      {/* Stats row */}
      {packages.length > 0 && (
        <div className="dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-value">{packages.length}</div>
            <div className="dash-stat-label">Skills Published</div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-value">{totalInstalls.toLocaleString()}</div>
            <div className="dash-stat-label">Total Installs</div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-value">{avgRating.toFixed(1)}</div>
            <div className="dash-stat-label">Avg Rating</div>
          </div>
          {earnings && (
            <>
              <div className="dash-stat">
                <div className="dash-stat-value">${Number(earnings.last30dUsd || 0).toFixed(2)}</div>
                <div className="dash-stat-label">Earnings (30d)</div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-value">${Number(earnings.allTimeUsd || 0).toFixed(2)}</div>
                <div className="dash-stat-label">Earnings (all time)</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="empty-state">
          <p>Gathering your arsenal...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && packages.length === 0 && (
        <div className="empty-state">
          <p>No skills published yet.</p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            Ready to assetize your wisdom and earn from the agent economy?
          </p>
          <Link to="/publish" className="w98-btn w98-btn--default" style={{ marginTop: 8, display: "inline-flex" }}>
            Publish Your First Skill
          </Link>
        </div>
      )}

      {/* Package list */}
      {!loading && packages.length > 0 && (
        <div className="dash-list">
          {packages.map((pkg) => (
            <div key={pkg.id} className="dash-item">
              <div className="dash-item-icon">
                {pkg.icon || pkg.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="dash-item-main">
                <p className="dash-item-title">
                  {pkg.displayName}
                  {" "}
                  <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>[{pkg.maturity}]</span>
                  {" "}
                  <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>[{pkg.status}]</span>
                </p>
                <p className="dash-item-sub">
                  {[
                    pkg.category,
                    pkg.installCount ? `${pkg.installCount.toLocaleString()} installs` : null,
                    Number(pkg.rating) > 0 ? `⭐ ${Number(pkg.rating).toFixed(1)} (${pkg.reviewCount})` : null,
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="dash-item-actions">
                <Link to={`/skill/${pkg.packageId}`} className="w98-btn">
                  View
                </Link>
                <Link to={`/my-packages/${pkg.id}/edit`} className="w98-btn">
                  Edit
                </Link>
                <Link
                  to={`/lab/${pkg.packageId}`}
                  className="w98-btn"
                  title="Open Evolution Lab"
                >
                  Lab
                </Link>
                {pkg.status === "active" && (
                  <button
                    className="w98-btn"
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
    </Win98Window>
  );
}
