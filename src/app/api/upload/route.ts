import { NextResponse, type NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";

// Receiver for STORAGE_PROVIDER=local — the browser PUTs the file here instead
// of to a cloud bucket. Cloud providers (R2) skip this entirely and PUT direct.
export async function PUT(request: NextRequest) {
  if (process.env.STORAGE_PROVIDER !== "local") {
    return NextResponse.json({ error: "Local uploads disabled" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const key = new URL(request.url).searchParams.get("key");
  if (!key || key.includes("..")) {
    return NextResponse.json({ error: "Bad key" }, { status: 400 });
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  const dest = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buffer);

  return NextResponse.json({ ok: true });
}
