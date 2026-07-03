import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinByCode } from "@/app/dashboard/actions";

// Reached either by typing a code or by scanning a QR / clicking an invite
// link shaped like /join?code=ABCDE. If already signed in and a code is
// present, join immediately; otherwise show the form (and bounce through
// login first, preserving the code).
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (code && !user) {
    redirect(`/login?next=${encodeURIComponent(`/join?code=${code}`)}`);
  }

  if (code && user) {
    const { data, error } = await supabase.rpc("join_album_by_code", { code });
    if (!error && data) redirect(`/albums/${data}`);
  }

  return (
    <main style={{ maxWidth: 360, margin: "5rem auto", padding: "0 1.5rem", textAlign: "center" }}>
      <h1>Join an album</h1>
      {code && (
        <p style={{ color: "var(--text-danger, #c00)" }}>
          That code didn&apos;t match an album. Check it and try again.
        </p>
      )}
      <form action={joinByCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          name="code"
          placeholder="ABCDE"
          required
          defaultValue={code ?? ""}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #ccc)",
            textTransform: "uppercase",
            letterSpacing: 6,
            textAlign: "center",
            fontSize: 20,
          }}
        />
        <button type="submit">Join album</button>
      </form>
    </main>
  );
}
