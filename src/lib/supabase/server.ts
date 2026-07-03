import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Session-aware client for Server Components and Route Handlers — reads the
// signed-in user's cookies, so queries go through RLS as that user.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies — the
            // middleware below handles refreshing the session instead.
          }
        },
      },
    }
  );
}
