import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

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

    return (
        <div className="auth-modal-overlay" onClick={closeAuthModal}>
            <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="auth-modal-close" onClick={closeAuthModal}>×</button>

                <h2>{mode === "options" ? "Sign In to YigYaps" : mode === "email-login" ? "Log in with Email" : mode === "forgot-password" ? "Reset Password" : "Sign up with Email"}</h2>

                {error && <div className={`auth-modal-error ${error.includes("successful") ? "auth-modal-success" : ""}`}>{error}</div>}

                {mode === "options" && (
                    <div className="auth-options">
                        <button className="auth-btn-provider github" onClick={login}>
                            Sign in with GitHub
                        </button>
                        <button className="auth-btn-provider google" onClick={loginWithGoogle}>
                            Sign in with Google
                        </button>
                        <div className="auth-divider"><span>or</span></div>
                        <button className="auth-btn-provider email" onClick={() => setMode("email-login")}>
                            Continue with Email
                        </button>
                    </div>
                )}

                {mode !== "options" && (
                    <form onSubmit={handleEmailAction} className="auth-form">
                        {mode === "email-register" && (
                            <div className="form-group">
                                <label>Display Name</label>
                                <input required value={displayName} onChange={e => setDisplayName(e.target.value)} type="text" placeholder="Your name" />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Email Address</label>
                            <input required value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
                        </div>
                        {mode !== "forgot-password" && (
                            <div className="form-group">
                                <label>Password</label>
                                <input required value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" />
                            </div>
                        )}

                        <button type="submit" className="auth-btn-submit" disabled={loading}>
                            {loading ? "Please wait..." : mode === "email-login" ? "Sign In" : mode === "forgot-password" ? "Send Reset Link" : "Sign Up"}
                        </button>

                        <div className="auth-form-footer">
                            <button type="button" className="auth-btn-link" onClick={resetMode}>Back</button>
                            {mode === "email-login" && (
                                <button type="button" className="auth-btn-link" onClick={() => { setError(""); setMode("forgot-password"); }}>Forgot password?</button>
                            )}
                            {mode === "email-login" && (
                                <button type="button" className="auth-btn-link" onClick={() => { resetMode(); setMode("email-register"); }}>Need an account? Sign up</button>
                            )}
                            {mode === "email-register" && (
                                <button type="button" className="auth-btn-link" onClick={() => { resetMode(); setMode("email-login"); }}>Have an account? Log in</button>
                            )}
                            {mode === "forgot-password" && (
                                <button type="button" className="auth-btn-link" onClick={() => { resetMode(); setMode("email-login"); }}>Back to login</button>
                            )}
                        </div>
                    </form>
                )}
            </div>

            <style>{`
        .auth-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .auth-modal-content {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 2.5rem;
          width: 100%;
          max-width: 420px;
          position: relative;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        .auth-modal-close {
          position: absolute;
          top: 1rem;
          right: 1.25rem;
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--color-text-sub);
        }
        .auth-modal-content h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          text-align: center;
          font-family: var(--font-serif);
          font-size: 1.6rem;
        }
        .auth-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .auth-btn-provider {
          width: 100%;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          font-weight: 500;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .auth-btn-provider.github {
          background: #24292e;
          color: white;
          border: 1px solid #24292e;
        }
        .auth-btn-provider.github:hover {
          background: #1b1f23;
        }
        .auth-btn-provider.google {
          background: white;
          color: #3c4043;
          border: 1px solid #dadce0;
        }
        .auth-btn-provider.google:hover {
          background: #f8f9fa;
        }
        .auth-btn-provider.email {
          background: transparent;
          color: var(--color-text-main);
          border: 1px solid var(--color-border);
        }
        .auth-btn-provider.email:hover {
          background: var(--color-bg);
          border-color: var(--color-primary);
        }
        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1rem 0;
          color: var(--color-text-sub);
          font-size: 0.85rem;
        }
        .auth-divider::before, .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--color-border);
        }
        .auth-divider span {
          padding: 0 10px;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--color-text-main);
        }
        .form-group input {
          padding: 0.6rem 0.75rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text-main);
          font-family: var(--font-sans);
        }
        .auth-btn-submit {
          background: var(--color-primary);
          color: var(--color-surface);
          border: none;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        .auth-btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .auth-form-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 1rem;
        }
        .auth-btn-link {
          background: none;
          border: none;
          color: var(--color-text-sub);
          cursor: pointer;
          font-size: 0.85rem;
        }
        .auth-btn-link:hover {
          color: var(--color-primary);
        }
        .auth-modal-error {
          background: #fee;
          color: #c33;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          margin-bottom: 1rem;
          border: 1px solid #fcc;
        }
        .auth-modal-success {
          background: #efe;
          color: #3c3;
          border-color: #cfc;
        }
      `}</style>
        </div>
    );
}
