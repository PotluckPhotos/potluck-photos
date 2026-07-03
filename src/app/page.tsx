import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ maxWidth: 640, margin: "6rem auto", padding: "0 1.5rem", textAlign: "center" }}>
      <h1 style={{ fontSize: 40, marginBottom: 16 }}>Potluck</h1>
      <p style={{ fontSize: 18, color: "var(--text-secondary)", marginBottom: 32, lineHeight: 1.6 }}>
        A shared photo album everyone adds to. Invite people, collect the photos from a trip or
        event in one place, then turn them into a printed book.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {user ? (
          <Link href="/dashboard" style={buttonStyle}>
            Go to your albums
          </Link>
        ) : (
          <>
            <Link href="/login" style={buttonStyle}>
              Get started
            </Link>
            <Link href="/join" style={{ ...buttonStyle, opacity: 0.8 }}>
              Have a code? Join
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 24px",
  borderRadius: 8,
  border: "1px solid var(--border-strong, #ccc)",
  textDecoration: "none",
  color: "inherit",
};
