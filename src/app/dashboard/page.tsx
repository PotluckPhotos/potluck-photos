import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAlbum, joinByCode } from "./actions";

type AlbumRow = {
  id: string;
  name: string;
  event_date: string | null;
  join_code: string;
};

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();

  const { data: albums } = await supabase
    .from("albums")
    .select("id, name, event_date, join_code")
    .order("created_at", { ascending: false });

  const list = (albums ?? []) as AlbumRow[];

  return (
    <main style={{ maxWidth: 720, margin: "3rem auto", padding: "0 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Your albums</h1>
        <form action="/auth/signout" method="post">
          <button type="submit">Sign out</button>
        </form>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Signed in as {user.email}</p>

      <section style={{ display: "flex", gap: 24, margin: "2rem 0", flexWrap: "wrap" }}>
        <form action={createAlbum} style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Create an album</h3>
          <input name="name" placeholder="Italy 2026" required style={inputStyle} />
          <button type="submit" style={{ marginTop: 8 }}>Create</button>
        </form>

        <form action={joinByCode} style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Join with a code</h3>
          <input
            name="code"
            placeholder="ABCDE"
            required
            maxLength={5}
            style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: 4 }}
          />
          <button type="submit" style={{ marginTop: 8 }}>Join</button>
        </form>
      </section>

      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>
          No albums yet. Create one above, or join with a code someone shared.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
          {list.map((album) => (
            <li key={album.id}>
              <Link
                href={`/albums/${album.id}`}
                style={{ ...cardStyle, display: "block", textDecoration: "none", color: "inherit" }}
              >
                <strong>{album.name}</strong>
                {album.event_date && (
                  <span style={{ color: "var(--text-secondary)", marginLeft: 8 }}>
                    {album.event_date}
                  </span>
                )}
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                  Code: {album.join_code}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 16,
  borderRadius: 12,
  border: "1px solid var(--border, #e5e5e5)",
  minWidth: 240,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border, #ccc)",
};
