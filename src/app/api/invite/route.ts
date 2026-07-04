import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inviteEmailHtml } from "@/lib/emails";

// Emails the album's join code. Requires RESEND_API_KEY to be set; without it
// the client falls back to the code + QR, which work with no email configured.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { albumId, email } = await request.json();
  if (!albumId || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: album } = await supabase
    .from("albums")
    .select("name, join_code")
    .eq("id", albumId)
    .maybeSingle();
  if (!album) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email isn't set up yet. Share the code or QR instead." },
      { status: 501 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const from = process.env.INVITE_FROM_EMAIL ?? "Potluck <onboarding@resend.dev>";

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: `You're invited to the "${album.name}" photo album`,
    html: inviteEmailHtml({
      albumName: album.name,
      code: album.join_code,
      inviter: user.email ?? "Someone",
      siteUrl,
      logoUrl: `${siteUrl}/logo.png`,
    }),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true });
}
