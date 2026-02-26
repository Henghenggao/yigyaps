import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

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
    // Redirect to home or logic for triggering oauth login
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
