import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role key bypasses row-level security — only ever import this from
// server code (API routes, server components), never from client components.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
