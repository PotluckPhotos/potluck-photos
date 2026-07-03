import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { storage } from "@/lib/storage";

// Returns a URL the browser uploads the file directly to (R2 presigned PUT,
// or the local upload route when self-hosting without a cloud provider).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { albumId, contentType, ext } = await request.json();
  if (!albumId || !contentType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Confirm the user is a member of this album before handing out an upload URL.
  const { data: membership } = await supabase
    .from("album_members")
    .select("id")
    .eq("album_id", albumId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const safeExt = String(ext ?? "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const key = `${albumId}/${crypto.randomUUID()}.${safeExt}`;
  const uploadUrl = await storage.putPresignedUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key });
}
