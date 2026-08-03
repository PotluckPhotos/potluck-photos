"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateJoinCode } from "@/lib/join-code";

export async function updateDisplayName(formData: FormData) {
  const { user, supabase } = await requireUser();
  const name = String(formData.get("display_name") ?? "").trim();
  if (!name) redirect("/settings?error=empty");

  const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

// Admin-only (enforced by the reset_invite_code RPC itself, not just this
// action — direct RPC calls from a non-admin also get rejected).
export async function resetInviteLink() {
  const { supabase } = await requireUser();
  const newCode = generateJoinCode(10);

  const { error } = await supabase.rpc("reset_invite_code", { new_code: newCode });
  if (error) throw error;

  revalidatePath("/settings");
}
