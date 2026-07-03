import type { CSSProperties } from "react";

// Shared style tokens mirroring the design handoff (glass cards, gradient
// primary buttons, ghost buttons). Colors live as CSS variables in globals.css
// so the whole palette is swappable in one place.

export const card: CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.6)",
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 10px 30px rgba(120,60,40,0.10)",
  padding: 24,
};

export const iconBadge: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
  background: "var(--accent-tint)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

export const input: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid var(--accent-line)",
  background: "#fff",
  fontSize: 14,
  outline: "none",
  color: "var(--text-primary)",
};

export const primaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  background: "var(--accent-grad)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  boxShadow: "0 6px 16px var(--accent-shadow)",
};

export const ghostButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "9px 14px",
  borderRadius: 10,
  border: "1.5px solid var(--ghost-border)",
  background: "transparent",
  cursor: "pointer",
  fontSize: 13.5,
  color: "#6b5646",
  fontWeight: 500,
  textDecoration: "none",
};

export const heading: CSSProperties = { fontFamily: "var(--font-head)", margin: 0 };
export const pagePad: CSSProperties = { maxWidth: 1040, margin: "0 auto", padding: "0 28px 80px" };
