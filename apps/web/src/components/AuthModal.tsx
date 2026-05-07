import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Win98Dialog } from "./Win98Dialog";

export function AuthModal() {
    const { isAuthModalOpen, closeAuthModal, login, loginWithGoogle, registerWithEmail, loginWithEmail, forgotPassword } = useAuth();
    const [mode, setMode] = useState<"options" | "email-login" | "email-register" | "forgot-password">("options");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isAuthModalOpen) return null;

    const handleEmailAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            if (mode === "forgot-password") {
                await forgotPassword(email);
                setError("If an account exists with that email, a reset link has been sent.");
            } else if (mode === "email-login") {
                await loginWithEmail(email, password);
                closeAuthModal();
            } else {
                await registerWithEmail(email, password, displayName);
                setError("Registration successful! Please check your email to verify your account.");
                closeAuthModal();
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "An error occurred during authentication.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const resetMode = () => {
        setMode("options");
        setError("");
        setEmail("");
        setPassword("");
        setDisplayName("");
    };

    const title = mode === "options"
        ? "Sign In — Yig Yaps"
        : mode === "email-login"
            ? "Sign In — Yig Yaps"
            : mode === "forgot-password"
                ? "Sign In — Yig Yaps"
                : "Sign In — Yig Yaps";

    return (
        <Win98Dialog title={title} icon="∴" onClose={closeAuthModal}>
            <h2>{mode === "options" ? "Sign In to YigYaps" : mode === "email-login" ? "Log in with Email" : mode === "forgot-password" ? "Reset Password" : "Sign up with Email"}</h2>

            {error && <div className={`auth-modal-error ${error.includes("successful") ? "auth-modal-success" : ""}`}>{error}</div>}

            {mode === "options" && (
                <div className="auth-options">
                    <button className="w98-btn" onClick={login}>
                        Sign in with GitHub
                    </button>
                    <button className="w98-btn" onClick={loginWithGoogle}>
                        Sign in with Google
                    </button>
                    <div className="auth-divider"><span>or</span></div>
                    <button className="w98-btn" onClick={() => setMode("email-login")}>
                        Continue with Email
                    </button>
                </div>
            )}

            {mode !== "options" && (
                <form onSubmit={handleEmailAction} className="auth-form">
                    {mode === "email-register" && (
                        <div className="form-group">
                            <label>Display Name</label>
                            <input required value={displayName} onChange={e => setDisplayName(e.target.value)} type="text" placeholder="Your name" className="w98-input" />
                        </div>
                    )}
                    <div className="form-group">
                        <label>Email Address</label>
                        <input required value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w98-input" />
                    </div>
                    {mode !== "forgot-password" && (
                        <div className="form-group">
                            <label>Password</label>
                            <input required value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" className="w98-input" />
                        </div>
                    )}

                    <button type="submit" className="w98-btn w98-btn--default" disabled={loading}>
                        {loading ? "Please wait..." : mode === "email-login" ? "Sign In" : mode === "forgot-password" ? "Send Reset Link" : "Sign Up"}
                    </button>

                    <div className="auth-form-footer">
                        <button type="button" className="w98-btn" onClick={resetMode}>Back</button>
                        {mode === "email-login" && (
                            <button type="button" className="w98-btn" onClick={() => { setError(""); setMode("forgot-password"); }}>Forgot password?</button>
                        )}
                        {mode === "email-login" && (
                            <button type="button" className="w98-btn" onClick={() => { resetMode(); setMode("email-register"); }}>Need an account? Sign up</button>
                        )}
                        {mode === "email-register" && (
                            <button type="button" className="w98-btn" onClick={() => { resetMode(); setMode("email-login"); }}>Have an account? Log in</button>
                        )}
                        {mode === "forgot-password" && (
                            <button type="button" className="w98-btn" onClick={() => { resetMode(); setMode("email-login"); }}>Back to login</button>
                        )}
                    </div>
                </form>
            )}
        </Win98Dialog>
    );
}
