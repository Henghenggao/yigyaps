import { Link } from "react-router-dom";

export function NotFoundPage() {
    return (
        <div className="container" style={{ textAlign: "center", padding: "100px 20px" }}>
            <h1 className="title" style={{ fontSize: "4rem" }}>404</h1>
            <h2 className="subtitle">Page Not Found</h2>
            <p style={{ marginBottom: "30px", color: "var(--color-text-muted)" }}>
                The page you are looking for does not exist or has been moved.
            </p>
            <Link to="/" className="btn btn-primary">
                Return Home
            </Link>
        </div>
    );
}
