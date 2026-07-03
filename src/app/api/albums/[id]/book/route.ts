import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { storage } from "@/lib/storage";
import { generateBook, BOOK_SIZES } from "@/lib/book";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: albumId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const { photoIds, title, size } = await request.json();
  const bookSize = BOOK_SIZES[size] ?? BOOK_SIZES["8x8"];
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return new Response("Pick at least one photo", { status: 400 });
  }

  // RLS scopes this to photos in albums the user belongs to, so a non-member
  // (or photos from another album) simply return nothing.
  const { data: rows } = await supabase
    .from("photos")
    .select("id, storage_key, caption")
    .eq("album_id", albumId)
    .in("id", photoIds)
    .order("created_at", { ascending: true });

  if (!rows || rows.length === 0) {
    return new Response("No photos found", { status: 404 });
  }

  // Preserve the order the user selected.
  const order = new Map(photoIds.map((pid: string, i: number) => [pid, i]));
  const ordered = [...rows].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const photos = ordered.map((r) => ({
    url: storage.getPublicUrl(r.storage_key),
    caption: r.caption ?? "",
  }));

  const pdfBytes = await generateBook(photos, title || "Our album", bookSize);

  return new Response(pdfBytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${(title || "album").replace(/[^a-z0-9]/gi, "-")}.pdf"`,
    },
  });
}
