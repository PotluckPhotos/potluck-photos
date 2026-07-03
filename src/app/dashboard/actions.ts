"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateJoinCode } from "@/lib/join-code";

export async function createAlbum(formData: FormData) {
  const { user, supabase } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  if (!name) return;

  // Retry on the tiny chance of a join-code collision (unique constraint).
  let albumId: string | null = null;
  for (let attempt = 0; attempt < 5 && !albumId; attempt++) {
    const { data, error } = await supabase
      .from("albums")
      .insert({
        name,
        owner_id: user.id,
        event_date: eventDate || null,
        join_code: generateJoinCode(),
      })
      .select("id")
      .single();

    if (data) albumId = data.id;
    else if (error && error.code !== "23505") throw error; // 23505 = unique violation
  }

  if (!albumId) throw new Error("Could not create album, please try again.");

  revalidatePath("/dashboard");
  redirect(`/albums/${albumId}`);
}

export async function joinByCode(formData: FormData) {
  const { supabase } = await requireUser();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return;

  const { data, error } = await supabase.rpc("join_album_by_code", { code });
  if (error) throw error;

  revalidatePath("/dashboard");
  redirect(`/albums/${data}`);
}
