import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAlbum, joinByCode } from "./actions";
import { card, input, primaryButton, ghostButton, iconBadge } from "@/lib/ui";
import { Plus, PaperPlane, PhotoStack, SignOut } from "@/components/icons";

type AlbumRow = {
  id: string;
  name: string;
  event_date: string | null;
  join_code: string;
};

const COVERS = [
  "linear-gradient(135deg, #FF6B6B, #FFD166)",
  "linear-gradient(135deg, #FFD166, #FF6B6B)",
  "linear-gradient(135deg, #FF6B6B, #F4D9A8)",
];

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();

  const { data: albums } = await supabase
    .from("albums")
    .select("id, name, event_date, join_code")
    .order("created_at", { ascending: false });

  const list = (albums ?? []) as AlbumRow[];

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "44px 28px 80px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 36, fontWeight: 700, margin: 0 }}>Your albums</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>Signed in as {user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" style={ghostButton}>
            <SignOut size={15} style={{ marginRight: 2 }} />
            Sign out
          </button>
        </form>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, margin: "44px 0" }}>
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
          <input name="code" placeholder="ABCDE" required maxLength={5} style={{ ...input, textTransform: "uppercase", letterSpacing: 4 }} />
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
    </main>
  );
}
