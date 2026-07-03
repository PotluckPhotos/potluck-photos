"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { storage } from "@/lib/storage";

export async function savePhoto(input: {
  albumId: string;
  key: string;
  caption: string;
  width: number | null;
  height: number | null;
}) {
  const { user, supabase } = await requireUser();

  // RLS also enforces membership + uploaded_by = auth.uid(); this insert fails
  // for non-members even if they craft the request directly.
  const { error } = await supabase.from("photos").insert({
    album_id: input.albumId,
    uploaded_by: user.id,
    storage_key: input.key,
    caption: input.caption || null,
    width: input.width,
    height: input.height,
  });
  if (error) throw error;

  revalidatePath(`/albums/${input.albumId}`);
}

export async function updateCaption(input: { albumId: string; photoId: string; caption: string }) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("photos")
    .update({ caption: input.caption || null })
    .eq("id", input.photoId);
  if (error) throw error;
  revalidatePath(`/albums/${input.albumId}`);
}

export async function deletePhoto(input: { albumId: string; photoId: string; key: string }) {
  const { supabase } = await requireUser();
  // RLS restricts which rows a user may delete (own uploads, or owner).
  const { error } = await supabase.from("photos").delete().eq("id", input.photoId);
  if (error) throw error;
  await storage.delete(input.key).catch(() => {});
  revalidatePath(`/albums/${input.albumId}`);
}
