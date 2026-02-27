import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { fetchApi } from "../lib/api";
import { Header } from "../components/Header";
import { Link } from "react-router-dom";

type AdminTab = "overview" | "packages" | "users" | "reports";

interface Stats {
  users: { total: number; newToday: number };
  packages: { total: number; active: number; banned: number };
  installations: { total: number };
  reports: { pending: number };
}

interface AdminPackage {
  id: string;
  packageId: string;
  displayName: string;
  status: string;
  author: string;
  authorName: string;
  category: string;
  installCount: number;
  createdAt: number;
}

interface AdminUser {
  id: string;
  githubUsername: string;
  displayName: string;
  role: string;
  tier: number;
  createdAt: number;
}

interface Report {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  adminNote: string | null;
  createdAt: number;
}

export function AdminPage() {
  const { user, login } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [pkgStatusFilter, setPkgStatusFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("pending");
  const [userSearch, setUserSearch] = useState("");
  const [reportNote, setReportNote] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchApi<Stats>("/v1/admin/stats")
      .then(setStats)
      .catch(() => addToast({ message: "Failed to load stats", type: "error" }))
      .finally(() => setLoadingStats(false));
    // addToast is stable from context; intentional mount-only fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "overview") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingTab(true);
    if (tab === "packages") {
      const q = pkgStatusFilter !== "all" ? `?status=${pkgStatusFilter}` : "";
      fetchApi<{ packages: AdminPackage[] }>(`/v1/admin/packages${q}`)
        .then((d) => setPackages(d.packages))
        .catch(() => addToast({ message: "Failed to load packages", type: "error" }))
        .finally(() => setLoadingTab(false));
    } else if (tab === "users") {
      const q = userSearch ? `?q=${encodeURIComponent(userSearch)}` : "";
      fetchApi<{ users: AdminUser[] }>(`/v1/admin/users${q}`)
        .then((d) => setUsers(d.users))
        .catch(() => addToast({ message: "Failed to load users", type: "error" }))
        .finally(() => setLoadingTab(false));
    } else if (tab === "reports") {
      fetchApi<{ reports: Report[] }>(`/v1/admin/reports?status=${reportStatusFilter}`)
        .then((d) => setReports(d.reports))
        .catch(() => addToast({ message: "Failed to load reports", type: "error" }))
        .finally(() => setLoadingTab(false));
    }
    // userSearch intentionally omitted — search only on tab switch/Enter, not on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pkgStatusFilter, reportStatusFilter, addToast]);

  const handlePkgStatus = async (id: string, status: string) => {
    try {
      await fetchApi(`/v1/admin/packages/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setPackages((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
      addToast({ message: `Package ${status}`, type: "success" });
    } catch {
      addToast({ message: "Failed to update package status", type: "error" });
    }
  };

  const handleUserRole = async (id: string, role: string) => {
    try {
      await fetchApi(`/v1/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
      addToast({ message: `User role updated to ${role}`, type: "success" });
    } catch {
      addToast({ message: "Failed to update user role", type: "error" });
    }
  };

  const handleReport = async (id: string, status: "resolved" | "dismissed") => {
    try {
      await fetchApi(`/v1/admin/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote: reportNote[id] || undefined }),
      });
      setReports((prev) => prev.filter((r) => r.id !== id));
      addToast({ message: `Report ${status}`, type: "success" });
    } catch {
      addToast({ message: "Failed to update report", type: "error" });
    }
  };

  const tabs: { key: AdminTab; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "packages", label: "Packages" },
    { key: "users", label: "Users" },
    { key: "reports", label: "Reports", badge: stats?.reports.pending },
  ];

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  const statusColor = (s: string) => {
    if (s === "active") return "#2ecc71";
    if (s === "archived") return "#f39c12";
    if (s === "banned") return "#e74c3c";
    return "var(--color-text-muted)";
  };

  return (
    <div className="app-container">
      <Header user={user} login={login} />

      <main className="main-content" style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Admin Dashboard</h1>
          <span
            style={{
              padding: "0.2rem 0.6rem",
              background: "#e74c3c",
              color: "#fff",
              borderRadius: "4px",
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Admin
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", marginBottom: "2rem" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: "none",
                border: "none",
                borderBottom: tab === t.key ? "2px solid var(--color-primary)" : "2px solid transparent",
                padding: "0.75rem 1.25rem",
                cursor: "pointer",
                color: tab === t.key ? "var(--color-primary)" : "var(--color-text-muted)",
                fontWeight: tab === t.key ? 600 : 400,
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span
                  style={{
                    display: "inline-block",
                    minWidth: "18px",
                    height: "18px",
                    lineHeight: "18px",
                    textAlign: "center",
                    background: "#e74c3c",
                    color: "#fff",
                    borderRadius: "9px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "0 4px",
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div>
            {loadingStats ? (
              <div style={{ color: "var(--color-text-muted)" }}>Loading stats...</div>
            ) : stats ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                {[
                  { label: "Total Users", value: stats.users.total, sub: `+${stats.users.newToday} today` },
                  { label: "Total Packages", value: stats.packages.total, sub: `${stats.packages.active} active` },
                  { label: "Banned Packages", value: stats.packages.banned, sub: "banned", color: stats.packages.banned > 0 ? "#e74c3c" : undefined },
                  { label: "Total Installs", value: stats.installations.total, sub: "all time" },
                  { label: "Pending Reports", value: stats.reports.pending, sub: "need review", color: stats.reports.pending > 0 ? "#e74c3c" : undefined },
                ].map((card) => (
                  <div
                    key={card.label}
                    style={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      padding: "1.25rem",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                      {card.label}
                    </div>
                    <div
                      style={{
                        fontSize: "2rem",
                        fontWeight: 700,
                        color: card.color || "var(--color-text)",
                        lineHeight: 1,
                        marginBottom: "0.25rem",
                      }}
                    >
                      {card.value}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{card.sub}</div>
                  </div>
                ))}
              </div>
            ) : null}
            <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              Use the tabs above to manage packages, users, and content reports.
            </div>
          </div>
        )}

        {/* Packages */}
        {tab === "packages" && (
          <div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {["all", "active", "archived", "banned"].map((s) => (
                <button
                  key={s}
                  onClick={() => setPkgStatusFilter(s)}
                  className={pkgStatusFilter === s ? "btn btn-primary" : "btn btn-outline"}
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.8rem" }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {loadingTab ? (
              <div style={{ color: "var(--color-text-muted)" }}>Loading...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {packages.length === 0 ? (
                  <div style={{ color: "var(--color-text-muted)", padding: "2rem 0" }}>No packages found.</div>
                ) : packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      padding: "0.875rem 1rem",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>
                        <Link to={`/skill/${pkg.packageId}`} style={{ color: "var(--color-text)", textDecoration: "none" }}>
                          {pkg.displayName}
                        </Link>
                        <span style={{ marginLeft: "0.5rem", fontSize: "0.78rem", fontFamily: "monospace", color: "var(--color-text-muted)" }}>
                          {pkg.packageId}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                        By {pkg.authorName} · {pkg.category} · {pkg.installCount} installs · {formatDate(pkg.createdAt)}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: statusColor(pkg.status) + "22",
                        color: statusColor(pkg.status),
                      }}
                    >
                      {pkg.status}
                    </span>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {pkg.status !== "active" && (
                        <button className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem", color: "#2ecc71" }} onClick={() => handlePkgStatus(pkg.id, "active")}>
                          Activate
                        </button>
                      )}
                      {pkg.status !== "archived" && (
                        <button className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }} onClick={() => handlePkgStatus(pkg.id, "archived")}>
                          Archive
                        </button>
                      )}
                      {pkg.status !== "banned" && (
                        <button className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem", color: "#e74c3c" }} onClick={() => handlePkgStatus(pkg.id, "banned")}>
                          Ban
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div>
            <div style={{ marginBottom: "1.25rem" }}>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setTab("users"); }}
                placeholder="Search by username..."
                className="publish-input"
                style={{
                  width: "300px",
                  padding: "0.6rem 0.75rem",
                  background: "var(--color-input-bg, #1a1a1a)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  color: "var(--color-text)",
                }}
              />
            </div>

            {loadingTab ? (
              <div style={{ color: "var(--color-text-muted)" }}>Loading...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {users.length === 0 ? (
                  <div style={{ color: "var(--color-text-muted)", padding: "2rem 0" }}>No users found.</div>
                ) : users.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      padding: "0.875rem 1rem",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{u.displayName}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                        @{u.githubUsername} · Tier {u.tier} · Joined {formatDate(u.createdAt)}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: u.role === "admin" ? "rgba(231,76,60,0.15)" : "var(--color-border)",
                        color: u.role === "admin" ? "#e74c3c" : "var(--color-text-muted)",
                      }}
                    >
                      {u.role}
                    </span>
                    <select
                      value={u.role}
                      onChange={(e) => handleUserRole(u.id, e.target.value)}
                      style={{
                        padding: "0.35rem 0.6rem",
                        background: "var(--color-input-bg, #1a1a1a)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "4px",
                        color: "var(--color-text)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reports */}
        {tab === "reports" && (
          <div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {["pending", "resolved", "dismissed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setReportStatusFilter(s)}
                  className={reportStatusFilter === s ? "btn btn-primary" : "btn btn-outline"}
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.8rem" }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {loadingTab ? (
              <div style={{ color: "var(--color-text-muted)" }}>Loading...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {reports.length === 0 ? (
                  <div style={{ color: "var(--color-text-muted)", padding: "2rem 0" }}>
                    No {reportStatusFilter} reports.
                  </div>
                ) : reports.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      padding: "1rem 1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div>
                        <span style={{ fontWeight: 600, marginRight: "0.5rem" }}>{r.reason.replace(/_/g, " ")}</span>
                        <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                          {r.targetType}: <code>{r.targetId}</code>
                        </span>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{formatDate(r.createdAt)}</span>
                    </div>
                    {r.description && (
                      <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
                        {r.description}
                      </div>
                    )}
                    {r.status === "pending" && (
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
                        <input
                          value={reportNote[r.id] || ""}
                          onChange={(e) => setReportNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Optional admin note..."
                          className="publish-input"
                          style={{
                            flex: 1,
                            padding: "0.4rem 0.6rem",
                            background: "var(--color-input-bg, #1a1a1a)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "4px",
                            color: "var(--color-text)",
                            fontSize: "0.8rem",
                          }}
                        />
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: "0.78rem", color: "#2ecc71" }}
                          onClick={() => handleReport(r.id, "resolved")}
                        >
                          Resolve
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: "0.78rem" }}
                          onClick={() => handleReport(r.id, "dismissed")}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                    {r.adminNote && (
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.5rem", fontStyle: "italic" }}>
                        Admin note: {r.adminNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
