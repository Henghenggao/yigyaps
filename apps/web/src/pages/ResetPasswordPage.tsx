import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchApi } from "../lib/api";
import { Win98Dialog } from "../components/Win98Dialog";

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<"form" | "loading" | "success" | "error">(token ? "form" : "error");
    const [message, setMessage] = useState(token ? "" : "Missing reset token.");

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
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

    if (status === "loading") {
        return (
            <Win98Dialog title="Reset Password — Yig Yaps" icon="∴">
                <div style={{ fontFamily: 'var(--yig-font-w98)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                    <span className="spinner" /> Resetting password...
                </div>
            </Win98Dialog>
        );
    }

    if (status === "success") {
        return (
            <Win98Dialog
                title="Reset Password — Yig Yaps"
                icon="∴"
                footer={
                    <Link to="/">
                        <button className="w98-btn w98-btn--default">Go to Home</button>
                    </Link>
                }
            >
                <div style={{ fontFamily: 'var(--yig-font-w98)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {message && <p style={{ color: 'var(--yig-phosphor)', margin: 0 }}>{message}</p>}
                </div>
            </Win98Dialog>
        );
    }

    if (status === "error" && !token) {
        return (
            <Win98Dialog
                title="Reset Password — Yig Yaps"
                icon="∴"
                footer={
                    <Link to="/">
                        <button className="w98-btn w98-btn--default">Back to Home</button>
                    </Link>
                }
            >
                <div style={{ fontFamily: 'var(--yig-font-w98)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {message && <p style={{ color: 'var(--yig-cinnabar)', margin: 0 }}>{message}</p>}
                </div>
            </Win98Dialog>
        );
    }

    // form state (or error from validation/API with token present)
    return (
        <Win98Dialog
            title="Reset Password — Yig Yaps"
            icon="∴"
            footer={
                <button
                    className="w98-btn w98-btn--default"
                    onClick={() => handleSubmit()}
                    disabled={false}
                >
                    Reset Password
                </button>
            }
        >
            <form onSubmit={handleSubmit} style={{ fontFamily: 'var(--yig-font-w98)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label>New Password</label>
                    <input
                        className="w98-input"
                        required
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        minLength={8}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label>Confirm Password</label>
                    <input
                        className="w98-input"
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        minLength={8}
                    />
                </div>
                {message && <p style={{ color: 'var(--yig-cinnabar)', margin: 0 }}>{message}</p>}
            </form>
        </Win98Dialog>
    );
}
