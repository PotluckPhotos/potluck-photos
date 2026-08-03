"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

function normalizeCode(raw: string): string {
  let value = raw.trim();
  const fromUrl = value.match(/[?&]code=([^&\s]+)/i);
  if (fromUrl) value = decodeURIComponent(fromUrl[1]);
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function redeemInviteCode(formData: FormData) {
  const { supabase } = await requireUser();
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  if (!code) redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}inviteError=1`);

  const { data, error } = await supabase.rpc("redeem_invite", { code });
  if (error || !data) redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}inviteError=1`);

  revalidatePath("/", "layout");
  redirect(redirectTo);
}
