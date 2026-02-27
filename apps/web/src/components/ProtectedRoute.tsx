import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Header } from "./Header";

export function ProtectedRoute() {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--color-text)",
        }}
      >
        Loading authentication state...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container">
        <Header user={null} login={login} />
        <main className="main-content">
          <div
            style={{
              maxWidth: "420px",
              margin: "6rem auto",
              textAlign: "center",
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              padding: "3rem 2.5rem",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔐</div>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.4rem" }}>
              Sign in required
            </h2>
            <p
              style={{
                color: "var(--color-text-muted)",
                marginBottom: "2rem",
                lineHeight: 1.6,
              }}
            >
              You need to be signed in to access this page.
            </p>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={login}>
              Sign in with GitHub
            </button>
          </div>
        </main>
      </div>
    );
  }

  return <Outlet />;
}
