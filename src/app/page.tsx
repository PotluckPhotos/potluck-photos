import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAlbum, joinByCode } from "./dashboard/actions";
import { card, input, primaryButton, iconBadge } from "@/lib/ui";
import { Plus, PaperPlane, PhotoStack, Users, Camera, GuestBookIcon, BookIcon, Play } from "@/components/icons";

type AlbumRow = { id: string; name: string; event_date: string | null; join_code: string };

const COVERS = [
  "linear-gradient(135deg, #FF6B6B, #FFD166)",
  "linear-gradient(135deg, #FFD166, #FF6B6B)",
  "linear-gradient(135deg, #FF6B6B, #F4D9A8)",
];

export default async function Home({ searchParams }: { searchParams: Promise<{ joinError?: string }> }) {
  const { joinError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return <Dashboard joinError={joinError} />;
  return <Landing />;
}

async function Dashboard({ joinError }: { joinError?: string }) {
  const supabase = await createClient();
  const { data: albums } = await supabase
    .from("albums")
    .select("id, name, event_date, join_code")
    .order("created_at", { ascending: false });
  const list = (albums ?? []) as AlbumRow[];

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 28px 80px" }}>
      <h1 style={{ fontFamily: "var(--font-head)", fontSize: 36, fontWeight: 700, margin: 0 }}>Your albums</h1>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, margin: "24px 0 44px" }}>
        <form action={createAlbum} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={iconBadge}><Plus size={16} /></div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 17 }}>Create an album</h3>
          </div>
          <input name="name" placeholder="Italy 2026" required style={input} />
          <button type="submit" style={{ ...primaryButton, width: "100%", marginTop: 10 }}>Create album</button>
        </form>

        <form action={joinByCode} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={iconBadge}><PaperPlane size={16} /></div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 17 }}>Join with a code</h3>
          </div>
          <input name="code" placeholder="ABCDE" required style={{ ...input, textTransform: "uppercase", letterSpacing: 4 }} />
          {joinError && (
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-danger)" }}>
              {joinError === "short" ? "Enter the 5-character code, or paste the invite link." : "That code didn’t match an album."}
            </p>
          )}
          <button type="submit" style={{ ...primaryButton, width: "100%", marginTop: 10 }}>Join album</button>
        </form>
      </section>

      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No albums yet. Create one above, or join with a code someone shared.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {list.map((album, i) => (
            <Link key={album.id} href={`/albums/${album.id}`} style={{ ...card, display: "block", textDecoration: "none", color: "inherit" }}>
              <div style={{ height: 86, borderRadius: 14, marginBottom: 14, background: COVERS[i % COVERS.length], display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PhotoStack size={26} />
              </div>
              <strong style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 700 }}>{album.name}</strong>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{album.event_date ?? ""}</span>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, padding: "3px 8px", borderRadius: 999, background: "var(--accent-tint)", color: "var(--accent)" }}>
                  {album.join_code}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <AboutPotluck />
    </main>
  );
}

function Landing() {
  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "8px 28px 80px" }}>
      {/* Hero */}
      <section style={{ textAlign: "center", padding: "24px 0 8px" }}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.15 }}>
          Everyone&apos;s photos, one shared album.
        </h1>
        <p style={{ fontSize: 18, color: "var(--text-secondary)", maxWidth: 620, margin: "0 auto 24px", lineHeight: 1.6 }}>
          Invite your people to a trip or event album. Everyone adds their photos and writes a few words —
          then turn it all into a printed book or a recap slideshow.
        </p>
        <Link href="/login?mode=signup" style={{ ...primaryButton, fontSize: 15, padding: "12px 22px" }}>Get started — it&apos;s free</Link>
      </section>

      <AboutPotluck showCta />
    </main>
  );
}

function AboutPotluck({ showCta = false }: { showCta?: boolean }) {
  const oneRow = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 } as const;

  return (
    <>
      {/* How it works */}
      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 26, textAlign: "center", margin: "0 0 24px" }}>How it works</h2>
        <div style={oneRow}>
          {[
            { icon: <Plus size={16} />, title: "Create an album", body: "Name your trip or event and you're set." },
            { icon: <Users size={15} />, title: "Invite everyone", body: "Share a 5-character code, a link, or a QR." },
            { icon: <Camera size={15} color="var(--accent)" />, title: "Everyone adds", body: "Photos, captions, and guest-book notes." },
            { icon: <BookIcon size={15} />, title: "Keep the memories", body: "Make a photo book or play a recap." },
          ].map((step, i) => (
            <div key={i} style={card}>
              <div style={{ ...iconBadge, marginBottom: 12 }}>{step.icon}</div>
              <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-head)", fontSize: 17 }}>{step.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 26, textAlign: "center", margin: "0 0 24px" }}>What you get</h2>
        <div style={oneRow}>
          {[
            { icon: <Camera size={15} color="var(--accent)" />, title: "Shared uploads", body: "Everyone's photos land in one place." },
            { icon: <GuestBookIcon size={15} />, title: "Guest book", body: "Notes about the trip, woven through the book and recap." },
            { icon: <Play size={14} />, title: "Recap slideshow", body: "An auto-playing memories reel, downloadable as a video." },
            { icon: <BookIcon size={15} />, title: "Photo book", body: "Pick a template and cover, export a print-ready PDF." },
          ].map((f, i) => (
            <div key={i} style={card}>
              <div style={{ ...iconBadge, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-head)", fontSize: 17 }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 26, textAlign: "center", margin: "0 0 24px" }}>Pricing</h2>
        <div style={{ ...card, maxWidth: 620, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 34, fontWeight: 700 }}>Free</div>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, margin: "8px 0 0" }}>
            Creating albums, collecting photos, the guest book, and recaps all cost nothing. When you want a
            physical book, you download a print-ready PDF and order it from a print service like Blurb, Mimeo,
            or Mixam — you only ever pay the printer for the book itself.
          </p>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "14px 0 0" }}>
            Open source (AGPL-3.0) — you can also self-host it on your own storage for free.
          </p>
          {showCta && (
            <Link href="/login?mode=signup" style={{ ...primaryButton, marginTop: 20 }}>Start your first album</Link>
          )}
        </div>
      </section>
    </>
  );
}
