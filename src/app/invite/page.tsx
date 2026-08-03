import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { redeemInviteCode } from "./actions";
import { card, input, primaryButton } from "@/lib/ui";

// Reached via a shared link like /invite?code=XXXXXXXXXX. Signed-out visitors
// bounce through login first (preserving the code); signed-in users with a
// code in the URL redeem automatically instead of typing it.
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const { user, supabase } = await requireUser();

  const { data: profile } = await supabase.from("profiles").select("approved").eq("id", user.id).maybeSingle();
  if (profile?.approved) redirect("/dashboard");

  if (code) {
    const { data } = await supabase.rpc("redeem_invite", { code: code.toUpperCase() });
    if (data) redirect("/dashboard");
  }

  return (
    <main style={{ maxWidth: 380, margin: "44px auto 0", padding: "0 20px" }}>
      <div style={card}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 22, fontWeight: 700, margin: "0 0 4px", textAlign: "center" }}>
          You&apos;re almost in
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--text-secondary)", textAlign: "center" }}>
          {code ? "That invite link didn't work — try the code directly." : "Enter your invite code to get started."}
        </p>
        <form action={redeemInviteCode} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="hidden" name="redirect" value="/dashboard" />
          <input
            name="code"
            placeholder="INVITE CODE"
            required
            style={{ ...input, textAlign: "center", letterSpacing: 3, textTransform: "uppercase" }}
          />
          <button type="submit" style={primaryButton}>Continue</button>
        </form>
      </div>
    </main>
  );
}
