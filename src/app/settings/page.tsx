import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { updateDisplayName } from "./actions";
import { card, input, primaryButton, ghostButton } from "@/lib/ui";
import { ChevronLeft } from "@/components/icons";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const { user, supabase } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 28px 80px" }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", marginBottom: 14 }}>
        <ChevronLeft size={14} />
        Back
      </Link>
      <h1 style={{ fontFamily: "var(--font-head)", fontSize: 34, fontWeight: 700, margin: "0 0 24px" }}>Settings</h1>

      <section style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-head)", fontSize: 17 }}>Your name</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--text-secondary)" }}>
          This is how you appear to others in albums and the guest book.
        </p>
        <form action={updateDisplayName} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="display_name" defaultValue={profile?.display_name ?? ""} required style={{ ...input, flex: 1, minWidth: 200 }} />
          <button type="submit" style={primaryButton}>Save</button>
        </form>
        {saved && <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-accent)" }}>Saved.</p>}
        {error === "empty" && <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-danger)" }}>Name can&apos;t be empty.</p>}
      </section>

      <section style={card}>
        <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-head)", fontSize: 17 }}>Account</h3>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary)" }}>Signed in as {user.email}</p>
        <form action="/auth/signout" method="post">
          <button type="submit" style={ghostButton}>Sign out</button>
        </form>
      </section>
    </main>
  );
}
