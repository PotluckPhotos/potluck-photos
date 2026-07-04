import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ghostButton } from "@/lib/ui";

export default async function TopBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "12px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Potluck Photos" style={{ height: 160, width: "auto", display: "block" }} />
      </Link>

      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/settings" style={ghostButton}>Settings</Link>
          <form action="/auth/signout" method="post">
            <button type="submit" style={ghostButton}>Sign out</button>
          </form>
        </div>
      ) : (
        <Link href="/login" style={ghostButton}>Sign in</Link>
      )}
    </div>
  );
}
