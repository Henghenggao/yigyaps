import { useEffect, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import { fetchApi } from "../lib/api";
import { Link } from "react-router-dom";
import { Win98Window } from "../components/Win98Window";

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
  }, [addToast]);

  useEffect(() => {
    if (tab === "overview") return;
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

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  const statusColor = (s: string) => {
    if (s === "active") return "#2ecc71";
    if (s === "archived") return "#f39c12";
    if (s === "banned") return "#e74c3c";
    return "var(--color-text-muted)";
  };

  return (
    <Win98Window
      title="🛡 Admin — Yig Yaps Registry"
      icon="🛡"
      tabs={[
        { label: "Overview", active: tab === "overview", onClick: () => setTab("overview") },
        {
          label: `Packages`,
          active: tab === "packages",
          onClick: () => setTab("packages"),
        },
        { label: "Users", active: tab === "users", onClick: () => setTab("users") },
        {
          label: stats?.reports.pending ? `Reports (${stats.reports.pending})` : "Reports",
          active: tab === "reports",
          dotColor: stats?.reports.pending ? "#e74c3c" : undefined,
          onClick: () => setTab("reports"),
        },
      ]}
    >
      {/* Overview */}
      {tab === "overview" && (
        <div>
          {loadingStats ? (
            <div style={{ color: "var(--color-text-muted)" }}>Loading stats...</div>
          ) : stats ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
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
                    border: "1px solid var(--color-border)",
                    padding: "1rem",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "0.4rem" }}>
                    {card.label}
                  </div>
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: 700,
                      color: card.color || "var(--color-text)",
                      lineHeight: 1,
                      marginBottom: "0.2rem",
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
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
            {["all", "active", "archived", "banned"].map((s) => (
              <button
                key={s}
                onClick={() => setPkgStatusFilter(s)}
                className={pkgStatusFilter === s ? "w98-btn w98-btn--default" : "w98-btn"}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {loadingTab ? (
            <div style={{ color: "var(--color-text-muted)" }}>Loading...</div>
          ) : packages.length === 0 ? (
            <div className="empty-state">No packages found.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Installs</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>
                      <Link to={`/skill/${pkg.packageId}`} style={{ color: "var(--color-text)", textDecoration: "none", fontWeight: 600 }}>
                        {pkg.displayName}
                      </Link>
                      <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                        {pkg.packageId}
                      </div>
                    </td>
                    <td>{pkg.authorName}</td>
                    <td>{pkg.category}</td>
                    <td>{pkg.installCount}</td>
                    <td>
                      <span
                        style={{
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: statusColor(pkg.status) + "22",
                          color: statusColor(pkg.status),
                        }}
                      >
                        {pkg.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.3rem" }}>
                        {pkg.status !== "active" && (
                          <button className="w98-btn" style={{ fontSize: "0.75rem", color: "#2ecc71" }} onClick={() => handlePkgStatus(pkg.id, "active")}>
                            Activate
                          </button>
                        )}
                        {pkg.status !== "archived" && (
                          <button className="w98-btn" style={{ fontSize: "0.75rem" }} onClick={() => handlePkgStatus(pkg.id, "archived")}>
                            Archive
                          </button>
                        )}
                        {pkg.status !== "banned" && (
                          <button className="w98-btn" style={{ fontSize: "0.75rem", color: "#e74c3c" }} onClick={() => handlePkgStatus(pkg.id, "banned")}>
                            Ban
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <input
              className="w98-input"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setTab("users"); }}
              placeholder="Search by username..."
              style={{ width: "280px" }}
            />
          </div>

          {loadingTab ? (
            <div style={{ color: "var(--color-text-muted)" }}>Loading...</div>
          ) : users.length === 0 ? (
            <div className="empty-state">No users found.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>GitHub</th>
                  <th>Tier</th>
                  <th>Joined</th>
                  <th>Role</th>
                  <th>Change Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.displayName}</td>
                    <td>@{u.githubUsername}</td>
                    <td>{u.tier}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <span
                        style={{
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: u.role === "admin" ? "rgba(231,76,60,0.15)" : "var(--color-border)",
                          color: u.role === "admin" ? "#e74c3c" : "var(--color-text-muted)",
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <select
                        className="w98-input"
                        value={u.role}
                        onChange={(e) => handleUserRole(u.id, e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Reports */}
      {tab === "reports" && (
        <div>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
            {["pending", "resolved", "dismissed"].map((s) => (
              <button
                key={s}
                onClick={() => setReportStatusFilter(s)}
                className={reportStatusFilter === s ? "w98-btn w98-btn--default" : "w98-btn"}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {loadingTab ? (
            <div style={{ color: "var(--color-text-muted)" }}>Loading...</div>
          ) : reports.length === 0 ? (
            <div className="empty-state">No {reportStatusFilter} reports.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {reports.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid var(--color-border)",
                    padding: "1rem",
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
                        className="w98-input"
                        value={reportNote[r.id] || ""}
                        onChange={(e) => setReportNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Optional admin note..."
                        style={{ flex: 1 }}
                      />
                      <button
                        className="w98-btn"
                        style={{ fontSize: "0.78rem", color: "#2ecc71" }}
                        onClick={() => handleReport(r.id, "resolved")}
                      >
                        Resolve
                      </button>
                      <button
                        className="w98-btn"
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
    </Win98Window>
  );
}
