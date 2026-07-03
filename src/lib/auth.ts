import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// For server components / route handlers that require a signed-in user.
// Redirects to /login when there's no session.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { user, supabase };
}
