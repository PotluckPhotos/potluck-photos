import Link from "next/link";

export default function TopBar() {
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 28px 0" }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Potluck Photos" style={{ height: 110, width: "auto", display: "block" }} />
      </Link>
    </div>
  );
}
