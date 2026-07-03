import "server-only";
import { createClient } from "@supabase/supabase-js";

// Secret key bypasses row-level security — only ever import this from
// server code, never a client component, and only for operations that
// genuinely need to act outside a specific user's permissions.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);
