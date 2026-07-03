import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import BookBuilder from "./BookBuilder";
import ServiceMarquee from "./ServiceMarquee";
import { card } from "@/lib/ui";
import { ChevronLeft } from "@/components/icons";

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
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 28px 80px" }}>
      <Link
        href={`/albums/${album.id}`}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", marginBottom: 14 }}
      >
        <ChevronLeft size={14} />
        Back to album
      </Link>
      <h1 style={{ fontFamily: "var(--font-head)", fontSize: 34, fontWeight: 700, margin: "0 0 20px" }}>Create your book</h1>

      <BookBuilder albumId={album.id} defaultTitle={album.name} photos={photoList} entryCount={entryCount ?? 0} />

      <section style={{ ...card, marginTop: 32 }}>
        <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-head)", fontSize: 16 }}>Where to print it</h3>
        <p style={{ margin: "0 0 4px", fontSize: 13.5, color: "var(--text-secondary)" }}>
          Your downloaded PDF is formatted to work with these print-on-demand services — tap one to open it.
        </p>
        <ServiceMarquee />
      </section>
    </main>
  );
}
