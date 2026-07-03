"use server";

import { redirect } from "next/navigation";
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

export async function deleteAlbum(input: { albumId: string; confirmName: string }) {
  const { user, supabase } = await requireUser();

  const { data: album } = await supabase
    .from("albums")
    .select("name, owner_id")
    .eq("id", input.albumId)
    .maybeSingle();
  if (!album || album.owner_id !== user.id) throw new Error("Only the owner can delete this album.");
  if (input.confirmName.trim() !== album.name) throw new Error("The typed name doesn't match.");

  // Remove the stored image objects first (the DB cascade only deletes rows,
  // not the files in R2). Failures are ignored so one missing object doesn't
  // block the delete.
  const { data: photos } = await supabase
    .from("photos")
    .select("storage_key")
    .eq("album_id", input.albumId);
  await Promise.all((photos ?? []).map((p) => storage.delete(p.storage_key).catch(() => {})));

  // .select() so we can confirm a row was actually removed — if RLS blocks the
  // delete (e.g. the owner DELETE policy from migration 0005 isn't applied), it
  // affects zero rows without erroring, which would otherwise look like success.
  const { data: deleted, error } = await supabase
    .from("albums")
    .delete()
    .eq("id", input.albumId)
    .select("id");
  if (error) throw error;
  if (!deleted || deleted.length === 0) {
    throw new Error("The album couldn't be deleted. Make sure the owner delete policy (migration 0005) has been applied.");
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

export async function addGuestbookEntry(input: { albumId: string; body: string }) {
  const { user, supabase } = await requireUser();
  const body = input.body.trim();
  if (!body) return;
  const { error } = await supabase.from("guestbook_entries").insert({
    album_id: input.albumId,
    author_id: user.id,
    body,
  });
  if (error) throw error;
  revalidatePath(`/albums/${input.albumId}`);
}

export async function deleteGuestbookEntry(input: { albumId: string; entryId: string }) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("guestbook_entries").delete().eq("id", input.entryId);
  if (error) throw error;
  revalidatePath(`/albums/${input.albumId}`);
}
