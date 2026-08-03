import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import BingoCard from "./BingoCard";
import DeleteBoard from "./DeleteBoard";
import { ChevronLeft } from "@/components/icons";

export default async function BingoBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await requireUser();

  // RLS only exposes boards the user owns or holds a card for.
  const { data: board } = await supabase
    .from("bingo_boards")
    .select("id, title, phrases, join_code, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!board) notFound();

  const { data: card } = await supabase
    .from("bingo_cards")
    .select("layout, marks")
    .eq("board_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!card) notFound();

  const squares = (card.layout as number[]).map((i) => board.phrases[i] ?? "");

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 28px 80px" }}>
      <Link href="/bingo" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", marginBottom: 14 }}>
        <ChevronLeft size={14} />
        All boards
      </Link>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 32, fontWeight: 700, margin: 0 }}>{board.title}</h1>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Share code{" "}
          <strong style={{ letterSpacing: 3, color: "var(--accent)" }}>{board.join_code}</strong>
        </span>
      </div>

      <BingoCard boardId={board.id} squares={squares} marks={card.marks as boolean[]} />

      {board.owner_id === user.id && <DeleteBoard boardId={board.id} title={board.title} />}
    </main>
  );
}
