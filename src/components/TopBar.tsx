import Link from "next/link";
import { Logo } from "./icons";

export default function TopBar() {
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 28px 0" }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "var(--accent-grad)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 16px var(--accent-shadow)",
          }}
        >
          <Logo size={18} />
        </div>
        <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em" }}>Potluck</span>
      </Link>
    </div>
  );
}
