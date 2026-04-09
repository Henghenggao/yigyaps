import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchApi } from "../lib/api";

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<"form" | "loading" | "success" | "error">(token ? "form" : "error");
    const [message, setMessage] = useState(token ? "" : "Missing reset token.");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            setMessage("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }
        setStatus("loading");
        setMessage("");
        try {
            await fetchApi("/v1/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ token, newPassword: password }),
            });
            setStatus("success");
            setMessage("Your password has been reset. You can now sign in with your new password.");
        } catch (err: unknown) {
            setStatus("error");
            setMessage(err instanceof Error ? err.message : "Reset failed. The link may have expired.");
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "2.5rem",
                maxWidth: "420px",
                width: "100%",
            }}>
                <h2 style={{ fontFamily: "var(--font-serif)", textAlign: "center", marginBottom: "1.5rem" }}>
                    {status === "success" ? "Password Reset" : "Set New Password"}
                </h2>

                {message && (
                    <div style={{
                        background: status === "success" ? "#efe" : "#fee",
                        color: status === "success" ? "#3c3" : "#c33",
                        padding: "0.75rem",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                        marginBottom: "1rem",
                        border: `1px solid ${status === "success" ? "#cfc" : "#fcc"}`,
                    }}>
                        {message}
                    </div>
                )}

                {status === "form" && (
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.85rem", fontWeight: 500 }}>New Password</label>
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="At least 8 characters"
                                minLength={8}
                                style={{
                                    padding: "0.6rem 0.75rem",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-bg)",
                                    color: "var(--color-text-main)",
                                    fontFamily: "var(--font-sans)",
                                }}
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.85rem", fontWeight: 500 }}>Confirm Password</label>
                            <input
                                required
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter password"
                                minLength={8}
                                style={{
                                    padding: "0.6rem 0.75rem",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-bg)",
                                    color: "var(--color-text-main)",
                                    fontFamily: "var(--font-sans)",
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            style={{
                                background: "var(--color-primary)",
                                color: "var(--color-surface)",
                                border: "none",
                                padding: "0.75rem",
                                borderRadius: "var(--radius-md)",
                                fontWeight: 600,
                                cursor: "pointer",
                                marginTop: "0.5rem",
                            }}
                        >
                            Reset Password
                        </button>
                    </form>
                )}

                {status === "loading" && (
                    <p style={{ textAlign: "center", color: "var(--color-text-sub)" }}>Resetting password...</p>
                )}

                {(status === "success" || status === "error") && (
                    <div style={{ textAlign: "center", marginTop: "1rem" }}>
                        <Link to="/" style={{
                            display: "inline-block",
                            padding: "0.75rem 1.5rem",
                            background: "var(--color-primary)",
                            color: "var(--color-surface)",
                            borderRadius: "var(--radius-md)",
                            textDecoration: "none",
                            fontWeight: 600,
                        }}>
                            {status === "success" ? "Go to Home" : "Back to Home"}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
