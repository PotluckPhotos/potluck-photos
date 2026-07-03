import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import RecapPlayer from "./RecapPlayer";

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
    .select("storage_key, caption")
    .eq("album_id", id)
    .order("created_at", { ascending: true });

  const slides = (photos ?? []).map((p) => ({
    url: storage.getPublicUrl(p.storage_key),
    caption: p.caption ?? "",
  }));

  return <RecapPlayer albumId={album.id} title={album.name} slides={slides} />;
}
