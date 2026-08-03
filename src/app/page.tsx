import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { primaryButton, ghostButton } from "@/lib/ui";
import AboutPotluck from "@/components/AboutPotluck";

// Public home page. It never redirects — signed-out and signed-in visitors both
// see it; signed-in users just get a link through to their albums.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "8px 28px 80px" }}>
      <section style={{ textAlign: "center", padding: "24px 0 8px" }}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.15 }}>
          Everyone&apos;s photos, one shared album.
        </h1>
        <p style={{ fontSize: 18, color: "var(--text-secondary)", maxWidth: 620, margin: "0 auto 24px", lineHeight: 1.6 }}>
          Invite your people to a trip or event album. Everyone adds their photos and writes a few words —
          then turn it all into a printed book or a recap slideshow.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {user ? (
            <Link href="/dashboard" style={{ ...primaryButton, fontSize: 15, padding: "12px 22px" }}>Go to your albums</Link>
          ) : (
            <>
              <Link href="/login?mode=signup" style={{ ...primaryButton, fontSize: 15, padding: "12px 22px" }}>Get started — it&apos;s free</Link>
              <Link href="/login" style={{ ...ghostButton, fontSize: 15, padding: "12px 22px" }}>Sign in</Link>
            </>
          )}
        </div>
      </section>

      <AboutPotluck showCta={!user} />
    </main>
  );
}
