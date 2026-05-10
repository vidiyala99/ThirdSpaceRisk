"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <p style={eyebrowStyle}>UNEXPECTED ERROR</p>
        <h1 style={titleStyle}>Something went wrong.</h1>
        <p style={messageStyle}>
          {error.message || "An unexpected error interrupted the page."}
        </p>
        {error.digest && (
          <p style={digestStyle}>
            ref <span style={{ color: "var(--text-secondary)" }}>{error.digest}</span>
          </p>
        )}
        <div style={actionsStyle}>
          <button onClick={reset} style={primaryBtnStyle}>
            Try again →
          </button>
          <a href="/dashboard" style={secondaryBtnStyle}>
            Back to dashboard
          </a>
        </div>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-xl)",
  fontFamily: "var(--font-body)",
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid rgba(244, 63, 94, 0.2)",
  borderRadius: "var(--radius-xl)",
  padding: "var(--space-2xl)",
  maxWidth: 480,
  width: "100%",
  boxShadow: "var(--shadow-md)",
};

const eyebrowStyle: React.CSSProperties = {
  color: "var(--brand-tertiary)",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.18em",
  marginBottom: "var(--space-md)",
  fontFamily: "var(--font-mono)",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "2rem",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  marginBottom: "var(--space-md)",
  lineHeight: 1.15,
};

const messageStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontSize: "0.95rem",
  lineHeight: 1.55,
  marginBottom: "var(--space-md)",
};

const digestStyle: React.CSSProperties = {
  color: "var(--text-tertiary)",
  fontFamily: "var(--font-mono)",
  fontSize: "0.7rem",
  letterSpacing: "0.08em",
  marginBottom: "var(--space-lg)",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-md)",
  flexWrap: "wrap",
  marginTop: "var(--space-lg)",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--brand-primary)",
  color: "var(--text-inverse)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "10px 18px",
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  fontSize: "0.8rem",
  letterSpacing: "0.05em",
  cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--text-secondary)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "10px 18px",
  fontFamily: "var(--font-mono)",
  fontWeight: 600,
  fontSize: "0.8rem",
  letterSpacing: "0.05em",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};
