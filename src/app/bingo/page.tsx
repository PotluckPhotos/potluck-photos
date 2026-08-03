import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createBoard, joinBoard } from "./actions";
import { card, input, primaryButton, iconBadge } from "@/lib/ui";
import { Plus, PaperPlane, ChevronLeft } from "@/components/icons";

const ERRORS: Record<string, string> = {
  title: "Give your board a name.",
  count: "You need at least 24 phrases — one per line.",
  short: "Enter the 5-character code.",
  invalid: "That code didn’t match a board.",
};

export default async function BingoHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase } = await requireUser();

  // Cards the user holds, with their board — covers both owned and joined.
  const { data: cards } = await supabase
    .from("bingo_cards")
    .select("board_id, bingo_boards(id, title, join_code)")
    .order("created_at", { ascending: false });

  const boards = (cards ?? [])
    .map((c) => {
      const b = c.bingo_boards as { id: string; title: string; join_code: string } | { id: string; title: string; join_code: string }[] | null;
      return Array.isArray(b) ? b[0] : b;
    })
    .filter((b): b is { id: string; title: string; join_code: string } => !!b);

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 28px 80px" }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", marginBottom: 14 }}>
        <ChevronLeft size={14} />
        Back
      </Link>
      <h1 style={{ fontFamily: "var(--font-head)", fontSize: 36, fontWeight: 700, margin: 0 }}>Bingo</h1>
      <p style={{ color: "var(--text-secondary)", margin: "6px 0 0", fontSize: 14 }}>
        Make a card of things to spot — road trips, weddings, family gatherings. Everyone gets their own shuffled card.
      </p>

      {error && (
        <p style={{ margin: "16px 0 0", fontSize: 13.5, color: "var(--text-danger)" }}>{ERRORS[error] ?? "Something went wrong."}</p>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, margin: "24px 0 44px" }}>
        <form action={createBoard} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={iconBadge}><Plus size={16} /></div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 17 }}>Create a board</h3>
          </div>
          <input name="title" placeholder="Road trip bingo" required style={input} />
          <textarea
            name="phrases"
            rows={8}
            required
            placeholder={"One phrase per line — at least 24.\n\nSomeone falls asleep\nGas station snacks\nWrong turn\nCows in a field"}
            style={{ ...input, marginTop: 10, resize: "vertical", lineHeight: 1.5 }}
          />
          <button type="submit" style={{ ...primaryButton, width: "100%", marginTop: 10 }}>Create board</button>
        </form>

        <form action={joinBoard} style={{ ...card, alignSelf: "start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={iconBadge}><PaperPlane size={16} /></div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 17 }}>Join with a code</h3>
          </div>
          <input name="code" placeholder="ABCDE" required style={{ ...input, textTransform: "uppercase", letterSpacing: 4 }} />
          <button type="submit" style={{ ...primaryButton, width: "100%", marginTop: 10 }}>Join board</button>
        </form>
      </section>

      {boards.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No boards yet. Create one above, or join with a code.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
          {boards.map((b) => (
            <Link key={b.id} href={`/bingo/${b.id}`} style={{ ...card, display: "block", textDecoration: "none", color: "inherit" }}>
              <strong style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 700 }}>{b.title}</strong>
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, padding: "3px 8px", borderRadius: 999, background: "var(--accent-tint)", color: "var(--accent)" }}>
                  {b.join_code}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
