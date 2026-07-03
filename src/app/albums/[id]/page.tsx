import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import AlbumClient from "./AlbumClient";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await requireUser();

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
    .select("id, storage_key, caption, uploaded_by, width, height")
    .eq("album_id", id)
    .order("created_at", { ascending: false });

  const photosWithUrls = (photos ?? []).map((p) => ({
    id: p.id,
    key: p.storage_key,
    caption: p.caption ?? "",
    uploadedBy: p.uploaded_by,
    url: storage.getPublicUrl(p.storage_key),
  }));

  const memberList = (members ?? []).map((m) => {
    const profile = m.profiles as { display_name?: string } | { display_name?: string }[] | null;
    const name = Array.isArray(profile) ? profile[0]?.display_name : profile?.display_name;
    return { userId: m.user_id, role: m.role as string, name: name ?? "Member" };
  });

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1.5rem" }}>
      <Link href="/dashboard" style={{ fontSize: 14 }}>&larr; All albums</Link>
      <h1 style={{ marginBottom: 4 }}>{album.name}</h1>
      {album.event_date && (
        <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>{album.event_date}</p>
      )}

      <AlbumClient
        albumId={album.id}
        joinCode={album.join_code}
        isOwner={album.owner_id === user.id}
        currentUserId={user.id}
        members={memberList}
        photos={photosWithUrls}
      />
    </main>
  );
}
