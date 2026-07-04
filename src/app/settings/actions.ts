"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

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
