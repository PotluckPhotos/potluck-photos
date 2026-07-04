import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import AlbumClient from "./AlbumClient";
import Guestbook from "./Guestbook";
import DeleteAlbum from "./DeleteAlbum";
import { ghostButton } from "@/lib/ui";
import { ChevronLeft, Play, BookIcon } from "@/components/icons";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await requireUser();

  // Build the invite/QR base URL server-side so it renders identically on the
  // server and client (avoids a hydration mismatch from reading window).
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  // RLS returns nothing if the user isn't a member, so this doubles as the
  // access check.
  const { data: album } = await supabase
    .from("albums")
    .select("id, name, event_date, join_code, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!album) notFound();

  const { data: members } = await supabase
    .from("album_members")
    .select("role, user_id, profiles(display_name)")
    .eq("album_id", id);

  const { data: photos } = await supabase
    .from("photos")
    .select("id, storage_key, caption, uploaded_by, width, height, focus_x, focus_y")
    .eq("album_id", id)
    .order("created_at", { ascending: false });

  const photosWithUrls = (photos ?? []).map((p) => ({
    id: p.id,
    key: p.storage_key,
    caption: p.caption ?? "",
    uploadedBy: p.uploaded_by,
    url: storage.getPublicUrl(p.storage_key),
    focusX: p.focus_x ?? 50,
    focusY: p.focus_y ?? 50,
  }));

  const { data: guestbook } = await supabase
    .from("guestbook_entries")
    .select("id, body, author_id, profiles(display_name)")
    .eq("album_id", id)
    .order("created_at", { ascending: true });

  const entries = (guestbook ?? []).map((g) => {
    const profile = g.profiles as { display_name?: string } | { display_name?: string }[] | null;
    const name = Array.isArray(profile) ? profile[0]?.display_name : profile?.display_name;
    return { id: g.id, body: g.body, authorId: g.author_id, authorName: name ?? "Guest" };
  });

  const memberList = (members ?? []).map((m) => {
    const profile = m.profiles as { display_name?: string } | { display_name?: string }[] | null;
    const name = Array.isArray(profile) ? profile[0]?.display_name : profile?.display_name;
    return { userId: m.user_id, role: m.role as string, name: name ?? "Member" };
  });

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 28px 80px" }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", marginBottom: 14 }}>
        <ChevronLeft size={14} />
        All albums
      </Link>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 34, fontWeight: 700, margin: 0 }}>{album.name}</h1>
          {album.event_date && (
            <p style={{ color: "var(--text-secondary)", margin: "6px 0 0" }}>{album.event_date}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href={`/albums/${album.id}/recap`} style={ghostButton}>
            <Play size={14} />
            Play recap
          </Link>
          <Link href={`/albums/${album.id}/book`} style={ghostButton}>
            <BookIcon size={14} />
            Make a book
          </Link>
        </div>
      </div>

      <AlbumClient
        albumId={album.id}
        joinCode={album.join_code}
        origin={origin}
        isOwner={album.owner_id === user.id}
        currentUserId={user.id}
        members={memberList}
        photos={photosWithUrls}
      />

      <Guestbook
        albumId={album.id}
        currentUserId={user.id}
        isOwner={album.owner_id === user.id}
        entries={entries}
      />

      {album.owner_id === user.id && <DeleteAlbum albumId={album.id} albumName={album.name} />}
    </main>
  );
}
