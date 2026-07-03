import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { storage } from "@/lib/storage";
import { generateBook, BOOK_SIZES, TEMPLATES, type Template } from "@/lib/book";

// pdf-lib needs the Node runtime (not edge), and generating a book with many
// photos can take a while — give it more than Vercel's 10s default.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: albumId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const { photoIds, coverPhotoId, title, size, template } = await request.json();
  const bookSize = BOOK_SIZES[size] ?? BOOK_SIZES["8x8"];
  const bookTemplate: Template = template in TEMPLATES ? template : "classic";
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return new Response("Pick at least one photo", { status: 400 });
  }
  if (!coverPhotoId) return new Response("Pick a cover photo", { status: 400 });

  const { data: rows } = await supabase
    .from("photos")
    .select("id, storage_key, caption")
    .eq("album_id", albumId)
    .in("id", photoIds)
    .order("created_at", { ascending: true });
  if (!rows || rows.length === 0) return new Response("No photos found", { status: 404 });

  const order = new Map(photoIds.map((pid: string, i: number) => [pid, i]));
  const ordered = [...rows].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const coverRow = ordered.find((r) => r.id === coverPhotoId) ?? ordered[0];
  const cover = { url: storage.getPublicUrl(coverRow.storage_key), caption: coverRow.caption ?? "" };
  // Cover photo isn't repeated in the interior pages.
  const interior = ordered
    .filter((r) => r.id !== coverRow.id)
    .map((r) => ({ url: storage.getPublicUrl(r.storage_key), caption: r.caption ?? "" }));

  const { data: entryRows } = await supabase
    .from("guestbook_entries")
    .select("body, profiles(display_name)")
    .eq("album_id", albumId)
    .order("created_at", { ascending: true });

  const entries = (entryRows ?? []).map((g) => {
    const profile = g.profiles as { display_name?: string } | { display_name?: string }[] | null;
    const name = Array.isArray(profile) ? profile[0]?.display_name : profile?.display_name;
    return { body: g.body, author: name ?? "Guest" };
  });

  const pdfBytes = await generateBook({
    title: title || "Our album",
    template: bookTemplate,
    size: bookSize,
    cover,
    photos: interior,
    entries,
  });

  return new Response(pdfBytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${(title || "album").replace(/[^a-z0-9]/gi, "-")}.pdf"`,
    },
  });
}
