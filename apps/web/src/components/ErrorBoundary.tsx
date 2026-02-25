import React, { Component } from "react";
import type { ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text)" }}>
                    <h2 style={{ marginBottom: "20px" }}>Something went wrong.</h2>
                    <p style={{ color: "var(--color-primary)", marginBottom: "30px" }}>
                        {this.state.error?.message || "An unexpected error occurred."}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "var(--color-accent)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
