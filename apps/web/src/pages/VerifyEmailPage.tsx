import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchApi } from "../lib/api";
import { Win98Dialog } from "../components/Win98Dialog";

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

    if (status === "loading") {
        return (
            <Win98Dialog title="Verify Email — Yig Yaps" icon="∴">
                <div style={{ fontFamily: 'var(--yig-font-w98)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                        <span className="spinner" /> Verifying your email...
                    </div>
                </div>
            </Win98Dialog>
        );
    }

    if (status === "success") {
        return (
            <Win98Dialog
                title="Verify Email — Yig Yaps"
                icon="∴"
                footer={
                    <Link to="/marketplace">
                        <button className="w98-btn w98-btn--default">Go to Marketplace</button>
                    </Link>
                }
            >
                <div style={{ fontFamily: 'var(--yig-font-w98)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: 0 }}>{message}</p>
                </div>
            </Win98Dialog>
        );
    }

    // error state
    return (
        <Win98Dialog
            title="Verify Email — Yig Yaps"
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
