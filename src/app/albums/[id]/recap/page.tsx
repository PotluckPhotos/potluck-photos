import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import RecapPlayer, { type Slide } from "./RecapPlayer";

export default async function RecapPage({ params }: { params: Promise<{ id: string }> }) {
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
    .select("storage_key, caption, focus_x, focus_y")
    .eq("album_id", id)
    .order("created_at", { ascending: true });

  const { data: entryRows } = await supabase
    .from("guestbook_entries")
    .select("body, profiles(display_name)")
    .eq("album_id", id)
    .order("created_at", { ascending: true });

  const photoSlides: Slide[] = (photos ?? []).map((p) => ({
    type: "photo",
    url: storage.getPublicUrl(p.storage_key),
    caption: p.caption ?? "",
    focusX: p.focus_x ?? 50,
    focusY: p.focus_y ?? 50,
  }));

  const entrySlides: Slide[] = (entryRows ?? []).map((g) => {
    const profile = g.profiles as { display_name?: string } | { display_name?: string }[] | null;
    const name = Array.isArray(profile) ? profile[0]?.display_name : profile?.display_name;
    return { type: "entry", body: g.body, author: name ?? "Guest" };
  });

  // Scatter entries evenly between photos.
  const slides: Slide[] = [];
  const gap = entrySlides.length ? Math.max(1, Math.floor(photoSlides.length / (entrySlides.length + 1))) : 0;
  let ei = 0;
  photoSlides.forEach((slide, i) => {
    slides.push(slide);
    if (gap && ei < entrySlides.length && (i + 1) % gap === 0) slides.push(entrySlides[ei++]);
  });
  while (ei < entrySlides.length) slides.push(entrySlides[ei++]);

  return <RecapPlayer albumId={album.id} title={album.name} slides={slides} />;
}
