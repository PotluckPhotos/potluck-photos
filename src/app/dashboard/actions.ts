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

// Accepts a raw 5-char code or a full invite link (e.g. someone pastes the
// "Copy invite link" URL) and returns just the normalized code.
function normalizeCode(raw: string): string {
  let value = raw.trim();
  const fromUrl = value.match(/[?&]code=([^&\s]+)/i);
  if (fromUrl) value = decodeURIComponent(fromUrl[1]);
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

export async function joinByCode(formData: FormData) {
  const { supabase } = await requireUser();
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (code.length < 5) redirect("/dashboard?joinError=short");

  const { data, error } = await supabase.rpc("join_album_by_code", { code });
  // The RPC raises for an unknown code (Postgres P0001); treat any failure as
  // an invalid code rather than letting it crash the page.
  if (error || !data) redirect("/dashboard?joinError=invalid");

  revalidatePath("/dashboard");
  redirect(`/albums/${data}`);
}
