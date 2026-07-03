import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Emails a join link. Requires RESEND_API_KEY to be set; without it the client
// falls back to copy-link / QR, which work with no email service configured.
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
      { error: "Email isn't set up yet. Share the link or QR code instead." },
      { status: 501 }
    );
  }

  const origin = new URL(request.url).origin;
  const joinUrl = `${origin}/join?code=${album.join_code}`;
  const from = process.env.INVITE_FROM_EMAIL ?? "Potluck <onboarding@resend.dev>";

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: `You're invited to the "${album.name}" photo album`,
    html: `<p>${user.email} invited you to add photos to <strong>${album.name}</strong> on Potluck.</p>
           <p><a href="${joinUrl}">Join the album</a> (or enter code <strong>${album.join_code}</strong>).</p>`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true });
}
