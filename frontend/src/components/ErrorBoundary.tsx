"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={wrapStyle}>
          <div style={cardStyle}>
            <p style={eyebrowStyle}>BOUNDARY CAUGHT</p>
            <h2 style={titleStyle}>Something went wrong.</h2>
            <p style={messageStyle}>
              {this.state.error?.message ?? "An unexpected error occurred in this section."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={primaryBtnStyle}
            >
              Try again →
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const wrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-xl)",
  background: "var(--bg-base)",
  fontFamily: "var(--font-body)",
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid rgba(244, 63, 94, 0.2)",
  borderRadius: "var(--radius-xl)",
  padding: "var(--space-xl)",
  maxWidth: 440,
};

const eyebrowStyle: React.CSSProperties = {
  color: "var(--brand-tertiary)",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.18em",
  marginBottom: "var(--space-sm)",
  fontFamily: "var(--font-mono)",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "1.5rem",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  marginBottom: "var(--space-sm)",
  color: "var(--text-primary)",
};

const messageStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontSize: "0.9rem",
  lineHeight: 1.5,
  marginBottom: "var(--space-md)",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--brand-primary)",
  color: "var(--text-inverse)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "8px 14px",
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  fontSize: "0.75rem",
  letterSpacing: "0.05em",
  cursor: "pointer",
};
