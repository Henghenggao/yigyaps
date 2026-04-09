import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchApi } from "../lib/api";

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
    const [message, setMessage] = useState(token ? "" : "Missing verification token.");
    const calledRef = useRef(false);

    useEffect(() => {
        if (!token || calledRef.current) return;
        calledRef.current = true;

        fetchApi("/v1/auth/verify-email", {
            method: "POST",
            body: JSON.stringify({ token }),
        })
            .then(() => {
                setStatus("success");
                setMessage("Your email has been verified! You can now sign in.");
            })
            .catch((err: unknown) => {
                setStatus("error");
                setMessage(err instanceof Error ? err.message : "Verification failed. The link may have expired.");
            });
    }, [token]);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "2.5rem",
                maxWidth: "420px",
                width: "100%",
                textAlign: "center",
            }}>
                {status === "loading" && (
                    <p style={{ color: "var(--color-text-sub)" }}>Verifying your email...</p>
                )}
                {status === "success" && (
                    <>
                        <h2 style={{ fontFamily: "var(--font-serif)", marginBottom: "1rem" }}>Email Verified</h2>
                        <p style={{ color: "var(--color-text-sub)", marginBottom: "1.5rem" }}>{message}</p>
                        <Link to="/marketplace" style={{
                            display: "inline-block",
                            padding: "0.75rem 1.5rem",
                            background: "var(--color-primary)",
                            color: "var(--color-surface)",
                            borderRadius: "var(--radius-md)",
                            textDecoration: "none",
                            fontWeight: 600,
                        }}>
                            Go to Marketplace
                        </Link>
                    </>
                )}
                {status === "error" && (
                    <>
                        <h2 style={{ fontFamily: "var(--font-serif)", marginBottom: "1rem", color: "#c33" }}>Verification Failed</h2>
                        <p style={{ color: "var(--color-text-sub)", marginBottom: "1.5rem" }}>{message}</p>
                        <Link to="/" style={{
                            display: "inline-block",
                            padding: "0.75rem 1.5rem",
                            background: "var(--color-primary)",
                            color: "var(--color-surface)",
                            borderRadius: "var(--radius-md)",
                            textDecoration: "none",
                            fontWeight: 600,
                        }}>
                            Back to Home
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
