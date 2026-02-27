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
  }, []);

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

  const maturityColors: Record<string, string> = {
    experimental: "#e67e22",
    beta: "#3498db",
    stable: "#2ecc71",
    deprecated: "#95a5a6",
  };

  const statusColors: Record<string, string> = {
    active: "#2ecc71",
    archived: "#95a5a6",
    banned: "#e74c3c",
  };

  return (
    <div className="app-container">
      <Header user={user} login={login} />

      <main className="main-content" style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem",
          }}
        >
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>My Skills</h1>
          <Link to="/publish" className="btn btn-primary">
            + Publish New Skill
          </Link>
        </div>

        {/* Stats bar */}
        {packages.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            {[
              { label: "Published Skills", value: packages.length },
              { label: "Total Installs", value: totalInstalls.toLocaleString() },
              { label: "Avg Rating", value: avgRating.toFixed(1) + " ⭐" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-primary)" }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
            Loading your skills...
          </div>
        ) : packages.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📦</div>
            <h2 style={{ margin: "0 0 0.75rem" }}>No skills published yet</h2>
            <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
              Share your expertise with the Agent economy.
            </p>
            <Link to="/publish" className="btn btn-primary">
              Publish Your First Skill
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    background: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    flexShrink: 0,
                  }}
                >
                  {pkg.icon || pkg.displayName.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: "1rem" }}>{pkg.displayName}</span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                        background: `${maturityColors[pkg.maturity] ?? "#666"}22`,
                        color: maturityColors[pkg.maturity] ?? "#666",
                        border: `1px solid ${maturityColors[pkg.maturity] ?? "#666"}44`,
                      }}
                    >
                      {pkg.maturity}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                        background: `${statusColors[pkg.status] ?? "#666"}22`,
                        color: statusColors[pkg.status] ?? "#666",
                        border: `1px solid ${statusColors[pkg.status] ?? "#666"}44`,
                      }}
                    >
                      {pkg.status}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--color-text-muted)",
                      marginTop: "0.2rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {pkg.description}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginTop: "0.4rem",
                      fontSize: "0.8rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <span>{pkg.installCount} installs</span>
                    {Number(pkg.rating) > 0 && (
                      <span>⭐ {Number(pkg.rating).toFixed(1)} ({pkg.reviewCount})</span>
                    )}
                    <span>{pkg.category}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <Link
                    to={`/skill/${pkg.packageId}`}
                    className="btn btn-outline"
                    style={{ fontSize: "0.85rem", padding: "0.4rem 0.85rem" }}
                  >
                    View
                  </Link>
                  <Link
                    to={`/my-packages/${pkg.id}/edit`}
                    className="btn btn-outline"
                    style={{ fontSize: "0.85rem", padding: "0.4rem 0.85rem" }}
                  >
                    Edit
                  </Link>
                  {pkg.status === "active" && (
                    <button
                      className="btn btn-outline"
                      style={{
                        fontSize: "0.85rem",
                        padding: "0.4rem 0.85rem",
                        opacity: archiving === pkg.id ? 0.5 : 1,
                      }}
                      disabled={archiving === pkg.id}
                      onClick={() => handleArchive(pkg)}
                    >
                      Archive
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
