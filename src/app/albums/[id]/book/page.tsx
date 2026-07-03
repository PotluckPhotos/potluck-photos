import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import BookBuilder from "./BookBuilder";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: album } = await supabase
    .from("albums")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!album) notFound();

  const { data: photos } = await supabase
    .from("photos")
    .select("id, storage_key, caption, width, height")
    .eq("album_id", id)
    .order("created_at", { ascending: true });

  const photoList = (photos ?? []).map((p) => ({
    id: p.id,
    url: storage.getPublicUrl(p.storage_key),
    caption: p.caption ?? "",
    width: p.width,
    height: p.height,
  }));

  const { count: entryCount } = await supabase
    .from("guestbook_entries")
    .select("id", { count: "exact", head: true })
    .eq("album_id", id);

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1.5rem" }}>
      <Link href={`/albums/${album.id}`} style={{ fontSize: 14 }}>&larr; Back to album</Link>
      <h1>Make a book</h1>
      <BookBuilder albumId={album.id} defaultTitle={album.name} photos={photoList} entryCount={entryCount ?? 0} />
    </main>
  );
}
