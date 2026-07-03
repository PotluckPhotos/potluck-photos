"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateJoinCode } from "@/lib/join-code";

export async function createAlbum(formData: FormData) {
  const { user, supabase } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  // Generate the id ourselves so we don't need INSERT ... RETURNING, which
  // would require the SELECT policy to already see the row at creation time.
  const albumId = crypto.randomUUID();

  // Retry on the tiny chance of a join-code collision (unique constraint).
  let created = false;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const { error } = await supabase.from("albums").insert({
      id: albumId,
      name,
      owner_id: user.id,
      join_code: generateJoinCode(),
    });

    if (!error) created = true;
    else if (error.code !== "23505") throw error; // 23505 = unique violation
  }

  if (!created) throw new Error("Could not create album, please try again.");

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
